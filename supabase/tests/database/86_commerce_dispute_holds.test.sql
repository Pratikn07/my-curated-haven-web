BEGIN;
SELECT plan(14);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

-- The older webhook path's dispute and expired-checkout procedures (20261011150000). Order ...001 is paid ($15.00,
-- $1.00 already refunded) by ...002 for release ...004; give that purchase its access source first.
INSERT INTO private.collection_access_policies(release_id, source_kind, policy, approved_by, approval_reason)
VALUES ('f3000000-0000-4000-8000-000000000004', 'stripe_purchase', 'additions-v1', '92000000-0000-0000-0000-000000000001', 'Synthetic test')
ON CONFLICT DO NOTHING;
INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, valid_from)
VALUES ('f3000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000004', 'stripe_purchase',
  'f3000000-0000-4000-8000-000000000001', true, now() - interval '1 day');
SELECT private.project_user_entitlement('f3000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000004');
CREATE FUNCTION pg_temp.dispute(p_id text, p_status text, p_deadline timestamptz DEFAULT NULL) RETURNS jsonb LANGUAGE sql AS $$
 SELECT private.record_dispute_and_recompute_access(p_id, 'f3000000-0000-4000-8000-000000000031', 1500, 'usd', p_status, 'fraudulent', p_deadline)
$$;
CREATE FUNCTION pg_temp.source() RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_array(is_eligible, ineligibility_reason) FROM private.access_sources
 WHERE source_kind = 'stripe_purchase' AND source_id = 'f3000000-0000-4000-8000-000000000001'
$$;
CREATE FUNCTION pg_temp.access() RETURNS boolean LANGUAGE sql AS $$
 SELECT private.collection_has_access('f3000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000003')
$$;

SELECT is(has_function_privilege('authenticated', 'private.record_dispute_and_recompute_access(text,uuid,int,text,text,text,timestamptz)', 'EXECUTE'),
  false, 'browsers cannot record disputes');
SELECT ok(pg_temp.access(), 'the buyer starts with access');
SELECT is(pg_temp.dispute('du_inquiry_1', 'warning_needs_response')->>'access_effect', 'none', 'an inquiry changes nothing');
SELECT ok(pg_temp.access(), 'and access stays');
SELECT is(pg_temp.dispute('du_formal_1', 'needs_response', '2026-10-20T23:59:59Z')->>'access_effect', 'held',
  'an open formal dispute holds the purchase');
SELECT is(jsonb_build_array(pg_temp.source(), pg_temp.access(),
  (SELECT response_deadline FROM private.payment_disputes WHERE provider_dispute_id = 'du_formal_1') = '2026-10-20T23:59:59Z'::timestamptz),
  '[[false, "dispute_hold"], false, true]'::jsonb, 'access is paused and Stripe''s deadline is kept');
SELECT is(pg_temp.dispute('du_formal_1', 'under_review')->>'access_effect', 'held', 'a later update keeps the hold');
SELECT is(pg_temp.dispute('du_formal_1', 'won')->>'access_effect', 'none', 'winning ends the hold');
SELECT is(jsonb_build_array(pg_temp.source(), pg_temp.access()), '[[true, null], true]'::jsonb, 'and restores the purchase it paused');
SELECT is(pg_temp.dispute('du_formal_2', 'lost')->>'access_effect', 'revoked', 'a lost dispute removes the purchase');
SELECT is(jsonb_build_array(pg_temp.dispute('du_formal_2', 'needs_response')->>'access_effect', pg_temp.source()),
  '["revoked", [false, "dispute_lost"]]'::jsonb, 'and a late earlier event cannot undo it');
SELECT throws_ok($$SELECT pg_temp.dispute('dp_wrong', 'lost')$$, 'P0001', 'Invalid dispute id', 'only a Stripe dispute id is accepted');

-- Expired checkouts close an unpaid attempt only.
UPDATE private.purchase_orders SET attempt_state = 'open' WHERE id = 'f3000000-0000-4000-8000-000000000011';
CREATE TEMP TABLE closed AS SELECT private.close_expired_checkout_attempt('cs_test_legacy') c;
SELECT is(jsonb_build_array((SELECT c FROM closed),
  (SELECT attempt_state FROM private.purchase_orders WHERE id = 'f3000000-0000-4000-8000-000000000011')),
  '[true, "closed"]'::jsonb, 'an expired unpaid session closes its attempt so the buyer can start again');
UPDATE private.purchase_orders SET attempt_state = 'open' WHERE id = 'f3000000-0000-4000-8000-000000000001';
SELECT is(private.close_expired_checkout_attempt('cs_test_support'), false, 'a paid order is never closed by an expiry');

SELECT * FROM finish();
ROLLBACK;
