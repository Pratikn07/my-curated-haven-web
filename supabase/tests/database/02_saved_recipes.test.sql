BEGIN;
SELECT plan(10);

-- ============================================================================
-- S01: Anonymous user cannot read saved_recipes
-- ============================================================================
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '';
SET LOCAL "request.jwt.claim.sub" = '';

SELECT throws_ok(
  'SELECT count(*) FROM public.saved_recipes',
  '42501',
  NULL,
  'S01: Anonymous caller permission denied when reading saved_recipes'
);

-- ============================================================================
-- S02: Anonymous user cannot insert into saved_recipes
-- ============================================================================
SELECT throws_ok(
  $$INSERT INTO public.saved_recipes (user_id, recipe_id) VALUES ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')$$,
  '42501',
  NULL,
  'S02: Anonymous caller permission denied when inserting into saved_recipes'
);

-- ============================================================================
-- S03: Authenticated Buyer A can read their own saved recipe
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000001';

SELECT is(
  (SELECT count(*)::int FROM public.saved_recipes WHERE user_id = '00000000-0000-0000-0000-000000000001'),
  2,
  'S03: Buyer A can read their own saved recipes'
);

-- ============================================================================
-- S04: Authenticated Nonbuyer B cannot see Buyer A's saved recipes
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT count(*)::int FROM public.saved_recipes WHERE user_id = '00000000-0000-0000-0000-000000000001'),
  0,
  'S04: Nonbuyer B cannot see Buyer A saved recipes'
);

-- ============================================================================
-- S05: Nonbuyer B can save a recipe
-- ============================================================================
INSERT INTO public.saved_recipes (user_id, recipe_id)
VALUES ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002');

SELECT is(
  (SELECT count(*)::int FROM public.saved_recipes WHERE user_id = '00000000-0000-0000-0000-000000000002'),
  1,
  'S05: Nonbuyer B can save a recipe for themselves'
);

-- ============================================================================
-- S06: Nonbuyer B cannot save a recipe on behalf of Buyer A (RLS WITH CHECK violation)
-- ============================================================================
SELECT throws_ok(
  $$INSERT INTO public.saved_recipes (user_id, recipe_id) VALUES ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002')$$,
  '42501',
  NULL,
  'S06: Nonbuyer B cannot insert a row with Buyer A user_id'
);

-- ============================================================================
-- S07: Duplicate save is prevented by unique constraint
-- ============================================================================
SELECT throws_ok(
  $$INSERT INTO public.saved_recipes (user_id, recipe_id) VALUES ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002')$$,
  '23505',
  NULL,
  'S07: Duplicate bookmark for same user and recipe raises unique_violation'
);

-- ============================================================================
-- S08: Nonbuyer B cannot delete Buyer A's saved recipe
-- ============================================================================
DELETE FROM public.saved_recipes WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Re-check as Buyer A that row is still intact
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000001';

SELECT is(
  (SELECT count(*)::int FROM public.saved_recipes WHERE user_id = '00000000-0000-0000-0000-000000000001'),
  2,
  'S08: Buyer A row was not deleted by Nonbuyer B'
);

-- ============================================================================
-- S09: Buyer A can delete their own saved recipe
-- ============================================================================
DELETE FROM public.saved_recipes WHERE user_id = '00000000-0000-0000-0000-000000000001';

SELECT is(
  (SELECT count(*)::int FROM public.saved_recipes WHERE user_id = '00000000-0000-0000-0000-000000000001'),
  0,
  'S09: Buyer A can delete their own saved recipe'
);

-- ============================================================================
-- S10: Anonymous caller cannot delete from saved_recipes
-- ============================================================================
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '';
SET LOCAL "request.jwt.claim.sub" = '';

SELECT throws_ok(
  'DELETE FROM public.saved_recipes',
  '42501',
  NULL,
  'S10: Anonymous caller permission denied when deleting from saved_recipes'
);

SELECT * FROM finish();
ROLLBACK;
