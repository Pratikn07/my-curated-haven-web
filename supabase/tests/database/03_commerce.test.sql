BEGIN;
SELECT plan(20);

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
  snapshot,
  attempt_state,
  idempotency_key
) VALUES (
  'e1111111-0000-0000-0000-000000000001',
  'ORD-TEST-001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '{"price_minor":1500,"currency":"usd","provider_account_id":"acct_test_synthetic","provider_mode":"test"}'::jsonb,
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

-- V36: A newer paid order must remain an eligible source if the older order is refunded.
INSERT INTO private.purchase_orders (
  id,
  support_reference,
  owner_principal,
  user_id,
  offer_id,
  release_id,
  snapshot,
  attempt_state,
  idempotency_key
) VALUES (
  'e1111111-0000-0000-0000-000000000002',
  'ORD-TEST-003',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '{"price_minor":1500,"currency":"usd","provider_account_id":"acct_test_synthetic","provider_mode":"test"}'::jsonb,
  'open',
  'idemp-key-test-003'
);

SELECT private.record_payment_and_grant_access(
  'e1111111-0000-0000-0000-000000000002'::uuid,
  'acct_test_synthetic',
  'test',
  'pi_test_002',
  'ch_test_002',
  1500,
  'usd',
  now()
);

SELECT is(
  (SELECT count(*)::int FROM private.access_sources
   WHERE source_kind = 'stripe_purchase'
     AND user_id = '00000000-0000-0000-0000-000000000002'
     AND release_id = 'a0000000-0000-0000-0000-000000000001'
     AND is_eligible),
  2,
  'V36: Both paid orders are independent eligible access sources'
);

-- ============================================================================
-- S10 / V34 / V36: Refunding the older order must preserve the newer source.
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
  'active',
  'V36: Refunding the older order preserves access from the newer purchase'
);

SELECT private.record_refund_and_recompute_access(
  'e1111111-0000-0000-0000-000000000002'::uuid,
  're_test_newer_full_003',
  (SELECT id FROM private.provider_payments WHERE payment_intent_id = 'pi_test_002'),
  1500,
  'usd',
  'succeeded',
  'requested_by_customer',
  now()
);

SELECT is(
  (SELECT state FROM public.access_entitlements WHERE user_id = '00000000-0000-0000-0000-000000000002' AND release_id = 'a0000000-0000-0000-0000-000000000001'),
  'revoked',
  'V34: Full refunds revoke access only after every source is ineligible'
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

-- V11: Captured amount and currency must match the immutable order snapshot.
RESET ROLE;
INSERT INTO private.purchase_orders (
  id, support_reference, owner_principal, user_id, offer_id, release_id,
  snapshot, attempt_state, idempotency_key
) VALUES
  (
    'e1111111-0000-0000-0000-000000000003',
    'ORD-TEST-004',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '{"price_minor":1500,"currency":"usd","provider_account_id":"acct_test_synthetic","provider_mode":"test"}'::jsonb,
    'open',
    'idemp-key-test-004'
  );

SELECT private.record_payment_and_grant_access(
  'e1111111-0000-0000-0000-000000000003'::uuid,
  'acct_test_synthetic', 'test', 'pi_test_wrong_amount', 'ch_test_wrong_amount',
  1400, 'usd', now()
);

INSERT INTO private.purchase_orders (
  id, support_reference, owner_principal, user_id, offer_id, release_id,
  snapshot, attempt_state, idempotency_key
) VALUES (
  'e1111111-0000-0000-0000-000000000004',
  'ORD-TEST-005',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '{"price_minor":1500,"currency":"usd","provider_account_id":"acct_test_synthetic","provider_mode":"test"}'::jsonb,
  'open',
  'idemp-key-test-005'
);

SELECT private.record_payment_and_grant_access(
  'e1111111-0000-0000-0000-000000000004'::uuid,
  'acct_test_synthetic', 'test', 'pi_test_wrong_currency', 'ch_test_wrong_currency',
  1500, 'eur', now()
);

INSERT INTO private.purchase_orders (
  id, support_reference, owner_principal, user_id, offer_id, release_id,
  snapshot, attempt_state, idempotency_key
) VALUES (
  'e1111111-0000-0000-0000-000000000006',
  'ORD-TEST-006',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '{"price_minor":1500,"currency":"usd","provider_account_id":"acct_test_synthetic","provider_mode":"test"}'::jsonb,
  'open',
  'idemp-key-test-006'
);

SELECT private.record_payment_and_grant_access(
  'e1111111-0000-0000-0000-000000000006'::uuid,
  'acct_wrong_synthetic', 'test', 'pi_test_wrong_account', 'ch_test_wrong_account',
  1500, 'usd', now()
);

INSERT INTO private.purchase_orders (
  id, support_reference, owner_principal, user_id, offer_id, release_id,
  snapshot, attempt_state, idempotency_key
) VALUES (
  'e1111111-0000-0000-0000-000000000007',
  'ORD-TEST-007',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '{"price_minor":1500,"currency":"usd","provider_account_id":"acct_test_synthetic","provider_mode":"test"}'::jsonb,
  'open',
  'idemp-key-test-007'
);

SELECT private.record_payment_and_grant_access(
  'e1111111-0000-0000-0000-000000000007'::uuid,
  'acct_test_synthetic', 'live', 'pi_test_wrong_mode', 'ch_test_wrong_mode',
  1500, 'usd', now()
);

SELECT is(
  (SELECT count(*)::int FROM private.purchase_orders
   WHERE id IN (
     'e1111111-0000-0000-0000-000000000003',
     'e1111111-0000-0000-0000-000000000004',
     'e1111111-0000-0000-0000-000000000006',
     'e1111111-0000-0000-0000-000000000007'
   ) AND attempt_state = 'review'),
  4,
  'V11: Amount, currency, account or mode mismatch leaves the order in review'
);
SELECT is(
  (SELECT count(*)::int FROM private.provider_payments
   WHERE order_id IN (
     'e1111111-0000-0000-0000-000000000003',
     'e1111111-0000-0000-0000-000000000004',
     'e1111111-0000-0000-0000-000000000006',
     'e1111111-0000-0000-0000-000000000007'
   )),
  0,
  'V11: Mismatched captures do not create payment ledger rows'
);
SELECT is(
  (SELECT count(*)::int FROM private.access_sources
   WHERE source_id IN (
     'e1111111-0000-0000-0000-000000000003',
     'e1111111-0000-0000-0000-000000000004',
     'e1111111-0000-0000-0000-000000000006',
     'e1111111-0000-0000-0000-000000000007'
   )),
  0,
  'V11: Mismatched captures do not grant access sources'
);

-- A successful PaymentIntent is bound to its original order and cannot grant a second order.
INSERT INTO private.purchase_orders (
  id, support_reference, owner_principal, user_id, offer_id, release_id,
  snapshot, attempt_state, idempotency_key
) VALUES (
  'e1111111-0000-0000-0000-000000000005',
  'ORD-TEST-008',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '{"price_minor":1500,"currency":"usd","provider_account_id":"acct_test_synthetic","provider_mode":"test"}'::jsonb,
  'open',
  'idemp-key-test-008'
);

SELECT private.record_payment_and_grant_access(
  'e1111111-0000-0000-0000-000000000005'::uuid,
  'acct_test_synthetic', 'test', 'pi_test_001', 'ch_test_duplicate',
  1500, 'usd', now()
);

SELECT is(
  (SELECT attempt_state FROM private.purchase_orders
   WHERE id = 'e1111111-0000-0000-0000-000000000005'),
  'review',
  'V11: Reusing a PaymentIntent for another order moves the second order to review'
);
SELECT is(
  (SELECT count(*)::int FROM private.provider_payments
   WHERE order_id = 'e1111111-0000-0000-0000-000000000005'),
  0,
  'V11: A PaymentIntent cannot create a second payment row for another order'
);
SELECT is(
  (SELECT count(*)::int FROM private.access_sources
   WHERE source_id = 'e1111111-0000-0000-0000-000000000005'),
  0,
  'V11: A reused PaymentIntent cannot create a second access source'
);

SELECT * FROM finish();
ROLLBACK;
