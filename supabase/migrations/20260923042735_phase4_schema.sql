-- Phase 4: Backend security and data foundation schema
-- Contract reference: docs/implementation/phase-4/DATA-CONTRACTS.md and SECURITY-AND-ACCESS.md

-- ============================================================================
-- 1. Private schema & audit
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT ALL ON SCHEMA private TO postgres, service_role;

CREATE TABLE IF NOT EXISTS private.recipe_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL,
  proposed_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewer_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private.access_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL,
  actor_id UUID,
  entitlement_id UUID,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. Public Catalog, Bodies, and Free Recipe Slots
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recipe_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  public_summary TEXT NOT NULL,
  preview_image_path TEXT NOT NULL,
  total_minutes INTEGER CHECK (total_minutes IS NULL OR total_minutes > 0),
  meal_labels TEXT[] NOT NULL DEFAULT '{}',
  diet_labels TEXT[] NOT NULL DEFAULT '{}',
  publication_state TEXT NOT NULL CHECK (publication_state IN ('draft', 'published', 'withdrawn')) DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recipe_bodies (
  recipe_id UUID PRIMARY KEY REFERENCES public.recipe_catalog(id) ON DELETE CASCADE,
  content_version INTEGER NOT NULL DEFAULT 1,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  yield TEXT NOT NULL,
  yield_structured JSONB,
  reviewed_notes TEXT,
  allergen_review_state TEXT NOT NULL CHECK (allergen_review_state IN ('unknown', 'reviewed_listed', 'reviewed_no_allergens')) DEFAULT 'unknown',
  allergens TEXT[],
  storage_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.free_recipe_slots (
  slot SMALLINT PRIMARY KEY CHECK (slot IN (1, 2, 3)),
  recipe_id UUID NOT NULL UNIQUE REFERENCES public.recipe_catalog(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. Collections, Releases, and Membership
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recipe_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  public_summary TEXT NOT NULL,
  listing_state TEXT NOT NULL CHECK (listing_state IN ('listed', 'unlisted', 'retired')) DEFAULT 'unlisted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.collection_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.recipe_collections(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  state TEXT NOT NULL CHECK (state IN ('draft', 'published', 'sealed', 'retired')) DEFAULT 'draft',
  sealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT collection_releases_version_uniq UNIQUE (collection_id, version)
);

CREATE TABLE IF NOT EXISTS public.collection_recipes (
  release_id UUID NOT NULL REFERENCES public.collection_releases(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipe_catalog(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  PRIMARY KEY (release_id, recipe_id),
  CONSTRAINT collection_recipes_pos_uniq UNIQUE (release_id, position)
);

-- ============================================================================
-- 4. Access Entitlements
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.access_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id UUID NOT NULL REFERENCES public.collection_releases(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('active', 'revoked', 'expired')) DEFAULT 'active',
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT access_entitlements_user_release_uniq UNIQUE (user_id, release_id),
  CONSTRAINT access_entitlements_valid_time_range CHECK (expires_at IS NULL OR expires_at > valid_from)
);

-- ============================================================================
-- 5. Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_recipe_catalog_publication_state ON public.recipe_catalog(publication_state);
CREATE INDEX IF NOT EXISTS idx_recipe_catalog_slug ON public.recipe_catalog(slug);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_recipe_id ON public.collection_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_release_id ON public.collection_recipes(release_id);
CREATE INDEX IF NOT EXISTS idx_collection_releases_collection_id ON public.collection_releases(collection_id);
CREATE INDEX IF NOT EXISTS idx_access_entitlements_user_id ON public.access_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_access_entitlements_release_id ON public.access_entitlements(release_id);
CREATE INDEX IF NOT EXISTS idx_free_recipe_slots_recipe_id ON public.free_recipe_slots(recipe_id);

-- ============================================================================
-- 6. Trigger: Sealed Release Immutability
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_release_sealed_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.collection_releases
    WHERE id = COALESCE(OLD.release_id, NEW.release_id)
      AND state IN ('sealed', 'retired')
  ) THEN
    RAISE EXCEPTION 'Cannot modify recipes in a sealed or retired release';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_release_sealed ON public.collection_recipes;
CREATE TRIGGER trg_check_release_sealed
  BEFORE INSERT OR UPDATE OR DELETE ON public.collection_recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_release_sealed_mutation();

-- ============================================================================
-- 7. Row Level Security & Explicit Grants
-- ============================================================================
ALTER TABLE public.recipe_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_recipe_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_entitlements ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.recipe_catalog TO anon, authenticated;
GRANT SELECT ON public.recipe_bodies TO anon, authenticated;
GRANT SELECT ON public.free_recipe_slots TO anon, authenticated;
GRANT SELECT ON public.recipe_collections TO anon, authenticated;
GRANT SELECT ON public.collection_releases TO anon, authenticated;
GRANT SELECT ON public.collection_recipes TO anon, authenticated;
GRANT SELECT ON public.access_entitlements TO anon, authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Policies:
-- 7.1 Catalog: Only published recipes visible to visitors & signed-in users
CREATE POLICY "Public read approved catalog"
  ON public.recipe_catalog
  FOR SELECT
  TO anon, authenticated
  USING (publication_state = 'published');

-- 7.2 Free recipe slots: only published recipes in slots visible
CREATE POLICY "Public read free recipe slots"
  ON public.free_recipe_slots
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipe_catalog rc
      WHERE rc.id = free_recipe_slots.recipe_id
        AND rc.publication_state = 'published'
    )
  );

-- 7.3 Recipe collections: listed or owned via active entitlement
CREATE POLICY "Read listed collections or owned collections"
  ON public.recipe_collections
  FOR SELECT
  TO anon, authenticated
  USING (
    listing_state = 'listed'
    OR (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.access_entitlements ae
        JOIN public.collection_releases cr ON cr.id = ae.release_id
        WHERE cr.collection_id = recipe_collections.id
          AND ae.user_id = auth.uid()
          AND ae.state = 'active'
          AND ae.valid_from <= now()
          AND (ae.expires_at IS NULL OR ae.expires_at > now())
          AND ae.revoked_at IS NULL
      )
    )
  );

-- 7.4 Collection releases: published, or sealed/retired if buyer holds active grant
CREATE POLICY "Read published or granted releases"
  ON public.collection_releases
  FOR SELECT
  TO anon, authenticated
  USING (
    state = 'published'
    OR (
      auth.uid() IS NOT NULL
      AND state IN ('sealed', 'retired')
      AND EXISTS (
        SELECT 1 FROM public.access_entitlements ae
        WHERE ae.release_id = collection_releases.id
          AND ae.user_id = auth.uid()
          AND ae.state = 'active'
          AND ae.valid_from <= now()
          AND (ae.expires_at IS NULL OR ae.expires_at > now())
          AND ae.revoked_at IS NULL
      )
    )
  );

-- 7.5 Collection recipes: accessible if release is accessible
CREATE POLICY "Read recipes in accessible releases"
  ON public.collection_recipes
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collection_releases cr
      WHERE cr.id = collection_recipes.release_id
        AND (
          cr.state = 'published'
          OR (
            auth.uid() IS NOT NULL
            AND cr.state IN ('sealed', 'retired')
            AND EXISTS (
              SELECT 1 FROM public.access_entitlements ae
              WHERE ae.release_id = cr.id
                AND ae.user_id = auth.uid()
                AND ae.state = 'active'
                AND ae.valid_from <= now()
                AND (ae.expires_at IS NULL OR ae.expires_at > now())
                AND ae.revoked_at IS NULL
            )
          )
        )
    )
  );

-- 7.6 Recipe bodies: accessible only if published AND (in free slot OR entitled)
CREATE POLICY "Read authorized recipe bodies"
  ON public.recipe_bodies
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipe_catalog rc
      WHERE rc.id = recipe_bodies.recipe_id
        AND rc.publication_state = 'published'
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.free_recipe_slots frs
        WHERE frs.recipe_id = recipe_bodies.recipe_id
      )
      OR (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.collection_recipes cr
          JOIN public.access_entitlements ae ON ae.release_id = cr.release_id
          WHERE cr.recipe_id = recipe_bodies.recipe_id
            AND ae.user_id = auth.uid()
            AND ae.state = 'active'
            AND ae.valid_from <= now()
            AND (ae.expires_at IS NULL OR ae.expires_at > now())
            AND ae.revoked_at IS NULL
        )
      )
    )
  );

-- 7.7 Entitlements: authenticated users can only view their own rows
CREATE POLICY "Read own entitlements"
  ON public.access_entitlements
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND auth.uid() = user_id
  );

-- ============================================================================
-- 8. Storage Buckets and Object Policies
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-previews', 'recipe-previews', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-protected', 'recipe-protected', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY "Public read preview images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'recipe-previews');

CREATE POLICY "Authorized read protected recipe files"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'recipe-protected'
    AND (
      EXISTS (
        SELECT 1 FROM public.free_recipe_slots frs
        JOIN public.recipe_catalog rc ON rc.id = frs.recipe_id
        WHERE rc.publication_state = 'published'
          AND storage.objects.name LIKE (frs.recipe_id::text || '/%')
      )
      OR (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.collection_recipes cr
          JOIN public.access_entitlements ae ON ae.release_id = cr.release_id
          JOIN public.recipe_catalog rc ON rc.id = cr.recipe_id
          WHERE rc.publication_state = 'published'
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
