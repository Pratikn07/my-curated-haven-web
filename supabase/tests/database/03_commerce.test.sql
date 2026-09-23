BEGIN;
SELECT plan(12);

-- ============================================================================
-- S01: Anonymous caller cannot access private schema tables
-- ============================================================================
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '';
SET LOCAL "request.jwt.claim.sub" = '';

SELECT throws_ok(
  'SELECT count(*) FROM private.commercial_offers',
  '42501',
  NULL,
  'S01: Anonymous caller permission denied on private.commercial_offers'
);

SELECT throws_ok(
  'SELECT count(*) FROM private.purchase_orders',
  '42501',
  NULL,
  'S01b: Anonymous caller permission denied on private.purchase_orders'
);

-- ============================================================================
-- S02: Authenticated user cannot access private schema tables
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000001';

SELECT throws_ok(
  'SELECT count(*) FROM private.provider_payments',
  '42501',
  NULL,
  'S02: Authenticated caller permission denied on private.provider_payments'
);

SELECT throws_ok(
  'SELECT count(*) FROM private.access_sources',
  '42501',
  NULL,
  'S02b: Authenticated caller permission denied on private.access_sources'
);

-- ============================================================================
-- S03: Authenticated user cannot call private.project_user_entitlement
-- ============================================================================
SELECT throws_ok(
  'SELECT private.project_user_entitlement(''00000000-0000-0000-0000-000000000002''::uuid, ''a0000000-0000-0000-0000-000000000001''::uuid)',
  '42501',
  NULL,
  'S03: Authenticated caller permission denied executing private functions'
);

-- ============================================================================
-- S04: Verify Nonbuyer B cannot initially read Paid Recipe 1
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '20000000-0000-0000-0000-000000000001'),
  0,
  'S04: Nonbuyer B initially cannot read Paid Recipe 1'
);

-- ============================================================================
-- S05: Service role creates purchase order and tests attempt uniqueness
-- ============================================================================
RESET ROLE;

-- Insert first unresolved order attempt for Nonbuyer B
INSERT INTO private.purchase_orders (
  id,
  support_reference,
  owner_principal,
  user_id,
  offer_id,
  release_id,
  attempt_state,
  idempotency_key
) VALUES (
  'e1111111-0000-0000-0000-000000000001',
  'ORD-TEST-001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'open',
  'idemp-key-test-001'
);

-- S06: Attempting a second concurrent open order for same user/release violates partial unique index
SELECT throws_ok(
  $$INSERT INTO private.purchase_orders (
    support_reference,
    owner_principal,
    user_id,
    offer_id,
    release_id,
    attempt_state,
    idempotency_key
  ) VALUES (
    'ORD-TEST-002',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'creating',
    'idemp-key-test-002'
  )$$,
  '23505',
  NULL,
  'S06: Partial unique constraint prevents duplicate unresolved checkout attempts'
);

-- ============================================================================
-- S07: Record payment & project entitlement for Nonbuyer B
-- ============================================================================
SELECT private.record_payment_and_grant_access(
  'e1111111-0000-0000-0000-000000000001'::uuid,
  'acct_test_synthetic',
  'test',
  'pi_test_001',
  'ch_test_001',
  1500,
  'usd',
  now()
);

-- Check that entitlement is now active in public.access_entitlements
SELECT is(
  (SELECT state FROM public.access_entitlements WHERE user_id = '00000000-0000-0000-0000-000000000002' AND release_id = 'a0000000-0000-0000-0000-000000000001'),
  'active',
  'S07: Entitlement is active after successful payment'
);

-- S08: Now Nonbuyer B can read Paid Recipe 1 via RLS
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '20000000-0000-0000-0000-000000000001'),
  1,
  'S08: User can read Paid Recipe 1 after payment is fulfilled'
);

-- ============================================================================
-- S09: Record partial refund -> Access remains active
-- ============================================================================
RESET ROLE;

SELECT private.record_refund_and_recompute_access(
  'e1111111-0000-0000-0000-000000000001'::uuid,
  're_test_partial_001',
  (SELECT id FROM private.provider_payments WHERE payment_intent_id = 'pi_test_001'),
  500,
  'usd',
  'succeeded',
  'requested_by_customer',
  now()
);

SELECT is(
  (SELECT state FROM public.access_entitlements WHERE user_id = '00000000-0000-0000-0000-000000000002' AND release_id = 'a0000000-0000-0000-0000-000000000001'),
  'active',
  'S09: Entitlement remains active after partial refund'
);

-- ============================================================================
-- S10: Record remaining refund (reaching full captured amount) -> Access revoked
-- ============================================================================
SELECT private.record_refund_and_recompute_access(
  'e1111111-0000-0000-0000-000000000001'::uuid,
  're_test_full_002',
  (SELECT id FROM private.provider_payments WHERE payment_intent_id = 'pi_test_001'),
  1000,
  'usd',
  'succeeded',
  'requested_by_customer',
  now()
);

SELECT is(
  (SELECT state FROM public.access_entitlements WHERE user_id = '00000000-0000-0000-0000-000000000002' AND release_id = 'a0000000-0000-0000-0000-000000000001'),
  'revoked',
  'S10: Entitlement is revoked after full refund'
);

-- S11: Nonbuyer B is immediately denied access to Paid Recipe 1
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = '20000000-0000-0000-0000-000000000001'),
  0,
  'S11: User cannot read Paid Recipe 1 after full refund'
);

SELECT * FROM finish();
ROLLBACK;
