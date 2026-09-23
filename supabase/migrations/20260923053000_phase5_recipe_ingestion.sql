-- ============================================================================
-- Migration: Phase 5 Recipe Structure and Catalog Ingestion
-- Created: 2026-09-23
-- Purpose: Ingest legacy parenting recipes into Phase 4 recipe_catalog and
--          recipe_bodies, assign the 3 approved toddler recipes to free slots,
--          and maintain idempotency across local and production environments.
-- ============================================================================

-- Helper function to generate url-friendly slug
CREATE OR REPLACE FUNCTION private.slugify(value text)
RETURNS text AS $$
BEGIN
  RETURN trim(both '-' from lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(value, '[&]', 'and', 'g'),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1. Populate recipe_catalog from existing public.recipes
INSERT INTO public.recipe_catalog (
  id,
  slug,
  title,
  public_summary,
  preview_image_path,
  total_minutes,
  meal_labels,
  diet_labels,
  publication_state,
  published_at,
  created_at,
  updated_at
)
SELECT
  r.id,
  private.slugify(r.title) AS slug,
  r.title,
  COALESCE(r.description, r.title) AS public_summary,
  COALESCE(r.image_url, '') AS preview_image_path,
  r.time_minutes AS total_minutes,
  COALESCE(r.meal_types, '{}'::text[]) AS meal_labels,
  COALESCE(r.dietary_tags, '{}'::text[]) AS diet_labels,
  CASE
    WHEN r.id IN (
      '0003c4cc-b2cb-4e49-97c8-f4febfed39f9', -- Sweet Potato & Spinach Frittata Fingers
      '50663aaa-7e47-4b08-9fd8-a58b390db96d', -- Soft-Baked Blueberry & Oat Bars
      'a61d93da-4d19-4219-a131-bca2468ace88'  -- Salmon & Pea Fish Cakes
    ) THEN 'published'
    ELSE 'draft'
  END AS publication_state,
  CASE
    WHEN r.id IN (
      '0003c4cc-b2cb-4e49-97c8-f4febfed39f9',
      '50663aaa-7e47-4b08-9fd8-a58b390db96d',
      'a61d93da-4d19-4219-a131-bca2468ace88'
    ) THEN now()
    ELSE NULL
  END AS published_at,
  COALESCE(r.created_at, now()),
  COALESCE(r.updated_at, now())
FROM public.recipes r
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  public_summary = EXCLUDED.public_summary,
  preview_image_path = EXCLUDED.preview_image_path,
  total_minutes = EXCLUDED.total_minutes,
  meal_labels = EXCLUDED.meal_labels,
  diet_labels = EXCLUDED.diet_labels,
  publication_state = EXCLUDED.publication_state,
  published_at = EXCLUDED.published_at,
  updated_at = now();

-- 2. Populate recipe_bodies from existing public.recipes
INSERT INTO public.recipe_bodies (
  recipe_id,
  content_version,
  ingredients,
  instructions,
  yield,
  reviewed_notes,
  allergen_review_state,
  allergens,
  storage_notes,
  updated_at
)
SELECT
  r.id,
  1 AS content_version,
  COALESCE(r.ingredients, '[]'::jsonb) AS ingredients,
  COALESCE(r.instructions, '[]'::jsonb) AS instructions,
  COALESCE(r.servings::text || ' servings', '2 servings') AS yield,
  CASE
    WHEN r.tips IS NOT NULL AND cardinality(r.tips) > 0 THEN array_to_string(r.tips, E'\n')
    ELSE NULL
  END AS reviewed_notes,
  CASE
    WHEN r.allergens IS NOT NULL AND cardinality(r.allergens) > 0 THEN 'reviewed_listed'
    WHEN r.allergens IS NOT NULL AND cardinality(r.allergens) = 0 THEN 'reviewed_no_allergens'
    ELSE 'unknown'
  END AS allergen_review_state,
  r.allergens,
  r.storage AS storage_notes,
  COALESCE(r.updated_at, now())
FROM public.recipes r
ON CONFLICT (recipe_id) DO UPDATE SET
  ingredients = EXCLUDED.ingredients,
  instructions = EXCLUDED.instructions,
  yield = EXCLUDED.yield,
  reviewed_notes = EXCLUDED.reviewed_notes,
  allergen_review_state = EXCLUDED.allergen_review_state,
  allergens = EXCLUDED.allergens,
  storage_notes = EXCLUDED.storage_notes,
  updated_at = now();

-- 3. Populate free_recipe_slots if the 3 selected recipes are present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.recipe_catalog WHERE id = '0003c4cc-b2cb-4e49-97c8-f4febfed39f9') THEN
    INSERT INTO public.free_recipe_slots (slot, recipe_id, assigned_at)
    VALUES
      (1, '0003c4cc-b2cb-4e49-97c8-f4febfed39f9', now()),
      (2, '50663aaa-7e47-4b08-9fd8-a58b390db96d', now()),
      (3, 'a61d93da-4d19-4219-a131-bca2468ace88', now())
    ON CONFLICT (slot) DO UPDATE SET
      recipe_id = EXCLUDED.recipe_id,
      assigned_at = now();
  END IF;
END $$;
