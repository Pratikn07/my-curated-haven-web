BEGIN;
SELECT plan(11);

-- R7-02: saved recipes reference the web catalog, not the legacy table.
SELECT is(
  (SELECT confrelid::regclass::text FROM pg_constraint WHERE conname = 'saved_recipes_recipe_id_fkey'),
  'recipe_catalog',
  'saved_recipes.recipe_id references recipe_catalog'
);

-- R7-01: the database enforces "free or purchased" on direct saves.
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT lives_ok(
  $$ INSERT INTO public.saved_recipes (user_id, recipe_id)
     VALUES ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003') $$,
  'a signed-in user can save a free recipe'
);

SELECT throws_ok(
  $$ INSERT INTO public.saved_recipes (user_id, recipe_id)
     VALUES ('00000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001') $$,
  '42501', NULL,
  'a direct save of a draft recipe is rejected'
);

SELECT throws_ok(
  $$ INSERT INTO public.saved_recipes (user_id, recipe_id)
     VALUES ('00000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001') $$,
  '42501', NULL,
  'a direct save of a withdrawn recipe is rejected'
);

SELECT throws_ok(
  $$ INSERT INTO public.saved_recipes (user_id, recipe_id)
     VALUES ('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001') $$,
  '42501', NULL,
  'a non-buyer cannot save a paid recipe'
);

-- Buyer A holds an active entitlement for the release containing golden soup.
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT lives_ok(
  $$ INSERT INTO public.saved_recipes (user_id, recipe_id)
     VALUES ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001') $$,
  'a buyer can save a recipe they bought'
);

-- User C's entitlement to herb salmon has expired.
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT throws_ok(
  $$ INSERT INTO public.saved_recipes (user_id, recipe_id)
     VALUES ('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002') $$,
  '42501', NULL,
  'an expired entitlement does not allow a save'
);

-- Removing an own save of a now-unavailable recipe still works (remediation R2).
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT lives_ok(
  $$ DELETE FROM public.saved_recipes
     WHERE user_id = '00000000-0000-0000-0000-000000000001'
       AND recipe_id = '40000000-0000-0000-0000-000000000001' $$,
  'a user can remove a save of a withdrawn recipe'
);

-- M7-02: account closure. Deleting the auth user removes the profile and the user's saves.
RESET ROLE;

SELECT lives_ok(
  $$ DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000002' $$,
  'deleting a user in Supabase Auth succeeds'
);

SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000002'),
  0,
  'the profile is deleted with the user'
);

SELECT is(
  (SELECT count(*)::int FROM public.saved_recipes WHERE user_id = '00000000-0000-0000-0000-000000000002'),
  0,
  'the user saved recipes are deleted with the user'
);

SELECT * FROM finish();
ROLLBACK;
