BEGIN;
SELECT plan(5);

SELECT is(
  private.slugify('Salmon & Pea Fish Cakes'),
  'salmon-and-pea-fish-cakes',
  'slugify lowercases, replaces ampersand, and hyphenates'
);

SELECT is(
  private.merge_publication_state('published', 'draft'),
  'published',
  'a later draft ingest does not demote a published recipe'
);

SELECT is(
  private.merge_publication_state('published', 'withdrawn'),
  'withdrawn',
  'withdrawal still overrides published'
);

INSERT INTO public.recipe_catalog (
  id, slug, title, public_summary, preview_image_path, publication_state
) VALUES
(
  '50663aaa-7e47-4b08-9fd8-a58b390db96d',
  'phase5-oat-bars-review',
  'Oat bars review fixture',
  'Documented no-allergen review.',
  'recipe-previews/oat.png',
  'draft'
),
(
  '51111111-1111-1111-1111-111111111111',
  'phase5-empty-allergen-fixture',
  'Empty allergen fixture',
  'Empty list is not a review.',
  'recipe-previews/empty.png',
  'draft'
);

INSERT INTO public.recipe_bodies (
  recipe_id, ingredients, instructions, yield, allergen_review_state, allergens
) VALUES
(
  '50663aaa-7e47-4b08-9fd8-a58b390db96d',
  '[]'::jsonb,
  '[]'::jsonb,
  '1 serving',
  'reviewed_no_allergens',
  ARRAY[]::text[]
),
(
  '51111111-1111-1111-1111-111111111111',
  '[]'::jsonb,
  '[]'::jsonb,
  '1 serving',
  'reviewed_no_allergens',
  ARRAY[]::text[]
);

SELECT private.clear_unreviewed_allergen_claims();

SELECT is(
  (SELECT allergen_review_state FROM public.recipe_bodies WHERE recipe_id = '51111111-1111-1111-1111-111111111111'),
  'unknown',
  'an empty allergen list is not reviewed_no_allergens'
);

SELECT is(
  (SELECT allergen_review_state FROM public.recipe_bodies WHERE recipe_id = '50663aaa-7e47-4b08-9fd8-a58b390db96d'),
  'reviewed_no_allergens',
  'the documented oat bars review is kept'
);

SELECT * FROM finish();
ROLLBACK;
