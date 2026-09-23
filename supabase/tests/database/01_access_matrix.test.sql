BEGIN;
SELECT plan(15);

-- ============================================================================
-- S01: Visitor lists catalog -> only published recipes returned
-- ============================================================================
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '';
SET LOCAL "request.jwt.claim.sub" = '';

SELECT is(
  (SELECT count(*)::int FROM public.recipe_catalog),
  5,
  'S01: Visitor sees only published catalog recipes (draft & withdrawn excluded)'
);

-- ============================================================================
-- S02: Visitor requests free recipe body -> approved content returned
-- ============================================================================
SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'S02: Visitor can read approved free recipe body'
);

-- ============================================================================
-- S03: Visitor requests paid recipe body -> 0 rows returned
-- ============================================================================
SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '20000000-0000-0000-0000-000000000001'),
  0,
  'S03: Visitor cannot read paid recipe body'
);

-- ============================================================================
-- S04: Signed-in nonbuyer B requests paid recipe body -> 0 rows returned
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '20000000-0000-0000-0000-000000000001'),
  0,
  'S04: Authenticated nonbuyer cannot read paid recipe body'
);

-- ============================================================================
-- S05: Buyer A reads granted release recipe body -> 1 row returned
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000001';

SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '20000000-0000-0000-0000-000000000001'),
  1,
  'S05: Buyer A can read paid recipe body in granted release'
);

-- ============================================================================
-- S06: Buyer A reads ungranted release recipe body (Paid Recipe 2) -> 0 rows
-- ============================================================================
SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '20000000-0000-0000-0000-000000000002'),
  0,
  'S06: Buyer A cannot read paid recipe in ungranted release'
);

-- ============================================================================
-- S07: User B requests User A's entitlement -> 0 rows returned
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT count(*)::int FROM public.access_entitlements WHERE user_id = '00000000-0000-0000-0000-000000000001'),
  0,
  'S07: User B cannot read User A entitlements'
);

-- ============================================================================
-- S08: Customer attempts INSERT on entitlements -> permission denied
-- ============================================================================
SELECT throws_ok(
  'INSERT INTO public.access_entitlements (id, user_id, release_id, state) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000002'', ''a0000000-0000-0000-0000-000000000001'', ''active'')',
  '42501',
  NULL,
  'S08: Client cannot insert rows into access_entitlements'
);

-- ============================================================================
-- S09: Customer attempts modifying free_recipe_slots -> permission denied
-- ============================================================================
SELECT throws_ok(
  'UPDATE public.free_recipe_slots SET recipe_id = ''20000000-0000-0000-0000-000000000001'' WHERE slot = 1',
  '42501',
  NULL,
  'S09: Client cannot update free_recipe_slots'
);

-- ============================================================================
-- S10: Revoked / expired grant (User C) -> no paid body access
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000003"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000003';

SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '20000000-0000-0000-0000-000000000001'),
  0,
  'S10: User C with revoked grant cannot read paid recipe body'
);

SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '20000000-0000-0000-0000-000000000002'),
  0,
  'S10b: User C with expired grant cannot read paid recipe body'
);

-- ============================================================================
-- S11: Draft & withdrawn recipes are never readable by clients
-- ============================================================================
SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '30000000-0000-0000-0000-000000000001'),
  0,
  'S11: Draft recipe body is never readable by clients'
);

SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '40000000-0000-0000-0000-000000000001'),
  0,
  'S11b: Withdrawn recipe body is never readable by clients'
);

-- ============================================================================
-- S12: Constraint check - slot 4 is rejected
-- ============================================================================
RESET ROLE;
SELECT throws_ok(
  'INSERT INTO public.free_recipe_slots (slot, recipe_id) VALUES (4, ''10000000-0000-0000-0000-000000000001'')',
  '23514',
  NULL,
  'S12: Slot 4 is rejected by check constraint'
);

-- ============================================================================
-- S13: Trigger check - mutating recipes in retired/sealed release is rejected
-- ============================================================================
SELECT throws_ok(
  'INSERT INTO public.collection_recipes (release_id, recipe_id, position) VALUES (''a0000000-0000-0000-0000-000000000002'', ''10000000-0000-0000-0000-000000000001'', 2)',
  'P0001',
  'Cannot modify recipes in a sealed or retired release',
  'S13: Mutation on sealed/retired release recipes is rejected by trigger'
);

SELECT * FROM finish();
ROLLBACK;
