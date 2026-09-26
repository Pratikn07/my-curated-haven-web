BEGIN;
SELECT plan(7);

INSERT INTO public.recipe_catalog (id, slug, title, public_summary, preview_image_path, publication_state)
VALUES ('58888888-8888-8888-8888-888888888888', 'phase5-gate-fixture', 'Gate fixture', 'Synthetic', 'recipe-previews/gate.png', 'draft');
INSERT INTO public.recipe_bodies (recipe_id, content_version, ingredients, instructions, yield, allergen_review_state, allergens)
VALUES ('58888888-8888-8888-8888-888888888888', 1, '[]', '[]', '2 servings', 'unknown', ARRAY['fish']);

SELECT throws_ok(
  $$ UPDATE public.recipe_catalog SET publication_state = 'published' WHERE id = '58888888-8888-8888-8888-888888888888' $$,
  '23514', NULL,
  'an unreviewed recipe cannot be published'
);

SELECT throws_ok(
  $$ UPDATE public.free_recipe_slots SET recipe_id = '58888888-8888-8888-8888-888888888888' WHERE slot = 1 $$,
  '23514', NULL,
  'an unreviewed recipe cannot take a free slot'
);

SELECT throws_ok(
  $$ INSERT INTO public.collection_recipes (release_id, recipe_id, position)
     SELECT id, '58888888-8888-8888-8888-888888888888', 999 FROM public.collection_releases LIMIT 1 $$,
  '23514', NULL,
  'an unreviewed recipe cannot join a paid collection'
);

UPDATE public.recipe_bodies SET allergen_review_state = 'reviewed_listed'
WHERE recipe_id = '58888888-8888-8888-8888-888888888888';

SELECT lives_ok(
  $$ UPDATE public.recipe_catalog SET publication_state = 'published' WHERE id = '58888888-8888-8888-8888-888888888888' $$,
  'a reviewed recipe can be published'
);

SELECT lives_ok(
  $$ UPDATE public.recipe_bodies SET allergen_review_state = 'unknown' WHERE recipe_id = '58888888-8888-8888-8888-888888888888' $$,
  'marking a published recipe unreviewed again is allowed'
);

SELECT lives_ok(
  $$ UPDATE public.recipe_catalog SET title = 'Gate fixture renamed' WHERE id = '58888888-8888-8888-8888-888888888888' $$,
  'editing an already-published recipe is not blocked'
);

SELECT ok(
  NOT has_function_privilege('anon', 'private.recipe_is_reviewed(uuid)', 'EXECUTE'),
  'client roles cannot call the review check'
);

SELECT * FROM finish();
ROLLBACK;
