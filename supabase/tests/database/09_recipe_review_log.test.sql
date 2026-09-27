BEGIN;
SELECT plan(6);

INSERT INTO public.recipe_catalog (id, slug, title, public_summary, preview_image_path, publication_state)
VALUES ('59999999-9999-9999-9999-999999999999', 'review-log-fixture', 'Review log fixture', 'Synthetic', 'recipe-previews/log.png', 'draft');
INSERT INTO public.recipe_bodies (recipe_id, content_version, ingredients, instructions, yield, allergen_review_state, allergens)
VALUES ('59999999-9999-9999-9999-999999999999', 1, '[]', '[]', '2 servings', 'unknown', ARRAY['milk']);

INSERT INTO private.recipe_reviews (recipe_id, content_version, reviewer_kind, reviewer, verdict, open_blockers)
VALUES ('59999999-9999-9999-9999-999999999999', 1, 'ai', 'fixture', 'reject', 2);
SELECT ok(NOT private.recipe_is_reviewed('59999999-9999-9999-9999-999999999999'),
  'a rejected review with open blockers does not pass the gate');

INSERT INTO private.recipe_reviews (recipe_id, content_version, reviewer_kind, reviewer, verdict, open_blockers)
VALUES ('59999999-9999-9999-9999-999999999999', 1, 'ai', 'fixture', 'approve_with_changes', 0);
SELECT ok(private.recipe_is_reviewed('59999999-9999-9999-9999-999999999999'),
  'the latest AI review with no open blockers passes the gate');

SELECT is(
  (SELECT allergen_review_state FROM public.recipe_bodies WHERE recipe_id = '59999999-9999-9999-9999-999999999999'),
  'unknown',
  'an internal review does not change the public allergen state'
);

UPDATE public.recipe_bodies SET content_version = 2 WHERE recipe_id = '59999999-9999-9999-9999-999999999999';
SELECT ok(NOT private.recipe_is_reviewed('59999999-9999-9999-9999-999999999999'),
  'editing the content (new version) voids the old review');

SELECT ok(NOT has_table_privilege('anon', 'private.recipe_reviews', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'private.recipe_reviews', 'SELECT'),
  'client roles cannot read the review log');

INSERT INTO private.recipe_reviews (recipe_id, content_version, reviewer_kind, reviewer, verdict, open_blockers)
VALUES ('59999999-9999-9999-9999-999999999999', 2, 'ai', 'fixture', 'approve_with_changes', 0);
SELECT lives_ok(
  $$ UPDATE public.recipe_catalog SET publication_state = 'published' WHERE id = '59999999-9999-9999-9999-999999999999' $$,
  'a recipe with a passing review of its current version can be published'
);

SELECT * FROM finish();
ROLLBACK;
