BEGIN;
SELECT plan(34);

-- ============================================================================
-- Grants: the admin list is private and anonymous callers get nothing.
-- ============================================================================
SELECT ok(
  NOT has_table_privilege('anon', 'private.admin_users', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'private.admin_users', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'private.admin_users', 'INSERT'),
  'client roles cannot read or add admins'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.is_recipe_admin()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.admin_list_recipes(text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.admin_get_recipe(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.admin_save_recipe(jsonb, uuid, text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.admin_publish_recipe(uuid, text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.admin_withdraw_recipe(uuid, text)', 'EXECUTE'),
  'anonymous callers cannot call any admin function'
);

SELECT ok(
  NOT has_function_privilege('authenticated', 'private.require_recipe_admin()', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'private.recipe_version(timestamptz)', 'EXECUTE'),
  'admin helpers stay private'
);

-- ============================================================================
-- A signed-in parent is not an admin.
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000001';

SELECT is(public.is_recipe_admin(), false, 'a signed-in parent is not a recipe admin');

SELECT throws_ok(
  $$ SELECT * FROM public.admin_list_recipes() $$,
  '42501', NULL,
  'a parent cannot list draft recipes'
);

SELECT throws_ok(
  $$ SELECT public.admin_get_recipe('30000000-0000-0000-0000-000000000001') $$,
  '42501', NULL,
  'a parent cannot read a draft recipe'
);

SELECT throws_ok(
  $$ SELECT public.admin_save_recipe('{"title":"Parent recipe","slug":"parent-recipe"}') $$,
  '42501', NULL,
  'a parent cannot create a recipe'
);

SELECT throws_ok(
  $$ SELECT public.admin_publish_recipe('30000000-0000-0000-0000-000000000001', NULL) $$,
  '42501', NULL,
  'a parent cannot publish a recipe'
);

SELECT throws_ok(
  $$ SELECT public.admin_withdraw_recipe('10000000-0000-0000-0000-000000000001', NULL) $$,
  '42501', NULL,
  'a parent cannot withdraw a recipe'
);

SELECT throws_ok(
  $$ INSERT INTO storage.objects (bucket_id, name, owner_id)
     VALUES ('recipe-previews', 'admin/parent-upload.webp', '00000000-0000-0000-0000-000000000001') $$,
  '42501', NULL,
  'a parent cannot upload a recipe photo'
);

-- ============================================================================
-- The synthetic editor is an admin.
-- ============================================================================
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000004';

SELECT is(public.is_recipe_admin(), true, 'the synthetic editor is a recipe admin');

SELECT ok(
  (SELECT count(*) FROM public.admin_list_recipes() WHERE publication_state = 'draft') > 0,
  'an admin sees draft recipes'
);

SELECT is(
  public.admin_get_recipe('30000000-0000-0000-0000-000000000001')->>'publicationState',
  'draft',
  'an admin can open a draft recipe'
);

SELECT throws_ok(
  $$ UPDATE public.recipe_catalog SET title = 'Edited by client' WHERE slug = 'synth-free-oat-bake' $$,
  '42501', NULL,
  'an admin session still cannot write recipe tables directly'
);

-- Photos
SELECT lives_ok(
  $$ INSERT INTO storage.objects (bucket_id, name, owner_id)
     VALUES ('recipe-previews', 'admin/editor-upload.webp', '00000000-0000-0000-0000-000000000004') $$,
  'an admin can upload a photo into the admin folder'
);

SELECT throws_ok(
  $$ INSERT INTO storage.objects (bucket_id, name, owner_id)
     VALUES ('recipe-previews', 'synth-free-oat-bake.webp', '00000000-0000-0000-0000-000000000004') $$,
  '42501', NULL,
  'an admin cannot replace photos outside the admin folder'
);

SELECT throws_ok(
  $$ INSERT INTO storage.objects (bucket_id, name, owner_id)
     VALUES ('recipe-protected', 'admin/editor-upload.webp', '00000000-0000-0000-0000-000000000004') $$,
  '42501', NULL,
  'an admin cannot upload into the protected bucket'
);

-- Create a draft
CREATE TEMP TABLE admin_fixture ON COMMIT DROP AS
SELECT public.admin_save_recipe('{
  "title": "Admin Fixture Muffins",
  "slug": "admin-fixture-muffins",
  "summary": "Soft muffins for small hands.",
  "imageUrl": "",
  "totalMinutes": 25,
  "mealLabels": ["Snack"],
  "dietLabels": [],
  "yield": "12 mini muffins",
  "ingredients": [{"amount": "1 cup", "item": "oats"}],
  "steps": ["Mix.", "Bake."],
  "allergenReviewState": "unknown",
  "allergens": []
}'::jsonb) AS saved;

SELECT is(
  (SELECT public.admin_get_recipe((saved->>'id')::uuid)->>'publicationState' FROM admin_fixture),
  'draft',
  'a new recipe starts as a draft'
);

SELECT throws_ok(
  $$ SELECT public.admin_save_recipe('{"title":"Duplicate muffins","slug":"admin-fixture-muffins"}') $$,
  '23505', NULL,
  'two recipes cannot share a web address'
);

SELECT throws_ok(
  $$ SELECT public.admin_save_recipe('{"title":"Bad address","slug":"Bad Address!"}') $$,
  '22023', NULL,
  'an invalid web address is refused'
);

SELECT throws_ok(
  $$ SELECT public.admin_save_recipe(
       '{"title":"Admin Fixture Muffins","slug":"admin-fixture-muffins"}',
       (SELECT (saved->>'id')::uuid FROM admin_fixture),
       'stale-version') $$,
  'MCSTL', NULL,
  'saving over someone else''s newer change is refused'
);

SELECT throws_ok(
  $$ SELECT public.admin_publish_recipe((SELECT (saved->>'id')::uuid FROM admin_fixture),
       (SELECT saved->>'version' FROM admin_fixture)) $$,
  '23514', NULL,
  'a recipe without an allergen check cannot be published'
);

-- Edit: only a change parents can read bumps the content version.
UPDATE admin_fixture SET saved = public.admin_save_recipe(p_recipe_id => (saved->>'id')::uuid, p_expected_version => saved->>'version', p_recipe => '{
  "title": "Admin Fixture Muffins",
  "slug": "admin-fixture-muffins",
  "summary": "Soft muffins for small hands.",
  "imageUrl": "https://example.test/muffins.webp",
  "totalMinutes": 25,
  "mealLabels": ["Snack"],
  "dietLabels": [],
  "yield": "12 mini muffins",
  "ingredients": [{"amount": "1 cup", "item": "oats"}],
  "steps": ["Mix.", "Bake."],
  "allergenReviewState": "unknown",
  "allergens": []
}'::jsonb);

SELECT is(
  (SELECT (public.admin_get_recipe((saved->>'id')::uuid)->>'contentVersion')::int FROM admin_fixture),
  1,
  'a photo-only change keeps the content version'
);

UPDATE admin_fixture SET saved = public.admin_save_recipe(p_recipe_id => (saved->>'id')::uuid, p_expected_version => saved->>'version', p_recipe => '{
  "title": "Admin Fixture Muffins",
  "slug": "admin-fixture-muffins",
  "summary": "Soft muffins for small hands.",
  "imageUrl": "https://example.test/muffins.webp",
  "totalMinutes": 25,
  "mealLabels": ["Snack"],
  "dietLabels": [],
  "yield": "12 mini muffins",
  "ingredients": [{"amount": "1 cup", "item": "oats"}, {"amount": "1", "item": "egg"}],
  "steps": ["Mix.", "Bake."],
  "allergenReviewState": "reviewed_listed",
  "allergens": ["Eggs"]
}'::jsonb);

SELECT is(
  (SELECT (public.admin_get_recipe((saved->>'id')::uuid)->>'contentVersion')::int FROM admin_fixture),
  2,
  'an ingredient change bumps the content version'
);

SELECT is(
  (SELECT public.admin_get_recipe((saved->>'id')::uuid)->'allergens' FROM admin_fixture),
  '["Eggs"]'::jsonb,
  'checked allergens are stored'
);

-- Publish
UPDATE admin_fixture SET saved = saved || public.admin_publish_recipe((saved->>'id')::uuid, saved->>'version');

SELECT is(
  (SELECT public.admin_get_recipe((saved->>'id')::uuid)->>'publicationState' FROM admin_fixture),
  'published',
  'an admin can publish a checked recipe'
);

RESET ROLE;
SELECT results_eq(
  $$ SELECT r.reviewer_kind, r.reviewer, r.content_version
     FROM private.recipe_reviews r, admin_fixture f
     WHERE r.recipe_id = (f.saved->>'id')::uuid $$,
  $$ VALUES ('human'::text, 'editor-e@synthetic.test'::text, 2) $$,
  'publishing records who approved which content version'
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.admin_save_recipe(
       '{"title":"Admin Fixture Muffins","slug":"renamed-muffins","allergenReviewState":"reviewed_listed","allergens":["Eggs"]}',
       (SELECT (saved->>'id')::uuid FROM admin_fixture),
       (SELECT saved->>'version' FROM admin_fixture)) $$,
  'MCSLG', NULL,
  'a recipe that has been live keeps its web address'
);

SELECT throws_ok(
  $$ SELECT public.admin_save_recipe(
       '{"title":"Admin Fixture Muffins","slug":"admin-fixture-muffins","allergenReviewState":"unknown"}',
       (SELECT (saved->>'id')::uuid FROM admin_fixture),
       (SELECT saved->>'version' FROM admin_fixture)) $$,
  'MCALG', NULL,
  'a live recipe cannot drop its allergen check'
);

-- Withdraw
UPDATE admin_fixture SET saved = saved || public.admin_withdraw_recipe((saved->>'id')::uuid, saved->>'version');

SELECT is(
  (SELECT public.admin_get_recipe((saved->>'id')::uuid)->>'publicationState' FROM admin_fixture),
  'withdrawn',
  'an admin can withdraw an unplaced recipe'
);

SELECT throws_ok(
  $$ SELECT public.admin_withdraw_recipe('10000000-0000-0000-0000-000000000001',
       (SELECT public.admin_get_recipe('10000000-0000-0000-0000-000000000001')->>'version')) $$,
  'MCFRE', NULL,
  'a free recipe cannot be withdrawn from the admin area'
);

SELECT throws_ok(
  $$ SELECT public.admin_withdraw_recipe('20000000-0000-0000-0000-000000000001',
       (SELECT public.admin_get_recipe('20000000-0000-0000-0000-000000000001')->>'version')) $$,
  'MCCOL', NULL,
  'a recipe buyers paid for cannot be withdrawn from the admin area'
);

RESET ROLE;

-- ============================================================================
-- Upload limits
-- ============================================================================
SELECT is(
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'recipe-previews'),
  3145728::bigint,
  'recipe photos are capped at 3 MB'
);

SELECT is(
  (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'recipe-previews'),
  ARRAY['image/webp', 'image/jpeg', 'image/png'],
  'recipe photos must be WebP, JPEG or PNG'
);

SELECT * FROM finish();
ROLLBACK;
