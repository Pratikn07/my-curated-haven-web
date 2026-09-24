BEGIN;
SELECT plan(21);

-- ============================================================================
-- S11: Retired release stays readable for an active historical grant
-- ============================================================================
RESET ROLE;
INSERT INTO public.access_entitlements (user_id, release_id, state, valid_from)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'active',
  now() - interval '1 day'
);

SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '';
SET LOCAL "request.jwt.claim.sub" = '';

SELECT is(
  (SELECT count(*)::int FROM public.collection_releases WHERE id = 'a0000000-0000-0000-0000-000000000002'),
  0,
  'S11: visitor cannot list a retired release'
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000001';

SELECT is(
  (SELECT count(*)::int FROM public.collection_releases WHERE id = 'a0000000-0000-0000-0000-000000000002'),
  1,
  'S11: buyer with an active grant can read the retired release'
);

SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '20000000-0000-0000-0000-000000000002'),
  1,
  'S11: buyer with an active grant can read the retired release body'
);

-- ============================================================================
-- S13: Nested join cannot widen body access
-- ============================================================================
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '';
SET LOCAL "request.jwt.claim.sub" = '';

SELECT is(
  (
    SELECT count(*)::int
    FROM public.recipe_catalog rc
    JOIN public.recipe_bodies rb ON rb.recipe_id = rc.id
    WHERE rc.slug = 'synth-paid-golden-soup'
  ),
  0,
  'S13: visitor nested join does not return a paid body'
);

SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies),
  3,
  'S13: visitor select-all returns only the three free bodies'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.recipe_bodies
    WHERE instructions::text LIKE '%SENTINEL_PAID_GOLDEN_SOUP_PROTECTED_SECRET%'
       OR instructions::text LIKE '%SENTINEL_DRAFT_SECRET_BODY%'
       OR instructions::text LIKE '%SENTINEL_WITHDRAWN_SECRET_BODY%'
  ),
  0,
  'S13: visitor select-all does not contain paid, draft, or withdrawn text'
);

-- ============================================================================
-- S14: Unknown subject cannot use buyer access
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';
SET LOCAL "request.jwt.claim.sub" = '99999999-9999-9999-9999-999999999999';

SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '20000000-0000-0000-0000-000000000001'),
  0,
  'S14: unknown subject cannot read a paid body'
);

-- ============================================================================
-- S15: Caller identity comes from the JWT, not a requested user id
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT count(*)::int FROM public.access_entitlements WHERE user_id = '00000000-0000-0000-0000-000000000001'),
  0,
  'S15: user B cannot read user A entitlements by supplying A''s user id'
);

SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '20000000-0000-0000-0000-000000000001'),
  0,
  'S15: user B cannot read a paid body by targeting A''s recipe id'
);

-- ============================================================================
-- Legacy recipes and raw searches stay closed
-- ============================================================================
RESET ROLE;
UPDATE public.recipes
SET instructions = '[{"text":"SENTINEL_LEGACY_RECIPES_LEAK"}]'::jsonb
WHERE id = '20000000-0000-0000-0000-000000000001';

SET LOCAL ROLE anon;
SELECT throws_ok(
  'SELECT instructions::text FROM public.recipes',
  '42501',
  NULL,
  'legacy public.recipes is not readable by anon'
);

SELECT throws_ok(
  'SELECT query FROM public.search_analytics',
  '42501',
  NULL,
  'raw search queries are not readable by anon'
);

-- ============================================================================
-- S17-S19: Protected storage objects follow recipe access
-- ============================================================================
RESET ROLE;
INSERT INTO storage.objects (bucket_id, name, metadata)
VALUES
  ('recipe-protected', '10000000-0000-0000-0000-000000000001/free.pdf', '{}'::jsonb),
  ('recipe-protected', '20000000-0000-0000-0000-000000000001/paid.pdf', '{}'::jsonb),
  ('recipe-protected', '20000000-0000-0000-0000-000000000002/other-paid.pdf', '{}'::jsonb);

SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '';
SET LOCAL "request.jwt.claim.sub" = '';

SELECT is(
  (
    SELECT count(*)::int
    FROM storage.objects
    WHERE bucket_id = 'recipe-protected'
      AND name = '20000000-0000-0000-0000-000000000001/paid.pdf'
  ),
  0,
  'S17: visitor cannot read a paid protected file'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM storage.objects
    WHERE bucket_id = 'recipe-protected'
      AND name = '10000000-0000-0000-0000-000000000001/free.pdf'
  ),
  1,
  'S17: visitor can read a free protected file'
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000001';

SELECT is(
  (
    SELECT count(*)::int
    FROM storage.objects
    WHERE bucket_id = 'recipe-protected'
      AND name = '20000000-0000-0000-0000-000000000001/paid.pdf'
  ),
  1,
  'S18: buyer can read the protected file for the granted recipe'
);

-- Buyer A received a retired-release grant earlier in this test.
-- Remove it before the cross-release storage assertion.
RESET ROLE;
DELETE FROM public.access_entitlements
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND release_id = 'a0000000-0000-0000-0000-000000000002';

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000001';

SELECT is(
  (
    SELECT count(*)::int
    FROM storage.objects
    WHERE bucket_id = 'recipe-protected'
      AND name = '20000000-0000-0000-0000-000000000002/other-paid.pdf'
  ),
  0,
  'S19: buyer cannot read a protected file outside the granted release'
);

-- ============================================================================
-- S20: Free-slot publication is one transaction, and sealed membership holds
-- ============================================================================
RESET ROLE;
SELECT throws_ok(
  $$SELECT private.publish_free_recipe_slots(ARRAY['10000000-0000-0000-0000-000000000001']::uuid[])$$,
  'P0001',
  'free selection must contain exactly 3 recipes',
  'S20: a short free selection is rejected'
);

SELECT throws_ok(
  $$SELECT private.publish_free_recipe_slots(ARRAY[
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002'
  ]::uuid[])$$,
  'P0001',
  'free selection recipes must be distinct',
  'S20: duplicate free recipes are rejected'
);

SELECT throws_ok(
  $$SELECT private.publish_free_recipe_slots(ARRAY[
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001'
  ]::uuid[])$$,
  'P0001',
  'every free slot recipe must be published',
  'S20: a draft recipe cannot occupy a free slot'
);

SELECT lives_ok(
  $$SELECT private.publish_free_recipe_slots(ARRAY[
    '10000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001'
  ]::uuid[])$$,
  'S20: a complete published selection is applied'
);

SELECT is(
  (SELECT recipe_id::text FROM public.free_recipe_slots WHERE slot = 1),
  '10000000-0000-0000-0000-000000000003',
  'S20: slot 1 matches the published selection'
);

SELECT throws_ok(
  $$UPDATE public.collection_recipes
    SET release_id = 'a0000000-0000-0000-0000-000000000002'
    WHERE release_id = 'a0000000-0000-0000-0000-000000000001'
      AND recipe_id = '20000000-0000-0000-0000-000000000001'$$,
  'P0001',
  'Cannot modify recipes in a sealed or retired release',
  'S20: a recipe cannot be moved into a retired release'
);

SELECT * FROM finish();
ROLLBACK;
