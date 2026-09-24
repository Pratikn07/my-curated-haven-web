BEGIN;
SELECT plan(19);

-- ============================================================================
-- A01: Row Level Security is enabled on search_analytics
-- ============================================================================
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'search_analytics'),
  'A01: RLS is active on search_analytics'
);

-- ============================================================================
-- A02: Anonymous caller cannot read raw search_analytics
-- ============================================================================
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '';
SET LOCAL "request.jwt.claim.sub" = '';

SELECT throws_ok(
  'SELECT count(*) FROM public.search_analytics',
  '42501',
  NULL,
  'A02: Anonymous caller permission denied when reading search_analytics'
);

-- ============================================================================
-- A03: Anonymous caller cannot insert into search_analytics
-- ============================================================================
SELECT throws_ok(
  $$INSERT INTO public.search_analytics (query) VALUES ('toddler breakfast')$$,
  '42501',
  NULL,
  'A03: Anonymous caller permission denied when inserting into search_analytics'
);

-- ============================================================================
-- A04: Authenticated user cannot read raw search_analytics
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000001';

SELECT throws_ok(
  'SELECT count(*) FROM public.search_analytics',
  '42501',
  NULL,
  'A04: Authenticated user permission denied when reading search_analytics'
);

-- ============================================================================
-- A05: Authenticated user cannot insert into search_analytics
-- ============================================================================
SELECT throws_ok(
  $$INSERT INTO public.search_analytics (user_id, query) VALUES ('00000000-0000-0000-0000-000000000001', 'toddler snacks')$$,
  '42501',
  NULL,
  'A05: Authenticated user permission denied when inserting into search_analytics'
);

-- ============================================================================
-- A06: Broad trending select policy is removed
-- ============================================================================
SET LOCAL ROLE postgres;
SELECT is_empty(
  $$SELECT policyname FROM pg_policies WHERE tablename = 'search_analytics' AND policyname = 'Anyone can view searches for trending'$$,
  'A06: Insecure broad trending search policy does not exist'
);

SET LOCAL ROLE anon;
SELECT throws_ok(
  'SELECT count(*) FROM private.analytics_exports',
  '42501',
  NULL,
  'A07: Anonymous caller cannot read analytics exports'
);

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  'SELECT count(*) FROM private.analytics_exports',
  '42501',
  NULL,
  'A08: Authenticated caller cannot read analytics exports'
);

SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT * FROM private.preview_amount_summary(ARRAY[1000], '[]'::jsonb)$$,
  '42501',
  NULL,
  'A09: Anonymous caller cannot execute commerce summary'
);

SET LOCAL ROLE postgres;
SELECT results_eq(
  $$SELECT paid_orders, captured_minor, refunded_minor, captured_less_refunds
    FROM private.preview_amount_summary(
      ARRAY[1000, 1500, 2000],
      '[{"amount":300,"status":"succeeded"},{"amount":1500,"status":"succeeded"},{"amount":100,"status":"pending"}]'::jsonb
    )$$,
  $$VALUES (3, 4500::bigint, 1800::bigint, 2700::bigint)$$,
  'A10: reconciliation fixture keeps all paid orders and ignores pending refunds'
);

SELECT is(
  (SELECT paid_orders FROM private.founder_commerce_totals('zzz', 'test')),
  0::bigint,
  'A11: unknown currency reports zero orders'
);

SELECT is(
  (SELECT status FROM private.instagram_source_status()),
  'unavailable',
  'A12: missing Instagram aggregate export is unavailable, not zero'
);

INSERT INTO private.purchase_orders (
  support_reference,
  owner_principal,
  user_id,
  offer_id,
  release_id,
  snapshot,
  attempt_state,
  idempotency_key
) VALUES (
  'MCH-P9A',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '{}'::jsonb,
  'closed',
  'p9-analytics-idem-a'
);

SELECT lives_ok(
  $$SELECT private.record_checkout_measurement(
    (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'p9-analytics-idem-a'),
    'not_a_real_campaign',
    true,
    'test'
  )$$,
  'A13a: checkout measurement accepts an unknown campaign without storing it'
);

SELECT is(
  (SELECT campaign_code FROM private.purchase_orders WHERE idempotency_key = 'p9-analytics-idem-a'),
  NULL,
  'A13: unknown campaign code is not stored'
);

SELECT is(
  (SELECT delivery_state FROM private.analytics_exports WHERE event_name = 'checkout_created' AND order_id = (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'p9-analytics-idem-a')),
  'suppressed',
  'A14: export stays suppressed while the optional switch is off'
);

INSERT INTO private.purchase_orders (
  support_reference,
  owner_principal,
  user_id,
  offer_id,
  release_id,
  snapshot,
  attempt_state,
  idempotency_key
) VALUES (
  'MCH-P9B',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '{}'::jsonb,
  'closed',
  'p9-analytics-idem-b'
);

UPDATE private.analytics_settings SET optional_export_enabled = true WHERE singleton = true;

SELECT lives_ok(
  $$SELECT private.record_checkout_measurement(
    (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'p9-analytics-idem-b'),
    'toddler_recipes_launch',
    true,
    'test'
  )$$,
  'A15a: checkout measurement records a registered campaign'
);

SELECT is(
  (SELECT delivery_state FROM private.analytics_exports WHERE event_name = 'checkout_created' AND order_id = (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'p9-analytics-idem-b')),
  'pending',
  'A15: consented registry campaign is pending only after the switch is on'
);

SELECT lives_ok(
  $$SELECT private.suppress_analytics_attempts(ARRAY[
    (SELECT analytics_attempt_ref FROM private.purchase_orders WHERE idempotency_key = 'p9-analytics-idem-b')
  ])$$,
  'A16a: withdrawal function runs'
);

SELECT is(
  (SELECT delivery_state FROM private.analytics_exports WHERE event_name = 'checkout_created' AND order_id = (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'p9-analytics-idem-b')),
  'suppressed',
  'A16: withdrawal suppresses a queued export and keeps the order'
);

SELECT * FROM finish();
ROLLBACK;
