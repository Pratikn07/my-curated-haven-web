-- Phase 5 audit, 2026-09-25 (docs/audit/AUDIT-BACKLOG.md R5-01, R5-08).
--
-- R5-01: every recipe came from an LLM prompt in the iOS repo
-- (parenting-app scripts/RECIPE_PROMPT.md) and was imported without review.
-- The Phase 5 ingest still marked all 70 bodies "reviewed_*". Nobody reviewed
-- them, so they are all unknown until a person does. The web page keeps showing
-- the listed allergens, labelled "not yet reviewed".
-- One-time reset: on a fresh database this runs before the seed and changes nothing.
UPDATE public.recipe_bodies
SET allergen_review_state = 'unknown',
    updated_at = now()
WHERE allergen_review_state <> 'unknown';

-- R5-08: two errors in the generated drafts (both unpublished).
-- Onigiri Rice Triangles uses mayonnaise, which contains egg, so it is not egg-free.
UPDATE public.recipes
SET dietary_tags = array_remove(dietary_tags, 'egg-free')
WHERE id = '7c7a9197-9384-40bd-b623-8d7a49812faa';

UPDATE public.recipe_catalog
SET diet_labels = array_remove(diet_labels, 'egg-free'),
    updated_at = now()
WHERE id = '7c7a9197-9384-40bd-b623-8d7a49812faa';

-- Soft Tofu Veggie Stir Fry with Rice uses sesame oil, so it lists sesame.
UPDATE public.recipes
SET allergens = array_append(allergens, 'sesame')
WHERE id = 'f803dcc2-ce11-4838-b6af-8fe4476fcc18'
  AND NOT ('sesame' = ANY (allergens));

UPDATE public.recipe_bodies
SET allergens = array_append(allergens, 'sesame'),
    updated_at = now()
WHERE recipe_id = 'f803dcc2-ce11-4838-b6af-8fe4476fcc18'
  AND NOT ('sesame' = ANY (coalesce(allergens, '{}')));
