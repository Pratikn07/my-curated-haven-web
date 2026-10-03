-- Admin recipe editor (step 1).
--
-- The owners add, edit, publish and withdraw recipes at /admin instead of
-- through SQL migrations. Client roles still cannot write any recipe table:
-- every change goes through the admin_* functions below, which run as the
-- table owner only after checking that the signed-in caller is on
-- private.admin_users. The only direct client write is a recipe photo upload
-- into the admin/ folder of the public recipe-previews bucket.
--
-- Granting access (run once per person, from the SQL editor):
--   INSERT INTO private.admin_users (user_id, note)
--   SELECT id, 'owner' FROM auth.users WHERE email = '<their sign-in email>';

-- ============================================================================
-- 1. Who may use the admin area
-- ============================================================================
CREATE TABLE IF NOT EXISTS private.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  note text,
  added_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.admin_users FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE private.admin_users TO service_role;

-- True only for a signed-in caller on the admin list. It says nothing about
-- anyone else, so signed-in users may call it; the storage policy needs it.
CREATE OR REPLACE FUNCTION public.is_recipe_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM private.admin_users a WHERE a.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.is_recipe_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_recipe_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.require_recipe_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_recipe_admin() THEN
    RAISE EXCEPTION 'recipe admin access required' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Optimistic lock token: the editor sends back the version it loaded, so two
-- people editing the same recipe cannot silently overwrite each other.
CREATE OR REPLACE FUNCTION private.recipe_version(ts timestamptz)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT (extract(epoch FROM ts) * 1000000)::bigint::text;
$$;

REVOKE ALL ON FUNCTION private.require_recipe_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.recipe_version(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.require_recipe_admin() TO service_role;
GRANT EXECUTE ON FUNCTION private.recipe_version(timestamptz) TO service_role;

-- ============================================================================
-- 2. Reading recipes in any state
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_list_recipes(p_state text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  publication_state text,
  preview_image_path text,
  updated_at timestamptz,
  free_slot smallint,
  collections text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
BEGIN
  PERFORM private.require_recipe_admin();

  RETURN QUERY
  SELECT
    c.id,
    c.slug,
    c.title,
    c.publication_state,
    c.preview_image_path,
    c.updated_at,
    f.slot,
    COALESCE(
      array_agg(DISTINCT col.title ORDER BY col.title) FILTER (WHERE col.title IS NOT NULL),
      '{}'::text[]
    )
  FROM public.recipe_catalog c
  LEFT JOIN public.free_recipe_slots f ON f.recipe_id = c.id
  LEFT JOIN public.collection_recipes cr ON cr.recipe_id = c.id
  LEFT JOIN public.collection_releases rel
    ON rel.id = cr.release_id AND rel.state <> 'retired'
  LEFT JOIN public.recipe_collections col ON col.id = rel.collection_id
  WHERE p_state IS NULL OR c.publication_state = p_state
  GROUP BY c.id, f.slot
  ORDER BY c.updated_at DESC
  LIMIT 500;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_recipe(p_recipe_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
BEGIN
  PERFORM private.require_recipe_admin();

  SELECT jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'title', c.title,
    'summary', c.public_summary,
    'imageUrl', c.preview_image_path,
    'totalMinutes', c.total_minutes,
    'mealLabels', to_jsonb(c.meal_labels),
    'dietLabels', to_jsonb(c.diet_labels),
    'publicationState', c.publication_state,
    'publishedAt', c.published_at,
    'version', private.recipe_version(c.updated_at),
    'contentVersion', b.content_version,
    'yield', b.yield,
    'ingredients', COALESCE(b.ingredients, '[]'::jsonb),
    'instructions', COALESCE(b.instructions, '[]'::jsonb),
    'tips', b.reviewed_notes,
    'storageNotes', b.storage_notes,
    'allergenReviewState', COALESCE(b.allergen_review_state, 'unknown'),
    'allergens', to_jsonb(COALESCE(b.allergens, '{}'::text[])),
    'freeSlot', (SELECT f.slot FROM public.free_recipe_slots f WHERE f.recipe_id = c.id),
    'collections', to_jsonb(ARRAY(
      SELECT DISTINCT col.title
      FROM public.collection_recipes cr
      JOIN public.collection_releases rel ON rel.id = cr.release_id AND rel.state <> 'retired'
      JOIN public.recipe_collections col ON col.id = rel.collection_id
      WHERE cr.recipe_id = c.id
      ORDER BY col.title
    ))
  )
  INTO result
  FROM public.recipe_catalog c
  LEFT JOIN public.recipe_bodies b ON b.recipe_id = c.id
  WHERE c.id = p_recipe_id;

  RETURN result;
END;
$$;

-- ============================================================================
-- 3. Saving a recipe (new drafts and edits)
-- ============================================================================
-- Error codes the editor turns into plain messages:
--   42501 not an admin, 22023 invalid input, 23505 web address taken,
--   MCNF0 not found, MCSTL changed by someone else since it was opened,
--   MCSLG web address of a recipe that has been live cannot change,
--   MCALG a live recipe must keep its allergen check.
-- A NULL p_recipe_id creates a new draft.
CREATE OR REPLACE FUNCTION public.admin_save_recipe(
  p_recipe jsonb,
  p_recipe_id uuid DEFAULT NULL,
  p_expected_version text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid := p_recipe_id;
  v_current public.recipe_catalog%ROWTYPE;
  v_title text := btrim(COALESCE(p_recipe->>'title', ''));
  v_slug text := COALESCE(p_recipe->>'slug', '');
  v_review text := COALESCE(p_recipe->>'allergenReviewState', 'unknown');
  v_ingredients jsonb := COALESCE(p_recipe->'ingredients', '[]'::jsonb);
  v_steps jsonb := COALESCE(p_recipe->'steps', '[]'::jsonb);
  v_meals text[];
  v_diets text[];
  v_allergens text[];
  v_updated timestamptz;
BEGIN
  PERFORM private.require_recipe_admin();

  IF char_length(v_title) < 3 OR char_length(v_title) > 120 THEN
    RAISE EXCEPTION 'recipe title must be 3 to 120 characters' USING ERRCODE = '22023';
  END IF;
  IF v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR char_length(v_slug) > 80 THEN
    RAISE EXCEPTION 'recipe web address is not valid' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(v_ingredients) <> 'array' OR jsonb_typeof(v_steps) <> 'array'
     OR jsonb_typeof(COALESCE(p_recipe->'mealLabels', '[]'::jsonb)) <> 'array'
     OR jsonb_typeof(COALESCE(p_recipe->'dietLabels', '[]'::jsonb)) <> 'array'
     OR jsonb_typeof(COALESCE(p_recipe->'allergens', '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'recipe lists must be arrays' USING ERRCODE = '22023';
  END IF;
  IF v_review NOT IN ('unknown', 'reviewed_listed', 'reviewed_no_allergens') THEN
    RAISE EXCEPTION 'allergen review state is not valid' USING ERRCODE = '22023';
  END IF;

  v_meals := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_recipe->'mealLabels', '[]'::jsonb)));
  v_diets := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_recipe->'dietLabels', '[]'::jsonb)));
  v_allergens := CASE
    WHEN v_review = 'reviewed_listed'
      THEN ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_recipe->'allergens', '[]'::jsonb)))
    ELSE '{}'::text[]
  END;
  IF v_review = 'reviewed_listed' AND cardinality(v_allergens) = 0 THEN
    RAISE EXCEPTION 'listed allergens are missing' USING ERRCODE = '22023';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.recipe_catalog (
      slug, title, public_summary, preview_image_path, total_minutes,
      meal_labels, diet_labels, publication_state
    ) VALUES (
      v_slug,
      v_title,
      COALESCE(p_recipe->>'summary', ''),
      COALESCE(p_recipe->>'imageUrl', ''),
      (p_recipe->>'totalMinutes')::integer,
      v_meals,
      v_diets,
      'draft'
    )
    RETURNING id INTO v_id;
  ELSE
    SELECT * INTO v_current FROM public.recipe_catalog WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'recipe not found' USING ERRCODE = 'MCNF0';
    END IF;
    IF p_expected_version IS DISTINCT FROM private.recipe_version(v_current.updated_at) THEN
      RAISE EXCEPTION 'recipe changed since it was opened' USING ERRCODE = 'MCSTL';
    END IF;
    IF v_current.published_at IS NOT NULL AND v_slug <> v_current.slug THEN
      RAISE EXCEPTION 'a recipe that has been live keeps its web address' USING ERRCODE = 'MCSLG';
    END IF;
    IF v_current.publication_state = 'published' AND v_review = 'unknown' THEN
      RAISE EXCEPTION 'a live recipe must keep its allergen check' USING ERRCODE = 'MCALG';
    END IF;

    UPDATE public.recipe_catalog SET
      slug = v_slug,
      title = v_title,
      public_summary = COALESCE(p_recipe->>'summary', ''),
      preview_image_path = COALESCE(p_recipe->>'imageUrl', ''),
      total_minutes = (p_recipe->>'totalMinutes')::integer,
      meal_labels = v_meals,
      diet_labels = v_diets,
      updated_at = now()
    WHERE id = v_id;
  END IF;

  -- A change to what parents read bumps content_version, so an earlier
  -- review of the old wording no longer counts for the new one.
  INSERT INTO public.recipe_bodies AS b (
    recipe_id, content_version, ingredients, instructions, yield,
    reviewed_notes, allergen_review_state, allergens, storage_notes, updated_at
  ) VALUES (
    v_id,
    1,
    v_ingredients,
    v_steps,
    COALESCE(p_recipe->>'yield', ''),
    NULLIF(p_recipe->>'tips', ''),
    v_review,
    v_allergens,
    NULLIF(p_recipe->>'storageNotes', ''),
    now()
  )
  ON CONFLICT (recipe_id) DO UPDATE SET
    content_version = CASE
      WHEN (b.ingredients, b.instructions, b.yield, b.reviewed_notes,
            b.allergen_review_state, b.allergens, b.storage_notes)
           IS DISTINCT FROM
           (EXCLUDED.ingredients, EXCLUDED.instructions, EXCLUDED.yield, EXCLUDED.reviewed_notes,
            EXCLUDED.allergen_review_state, EXCLUDED.allergens, EXCLUDED.storage_notes)
        THEN b.content_version + 1
      ELSE b.content_version
    END,
    ingredients = EXCLUDED.ingredients,
    instructions = EXCLUDED.instructions,
    yield = EXCLUDED.yield,
    reviewed_notes = EXCLUDED.reviewed_notes,
    allergen_review_state = EXCLUDED.allergen_review_state,
    allergens = EXCLUDED.allergens,
    storage_notes = EXCLUDED.storage_notes,
    updated_at = now();

  SELECT c.updated_at INTO v_updated FROM public.recipe_catalog c WHERE c.id = v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'slug', v_slug,
    'version', private.recipe_version(v_updated)
  );
END;
$$;

-- ============================================================================
-- 4. Publishing and withdrawing
-- ============================================================================
-- Publishing from the admin area needs the human allergen check, not only an
-- automated review, and records who published which content version.
-- Extra error code: 23514 the allergens have not been checked.
CREATE OR REPLACE FUNCTION public.admin_publish_recipe(
  p_recipe_id uuid,
  p_expected_version text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current public.recipe_catalog%ROWTYPE;
  v_body public.recipe_bodies%ROWTYPE;
  v_updated timestamptz;
BEGIN
  PERFORM private.require_recipe_admin();

  SELECT * INTO v_current FROM public.recipe_catalog WHERE id = p_recipe_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'recipe not found' USING ERRCODE = 'MCNF0';
  END IF;
  IF p_expected_version IS DISTINCT FROM private.recipe_version(v_current.updated_at) THEN
    RAISE EXCEPTION 'recipe changed since it was opened' USING ERRCODE = 'MCSTL';
  END IF;

  SELECT * INTO v_body FROM public.recipe_bodies WHERE recipe_id = p_recipe_id;
  IF NOT FOUND OR v_body.allergen_review_state = 'unknown' THEN
    RAISE EXCEPTION 'recipe % has not been editorially reviewed', p_recipe_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_current.publication_state = 'published' THEN
    RETURN jsonb_build_object('version', private.recipe_version(v_current.updated_at));
  END IF;

  UPDATE public.recipe_catalog SET
    publication_state = 'published',
    published_at = COALESCE(published_at, now()),
    updated_at = now()
  WHERE id = p_recipe_id
  RETURNING updated_at INTO v_updated;

  INSERT INTO private.recipe_reviews (
    recipe_id, content_version, reviewer_kind, reviewer, verdict, open_blockers, notes
  ) VALUES (
    p_recipe_id,
    v_body.content_version,
    'human',
    COALESCE((SELECT u.email FROM auth.users u WHERE u.id = auth.uid()), auth.uid()::text),
    'approve',
    0,
    'Published from the admin area'
  );

  RETURN jsonb_build_object('version', private.recipe_version(v_updated));
END;
$$;

-- Withdrawing never takes a recipe away from someone relying on it.
-- Extra error codes: MCFRE one of the free recipes, MCCOL in a paid collection.
CREATE OR REPLACE FUNCTION public.admin_withdraw_recipe(
  p_recipe_id uuid,
  p_expected_version text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current public.recipe_catalog%ROWTYPE;
  v_updated timestamptz;
BEGIN
  PERFORM private.require_recipe_admin();

  SELECT * INTO v_current FROM public.recipe_catalog WHERE id = p_recipe_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'recipe not found' USING ERRCODE = 'MCNF0';
  END IF;
  IF p_expected_version IS DISTINCT FROM private.recipe_version(v_current.updated_at) THEN
    RAISE EXCEPTION 'recipe changed since it was opened' USING ERRCODE = 'MCSTL';
  END IF;
  IF v_current.publication_state <> 'published' THEN
    RETURN jsonb_build_object('version', private.recipe_version(v_current.updated_at));
  END IF;

  IF EXISTS (SELECT 1 FROM public.free_recipe_slots f WHERE f.recipe_id = p_recipe_id) THEN
    RAISE EXCEPTION 'recipe is one of the free recipes' USING ERRCODE = 'MCFRE';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.collection_recipes cr
    JOIN public.collection_releases rel ON rel.id = cr.release_id
    WHERE cr.recipe_id = p_recipe_id
      AND rel.state IN ('published', 'sealed')
  ) THEN
    RAISE EXCEPTION 'recipe is in a paid collection' USING ERRCODE = 'MCCOL';
  END IF;

  UPDATE public.recipe_catalog SET
    publication_state = 'withdrawn',
    updated_at = now()
  WHERE id = p_recipe_id
  RETURNING updated_at INTO v_updated;

  RETURN jsonb_build_object('version', private.recipe_version(v_updated));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_recipes(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_recipe(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_save_recipe(jsonb, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_publish_recipe(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_withdraw_recipe(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_recipes(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_recipe(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_recipe(jsonb, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_publish_recipe(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_withdraw_recipe(uuid, text) TO authenticated, service_role;

-- ============================================================================
-- 5. Recipe photo uploads
-- ============================================================================
-- The editor resizes photos in the browser before upload, so a published photo
-- is a few hundred kilobytes. The limit stops a full-size original slipping in.
UPDATE storage.buckets
SET file_size_limit = 3145728,
    allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png']
WHERE id = 'recipe-previews';

DROP POLICY IF EXISTS "Admins upload recipe photos" ON storage.objects;
CREATE POLICY "Admins upload recipe photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recipe-previews'
    AND (storage.foldername(name))[1] = 'admin'
    AND public.is_recipe_admin()
  );
