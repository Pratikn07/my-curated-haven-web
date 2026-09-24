-- Phase 4 access hardening.
-- Close the legacy recipe and search tables, make sealed membership
-- immutable in both directions, and publish free slots in one transaction.

-- ============================================================================
-- 1. Legacy public.recipes is an import source, not a public content API
-- ============================================================================
DROP POLICY IF EXISTS "Recipes are viewable by everyone" ON public.recipes;
DROP POLICY IF EXISTS "Allow anyone to insert recipes" ON public.recipes;
DROP POLICY IF EXISTS "Authenticated users can insert recipes" ON public.recipes;

REVOKE ALL ON TABLE public.recipes FROM PUBLIC, anon, authenticated;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Raw search queries are not a public read model
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view searches for trending" ON public.search_analytics;
DROP POLICY IF EXISTS "Users can insert their own searches" ON public.search_analytics;
DROP POLICY IF EXISTS "Users can delete their own searches" ON public.search_analytics;

REVOKE ALL ON TABLE public.search_analytics FROM PUBLIC, anon, authenticated;
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Signup trigger: pin search_path on the definer function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NOW()
  );
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. Sealed/retired membership cannot be entered or left by an ordinary update
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_release_sealed_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  old_release UUID;
  new_release UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    old_release := NULL;
    new_release := NEW.release_id;
  ELSIF TG_OP = 'DELETE' THEN
    old_release := OLD.release_id;
    new_release := NULL;
  ELSE
    old_release := OLD.release_id;
    new_release := NEW.release_id;
  END IF;

  IF old_release IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.collection_releases
    WHERE id = old_release
      AND state IN ('sealed', 'retired')
  ) THEN
    RAISE EXCEPTION 'Cannot modify recipes in a sealed or retired release';
  END IF;

  IF new_release IS NOT NULL
     AND new_release IS DISTINCT FROM old_release
     AND EXISTS (
       SELECT 1
       FROM public.collection_releases
       WHERE id = new_release
         AND state IN ('sealed', 'retired')
     ) THEN
    RAISE EXCEPTION 'Cannot modify recipes in a sealed or retired release';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.check_release_sealed_mutation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_release_sealed_mutation() TO service_role;

-- ============================================================================
-- 5. Body and storage reads re-check release state
-- ============================================================================
DROP POLICY IF EXISTS "Read authorized recipe bodies" ON public.recipe_bodies;
CREATE POLICY "Read authorized recipe bodies"
  ON public.recipe_bodies
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.recipe_catalog rc
      WHERE rc.id = recipe_bodies.recipe_id
        AND rc.publication_state = 'published'
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.free_recipe_slots frs
        WHERE frs.recipe_id = recipe_bodies.recipe_id
      )
      OR (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.collection_recipes cr
          JOIN public.access_entitlements ae ON ae.release_id = cr.release_id
          JOIN public.collection_releases rel ON rel.id = cr.release_id
          WHERE cr.recipe_id = recipe_bodies.recipe_id
            AND rel.state IN ('published', 'sealed', 'retired')
            AND ae.user_id = auth.uid()
            AND ae.state = 'active'
            AND ae.valid_from <= now()
            AND (ae.expires_at IS NULL OR ae.expires_at > now())
            AND ae.revoked_at IS NULL
        )
      )
    )
  );

DROP POLICY IF EXISTS "Authorized read protected recipe files" ON storage.objects;
CREATE POLICY "Authorized read protected recipe files"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'recipe-protected'
    AND (
      EXISTS (
        SELECT 1
        FROM public.free_recipe_slots frs
        JOIN public.recipe_catalog rc ON rc.id = frs.recipe_id
        WHERE rc.publication_state = 'published'
          AND storage.objects.name LIKE (frs.recipe_id::text || '/%')
      )
      OR (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.collection_recipes cr
          JOIN public.access_entitlements ae ON ae.release_id = cr.release_id
          JOIN public.collection_releases rel ON rel.id = cr.release_id
          JOIN public.recipe_catalog rc ON rc.id = cr.recipe_id
          WHERE rc.publication_state = 'published'
            AND rel.state IN ('published', 'sealed', 'retired')
            AND storage.objects.name LIKE (cr.recipe_id::text || '/%')
            AND ae.user_id = auth.uid()
            AND ae.state = 'active'
            AND ae.valid_from <= now()
            AND (ae.expires_at IS NULL OR ae.expires_at > now())
            AND ae.revoked_at IS NULL
        )
      )
    )
  );

-- ============================================================================
-- 6. One transactional writer for the three free slots
-- ============================================================================
CREATE OR REPLACE FUNCTION private.publish_free_recipe_slots(p_recipe_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_recipe_ids IS NULL OR cardinality(p_recipe_ids) <> 3 THEN
    RAISE EXCEPTION 'free selection must contain exactly 3 recipes';
  END IF;

  IF (
    SELECT count(DISTINCT recipe_id)
    FROM unnest(p_recipe_ids) AS recipe_id
  ) <> 3 THEN
    RAISE EXCEPTION 'free selection recipes must be distinct';
  END IF;

  LOCK TABLE public.free_recipe_slots IN EXCLUSIVE MODE;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_recipe_ids) AS rid(recipe_id)
    LEFT JOIN public.recipe_catalog rc ON rc.id = rid.recipe_id
    WHERE rc.id IS NULL
       OR rc.publication_state <> 'published'
  ) THEN
    RAISE EXCEPTION 'every free slot recipe must be published';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_recipe_ids) AS rid(recipe_id)
    LEFT JOIN public.recipe_bodies rb ON rb.recipe_id = rid.recipe_id
    WHERE rb.recipe_id IS NULL
  ) THEN
    RAISE EXCEPTION 'every free slot recipe must have a body';
  END IF;

  DELETE FROM public.free_recipe_slots;

  INSERT INTO public.free_recipe_slots (slot, recipe_id)
  SELECT ordinality::smallint, recipe_id
  FROM unnest(p_recipe_ids) WITH ORDINALITY AS slot_row(recipe_id, ordinality);
END;
$$;

REVOKE ALL ON FUNCTION private.publish_free_recipe_slots(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.publish_free_recipe_slots(UUID[]) TO service_role;
