BEGIN;
SELECT plan(52);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

-- Each reconciliation order gets its own customer, so access changes are visible per order.
CREATE FUNCTION pg_temp.new_order(p_n int, p_state text DEFAULT 'closed', p_paid boolean DEFAULT true) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_id uuid := ('f3000000-0000-4000-8000-0000000007' || lpad(p_n::text, 2, '0'))::uuid;
 v_user uuid := ('f3000000-0000-4000-8000-0000000008' || lpad(p_n::text, 2, '0'))::uuid;
BEGIN
 INSERT INTO auth.users(id, email, role, aud, email_confirmed_at) VALUES (v_user, 'rec-' || p_n || '@synthetic.test', 'authenticated',
  'authenticated', now());
 INSERT INTO private.purchase_orders(id, support_reference, owner_principal, user_id, offer_id, release_id, snapshot, attempt_state,
  session_id, idempotency_key, version)
 SELECT v_id, 'MCH-R' || p_n, v_user, v_user, offer_id, release_id, snapshot, p_state, 'cs_test_rec_' || p_n, 'rec-' || p_n, 1
 FROM private.purchase_orders WHERE id = 'f3000000-0000-4000-8000-000000000001';
 IF p_paid THEN
  INSERT INTO private.provider_payments(order_id, provider_account_id, provider_mode, payment_intent_id, charge_id, status,
   captured_amount, currency, paid_at)
  VALUES (v_id, 'acct_support_test', 'test', 'pi_rec_' || p_n, 'ch_rec_' || p_n, 'succeeded', 1500, 'usd', '2026-10-01T10:00:00Z');
  INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, valid_from)
  VALUES (v_user, 'f3000000-0000-4000-8000-000000000004', 'stripe_purchase', v_id::text, true, '2026-10-01T10:00:00Z');
  PERFORM private.project_user_entitlement(v_user, 'f3000000-0000-4000-8000-000000000004');
 END IF;
 RETURN v_id;
END $$;
CREATE FUNCTION pg_temp.user_of(p_n int) RETURNS uuid LANGUAGE sql AS $$
 SELECT ('f3000000-0000-4000-8000-0000000008' || lpad(p_n::text, 2, '0'))::uuid
$$;
CREATE FUNCTION pg_temp.order_of(p_n int) RETURNS uuid LANGUAGE sql AS $$
 SELECT ('f3000000-0000-4000-8000-0000000007' || lpad(p_n::text, 2, '0'))::uuid
$$;
CREATE FUNCTION pg_temp.facts(p_n int, p_refunds jsonb DEFAULT '[]', p_disputes jsonb DEFAULT '[]', p_state text DEFAULT 'paid',
  p_currency text DEFAULT 'usd', p_intent text DEFAULT NULL) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('accountId','acct_support_test','mode','test','sessionId','cs_test_rec_' || p_n,
   'paymentIntentId',coalesce(p_intent, 'pi_rec_' || p_n),'chargeId','ch_rec_' || p_n,'capturedMinor',1500,'currency',p_currency,
   'paymentState',p_state,'paidAt',CASE WHEN p_state = 'paid' THEN '2026-10-01T10:00:00Z' END,'refunds',p_refunds,'disputes',p_disputes)
$$;
CREATE FUNCTION pg_temp.refund(p_id text, p_n int, p_amount int, p_status text) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('id',p_id,'paymentIntentId','pi_rec_' || p_n,'chargeId','ch_rec_' || p_n,'amountMinor',p_amount,
   'currency','usd','status',p_status,'occurredAt','2026-10-02T10:00:00Z')
$$;
CREATE FUNCTION pg_temp.dispute(p_id text, p_n int, p_status text, p_class text) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('id',p_id,'paymentIntentId','pi_rec_' || p_n,'chargeId','ch_rec_' || p_n,'amountMinor',1500,
   'currency','usd','status',p_status,'classification',p_class,'deadline',NULL)
$$;
-- A webhook check of one order, claimed and recorded by this test login as the registered verifier.
CREATE FUNCTION pg_temp.observe(p_order uuid, p_facts jsonb, p_complete boolean DEFAULT true, p_blockers jsonb DEFAULT '[]')
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_job uuid := private.commerce_verification_request(p_order, 'webhook'); v_claim jsonb;
BEGIN
 v_claim := private.commerce_verification_claim(v_job);
 RETURN (private.commerce_observation_record(v_job, (v_claim->>'fence')::bigint, p_facts, p_complete, p_blockers, 'test')
  ->>'observationId')::uuid;
END $$;
CREATE FUNCTION pg_temp.apply(p_observation uuid, p_operation uuid DEFAULT gen_random_uuid()) RETURNS jsonb LANGUAGE sql AS $$
 SELECT private.commerce_reconcile_system(p_observation, p_operation, NULL)
$$;
CREATE FUNCTION pg_temp.eligible(p_order uuid) RETURNS boolean LANGUAGE sql AS $$
 SELECT is_eligible FROM private.access_sources WHERE source_kind = 'stripe_purchase' AND source_id = p_order::text
$$;
CREATE FUNCTION pg_temp.has_access(p_n int) RETURNS boolean LANGUAGE sql AS $$
 SELECT private.collection_has_access(pg_temp.user_of(p_n), 'f3000000-0000-4000-8000-000000000003')
$$;
CREATE TEMP TABLE goodwill_before AS SELECT count(*) n FROM private.access_sources WHERE source_kind IN ('support_grant','promotional');
SELECT private.commerce_verifier_register(session_user::text, 'Test verifier', '92000000-0000-0000-0000-000000000001');

-- Only registered entry points reach the shared writer.
SELECT is(has_function_privilege('authenticated', 'private.commerce_reconcile_core(jsonb,uuid,uuid)', 'EXECUTE'), false,
  'browsers cannot reach the shared writer');
SELECT is(has_function_privilege('mch_commerce_verifier', 'private.commerce_reconcile_core(jsonb,uuid,uuid)', 'EXECUTE'), false,
  'nor can the verifier group call it directly');
SELECT is(has_function_privilege('mch_commerce_verifier', 'private.commerce_reconcile_system(uuid,uuid,text)', 'EXECUTE'), true,
  'the verifier group applies automated evidence through the system entry point');

-- The older procedures, guarded. Order ...001 has a 15.00 payment and a 1.00 refund.
INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, valid_from)
VALUES ('f3000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000004', 'stripe_purchase',
  'f3000000-0000-4000-8000-000000000001', true, '2026-10-01T10:00:00Z');
SELECT private.record_refund_and_recompute_access('f3000000-0000-4000-8000-000000000001', 're_support_rest',
  'f3000000-0000-4000-8000-000000000031', 1400, 'USD', 'succeeded', 'requested_by_customer', now());
SELECT is((SELECT ineligibility_reason FROM private.access_sources WHERE source_kind='stripe_purchase'
  AND source_id='f3000000-0000-4000-8000-000000000001'), 'fully_refunded', 'refunds covering the payment exclude the source');
SELECT private.record_payment_and_grant_access('f3000000-0000-4000-8000-000000000001', 'acct_support_test', 'test', 'pi_support',
  'ch_support', 1500, 'usd', now());
SELECT is((SELECT is_eligible FROM private.access_sources
  WHERE source_kind='stripe_purchase' AND source_id='f3000000-0000-4000-8000-000000000001'),
  false,'a later success replay cannot reactivate a fully refunded purchase source');
SELECT throws_ok($$SELECT private.record_refund_and_recompute_access('f3000000-0000-4000-8000-000000000012', 're_support_wrong',
  'f3000000-0000-4000-8000-000000000031', 100, 'usd', 'succeeded', 'requested_by_customer', now())$$, '23514', 'COMMERCE_BINDING_MISMATCH',
  'a refund cannot be recorded against another order''s payment');
SELECT is((SELECT array_agg(to_status ORDER BY recorded_at) FROM private.commerce_adjustment_history
  WHERE kind = 'refund' AND provider_id = 're_support_rest'), ARRAY['succeeded'], 'every recorded refund status is kept in history');
SELECT throws_ok($$UPDATE private.payment_refunds SET amount = 50 WHERE provider_refund_id = 're_support_1'$$, '23514',
  'COMMERCE_IDENTITY_CONFLICT', 'a recorded refund''s amount cannot change');
SELECT throws_ok($$INSERT INTO private.payment_refunds(provider_refund_id, order_id, payment_id, amount, currency, status, occurred_at)
  VALUES ('re_support_cross', 'f3000000-0000-4000-8000-000000000012', 'f3000000-0000-4000-8000-000000000031', 10, 'usd', 'succeeded', now())$$,
  '23503', NULL, 'a refund row must belong to its payment''s order');

-- Without an approved policy for the order's versions, bound facts are recorded and access is left alone.
SELECT pg_temp.new_order(1);
CREATE TEMP TABLE r1 AS SELECT pg_temp.apply(pg_temp.observe(pg_temp.order_of(1),
  pg_temp.facts(1, jsonb_build_array(pg_temp.refund('re_rec_1', 1, 1500, 'succeeded'))))) r;
SELECT is((SELECT r->>'state' FROM r1), 'blocked', 'without an approved policy the outcome is blocked');
SELECT is((SELECT r->'reasons' FROM r1), '["fully_refunded", "policy_missing"]'::jsonb, 'and says why');
SELECT ok(pg_temp.eligible(pg_temp.order_of(1)) AND EXISTS (SELECT 1 FROM private.payment_refunds WHERE provider_refund_id = 're_rec_1'),
  'the refund is recorded but the source is not changed');

INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
VALUES ('v1', 'v1', '{"id":"synthetic","approved":true,"version":"synthetic-v1","pendingRefund":"retain","partialRefund":"retain",
  "fullRefund":"ineligible","inquiry":"retain","formalOpen":"hold","formalLost":"ineligible","duration":"indefinite","fixedSeconds":null}',
  '92000000-0000-0000-0000-000000000001', 'Synthetic test mapping');

-- A full refund removes the purchase; the receipt, audit and notification say so; replays return the same receipt.
SELECT pg_temp.new_order(2);
CREATE TEMP TABLE r2 AS SELECT gen_random_uuid() op, pg_temp.observe(pg_temp.order_of(2),
  pg_temp.facts(2, jsonb_build_array(pg_temp.refund('re_rec_2', 2, 1500, 'succeeded')))) obs;
ALTER TABLE r2 ADD COLUMN r jsonb;
UPDATE r2 SET r = pg_temp.apply(obs, op);
SELECT is((SELECT r->>'state' FROM r2), 'applied', 'a full refund is applied');
SELECT is((SELECT (r->'effects'->0) - 'recipeIds' FROM r2), jsonb_build_object('sourceId', pg_temp.order_of(2), 'beforeEligible', true,
  'afterEligible', false, 'beforeEffective', 'active', 'afterEffective', 'denied', 'notification', 'none'),
  'the receipt names the source and its access before and after');
SELECT ok(NOT pg_temp.has_access(2) AND (SELECT ineligibility_reason FROM private.access_sources
  WHERE source_id = pg_temp.order_of(2)::text) = 'fully_refunded', 'the customer no longer has the collection');
SELECT ok(EXISTS (SELECT 1 FROM private.commerce_outbox WHERE idempotency_key = 'refund-confirmed-re_rec_2'),
  'the refund confirmation is queued once');
SELECT is((SELECT event_type FROM private.access_events WHERE id = (SELECT (r->>'auditId')::uuid FROM r2)), 'commerce_reconciled',
  'the receipt points to its audit event');
SELECT is((SELECT pg_temp.apply(obs, op) FROM r2), (SELECT r FROM r2), 'repeating the operation returns the same receipt');
CREATE TEMP TABLE r2b AS SELECT pg_temp.observe(pg_temp.order_of(2),
  pg_temp.facts(2, jsonb_build_array(pg_temp.refund('re_rec_2', 2, 1500, 'succeeded')))) obs;
SELECT throws_ok(format('SELECT pg_temp.apply(%L, %L)', (SELECT obs FROM r2b), (SELECT op FROM r2)), 'PT409', 'ADM_CONFLICT',
  'reusing an operation id for other evidence is a conflict');
SELECT throws_ok(format('SELECT pg_temp.apply(%L)', (SELECT obs FROM r2)), 'PT409', 'ADM_STALE',
  'an older answer cannot be applied once a newer one exists');
SELECT is((SELECT pg_temp.apply(obs) FROM r2b)->>'state', 'already_satisfied', 'the newer answer changes nothing further');
SELECT private.record_payment_and_grant_access(pg_temp.order_of(2), 'acct_support_test', 'test', 'pi_rec_2', 'ch_rec_2', 1500, 'usd', now());
SELECT is(pg_temp.eligible(pg_temp.order_of(2)), false, 'an old payment success replayed afterwards cannot restore access');

-- Partial, failed and pending refunds keep the purchase; a refund that later fails restores it.
SELECT pg_temp.new_order(3);
SELECT pg_temp.apply(pg_temp.observe(pg_temp.order_of(3), pg_temp.facts(3, jsonb_build_array(pg_temp.refund('re_rec_3', 3, 500, 'succeeded')))));
SELECT ok(pg_temp.eligible(pg_temp.order_of(3)) AND pg_temp.has_access(3), 'a partial refund keeps the purchase');
SELECT pg_temp.new_order(4);
SELECT pg_temp.apply(pg_temp.observe(pg_temp.order_of(4), pg_temp.facts(4, jsonb_build_array(pg_temp.refund('re_rec_4', 4, 1500, 'pending')))));
SELECT ok(pg_temp.eligible(pg_temp.order_of(4)), 'a pending full refund keeps the purchase');
SELECT pg_temp.apply(pg_temp.observe(pg_temp.order_of(4), pg_temp.facts(4, jsonb_build_array(pg_temp.refund('re_rec_4', 4, 1500, 'succeeded')))));
SELECT ok(NOT pg_temp.eligible(pg_temp.order_of(4)) AND NOT pg_temp.has_access(4), 'once it succeeds the purchase is removed');
SELECT pg_temp.apply(pg_temp.observe(pg_temp.order_of(4), pg_temp.facts(4, jsonb_build_array(pg_temp.refund('re_rec_4', 4, 1500, 'failed')))));
SELECT ok(pg_temp.eligible(pg_temp.order_of(4)) AND pg_temp.has_access(4), 'a refund that later fails restores the purchase');
SELECT is((SELECT array_agg(coalesce(from_status, '-') || '>' || to_status ORDER BY recorded_at) FROM private.commerce_adjustment_history
  WHERE kind = 'refund' AND provider_id = 're_rec_4'), ARRAY['->pending', 'pending>succeeded', 'succeeded>failed'],
  'each status change is appended, never overwritten');

-- Disputes: a formal dispute holds access until won; an inquiry does not; a lost dispute removes it.
SELECT pg_temp.new_order(6);
SELECT pg_temp.apply(pg_temp.observe(pg_temp.order_of(6), pg_temp.facts(6, '[]', jsonb_build_array(pg_temp.dispute('du_rec_6', 6, 'needs_response', 'formal')))));
SELECT ok(NOT pg_temp.has_access(6) AND (SELECT ineligibility_reason FROM private.access_sources WHERE source_id = pg_temp.order_of(6)::text)
  = 'dispute_hold', 'an open formal dispute holds access');
SELECT is((SELECT access_effect FROM private.payment_disputes WHERE provider_dispute_id = 'du_rec_6'), 'held', 'and is recorded as holding it');
SELECT pg_temp.apply(pg_temp.observe(pg_temp.order_of(6), pg_temp.facts(6, '[]', jsonb_build_array(pg_temp.dispute('du_rec_6', 6, 'won', 'formal')))));
SELECT ok(pg_temp.eligible(pg_temp.order_of(6)) AND pg_temp.has_access(6), 'a won dispute restores access');
SELECT pg_temp.new_order(7);
SELECT pg_temp.apply(pg_temp.observe(pg_temp.order_of(7), pg_temp.facts(7, '[]', jsonb_build_array(pg_temp.dispute('du_rec_7', 7, 'warning_needs_response', 'inquiry')))));
SELECT ok(pg_temp.has_access(7) AND (SELECT access_effect FROM private.payment_disputes WHERE provider_dispute_id = 'du_rec_7') = 'none',
  'an inquiry keeps access');
SELECT pg_temp.new_order(8);
SELECT pg_temp.apply(pg_temp.observe(pg_temp.order_of(8), pg_temp.facts(8, '[]', jsonb_build_array(pg_temp.dispute('du_rec_8', 8, 'lost', 'formal')))));
SELECT ok(NOT pg_temp.has_access(8) AND (SELECT access_effect FROM private.payment_disputes WHERE provider_dispute_id = 'du_rec_8') = 'revoked',
  'a lost dispute removes access');
SELECT private.record_payment_and_grant_access(pg_temp.order_of(8), 'acct_support_test', 'test', 'pi_rec_8', 'ch_rec_8', 1500, 'usd', now());
SELECT is((SELECT ineligibility_reason FROM private.access_sources WHERE source_id = pg_temp.order_of(8)::text), 'dispute_lost',
  'a replayed success does not clear a lost dispute');

-- A closed account: nothing is created for it.
SELECT pg_temp.new_order(9);
DELETE FROM auth.users WHERE id = pg_temp.user_of(9);
SELECT is(pg_temp.apply(pg_temp.observe(pg_temp.order_of(9), pg_temp.facts(9)))->>'state', 'already_satisfied',
  'a closed account''s order is reconciled without effects');
SELECT is((SELECT count(*)::int FROM private.access_sources WHERE source_id = pg_temp.order_of(9)::text), 0,
  'and no purchase source is created for it');

-- Other sources are never touched: an app purchase keeps the collection after the web purchase is refunded.
SELECT pg_temp.new_order(10);
INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, valid_from)
VALUES (pg_temp.user_of(10), 'f3000000-0000-4000-8000-000000000004', 'native_legacy', 'app-receipt-10', true, '2026-09-01T10:00:00Z');
CREATE TEMP TABLE r10 AS SELECT pg_temp.apply(pg_temp.observe(pg_temp.order_of(10),
  pg_temp.facts(10, jsonb_build_array(pg_temp.refund('re_rec_10', 10, 1500, 'succeeded'))))) r;
SELECT is((SELECT r->'effects'->0->>'afterEffective' FROM r10), 'active', 'with another source the customer keeps access');
SELECT ok(NOT pg_temp.eligible(pg_temp.order_of(10)) AND (SELECT is_eligible FROM private.access_sources WHERE source_id = 'app-receipt-10'),
  'only the refunded purchase changes; the app purchase is untouched');

-- Conflicting or mismatched evidence changes nothing.
SELECT pg_temp.new_order(11);
CREATE TEMP TABLE r11 AS SELECT pg_temp.apply(pg_temp.observe(pg_temp.order_of(11),
  pg_temp.facts(11, jsonb_build_array(pg_temp.refund('re_rec_11', 11, 1500, 'succeeded')), '[]', 'paid', 'eur'))) r;
SELECT ok((SELECT r->>'state' = 'blocked' AND r->'reasons' ? 'payment_conflict' FROM r11)
  AND NOT EXISTS (SELECT 1 FROM private.payment_refunds WHERE provider_refund_id = 're_rec_11') AND pg_temp.eligible(pg_temp.order_of(11)),
  'a different currency blocks and records nothing');
SELECT pg_temp.new_order(12);
CREATE TEMP TABLE r12 AS SELECT pg_temp.apply(pg_temp.observe(pg_temp.order_of(12),
  pg_temp.facts(12, jsonb_build_array(pg_temp.refund('re_support_1', 12, 1500, 'succeeded'))))) r;
SELECT ok((SELECT r->'reasons' ? 'refund_conflict' FROM r12) AND pg_temp.eligible(pg_temp.order_of(12))
  AND (SELECT order_id FROM private.payment_refunds WHERE provider_refund_id = 're_support_1') = 'f3000000-0000-4000-8000-000000000001',
  'a refund id recorded for another order is never relinked');
SELECT pg_temp.new_order(13);
SELECT is(pg_temp.apply(pg_temp.observe(pg_temp.order_of(13), pg_temp.facts(13, '[]', '[]', 'paid', 'usd', 'pi_support')))->'reasons',
  '["payment_conflict"]'::jsonb, 'a payment recorded for another order blocks');
SELECT pg_temp.new_order(16);
SELECT is(pg_temp.apply(pg_temp.observe(pg_temp.order_of(16), pg_temp.facts(16), false, '["refunds_incomplete"]'))->'reasons',
  '["observation_incomplete"]'::jsonb, 'an incomplete answer is never applied');

-- A payment first seen through reconciliation is recorded, granted and confirmed; a failed one grants nothing.
SELECT pg_temp.new_order(14, 'processing', false);
CREATE TEMP TABLE r14 AS SELECT pg_temp.apply(pg_temp.observe(pg_temp.order_of(14), pg_temp.facts(14))) r;
SELECT is((SELECT r->'effects'->0->>'notification' FROM r14), 'none', 'no confirmation is claimed while delivery is off');
SELECT ok(pg_temp.has_access(14) AND (SELECT attempt_state FROM private.purchase_orders WHERE id = pg_temp.order_of(14)) = 'closed'
  AND EXISTS (SELECT 1 FROM private.commerce_outbox WHERE idempotency_key = 'order-paid-' || pg_temp.order_of(14)),
  'grants access, closes the checkout and queues the confirmation');
UPDATE private.commerce_settings SET purchase_confirmation_delivery = true;
SELECT pg_temp.new_order(19, 'processing', false);
SELECT is(pg_temp.apply(pg_temp.observe(pg_temp.order_of(19), pg_temp.facts(19)))->'effects'->0->>'notification', 'purchase_confirmation',
  'with delivery approved, a newly seen payment confirms the purchase');
SELECT pg_temp.new_order(20, 'processing', false);
INSERT INTO private.commerce_outbox(idempotency_key, order_id, event_kind, payload)
VALUES ('order-paid-' || pg_temp.order_of(20), pg_temp.order_of(20), 'purchase_confirmed', '{}');
SELECT is(pg_temp.apply(pg_temp.observe(pg_temp.order_of(20), pg_temp.facts(20)))->'effects'->0->>'notification', 'none',
  'a confirmation already queued is never sent again');
UPDATE private.commerce_settings SET purchase_confirmation_delivery = false;
SELECT pg_temp.new_order(15, 'processing', false);
SELECT is(pg_temp.apply(pg_temp.observe(pg_temp.order_of(15), pg_temp.facts(15, '[]', '[]', 'failed')))->>'state', 'already_satisfied',
  'a failed payment changes nothing');
SELECT is((SELECT count(*)::int FROM private.access_sources WHERE source_id = pg_temp.order_of(15)::text), 0, 'and creates no source');

-- Evidence about an order that has since changed, or gathered for staff diagnosis, is not applied by the system.
SELECT pg_temp.new_order(17);
CREATE TEMP TABLE r17 AS SELECT pg_temp.observe(pg_temp.order_of(17), pg_temp.facts(17)) obs;
UPDATE private.purchase_orders SET version = version + 1 WHERE id = pg_temp.order_of(17);
SELECT throws_ok(format('SELECT pg_temp.apply(%L)', (SELECT obs FROM r17)), 'PT409', 'ADM_STALE', 'an order that changed since the check is stale');
SELECT pg_temp.new_order(18);
INSERT INTO private.commerce_verification_jobs(id, order_id, purpose, requested_by, expected_order_version)
VALUES ('f3000000-0000-4000-8000-000000000918', pg_temp.order_of(18), 'diagnosis', 'f3000000-0000-4000-8000-0000000000a2', 1);
CREATE TEMP TABLE r18 AS SELECT (private.commerce_observation_record('f3000000-0000-4000-8000-000000000918',
  (private.commerce_verification_claim('f3000000-0000-4000-8000-000000000918')->>'fence')::bigint, pg_temp.facts(18), true, '[]', 'test')
  ->>'observationId')::uuid obs;
SELECT throws_ok(format('SELECT pg_temp.apply(%L)', (SELECT obs FROM r18)), '42501', 'ADM_DENIED',
  'a staff diagnosis is never applied by the system');
SELECT throws_ok(format($$SELECT private.commerce_reconcile_core('{"actor":"human","actorId":null,"approvalId":null,"eventId":null,
  "fence":1,"orderId":"%s","purpose":"diagnosis"}', %L, gen_random_uuid())$$, pg_temp.order_of(18), (SELECT obs FROM r18)), '22023',
  'ADM_INVALID', 'a human run must name its approver and approval');

SELECT is((SELECT count(*) FROM private.access_sources WHERE source_kind IN ('support_grant','promotional')), (SELECT n FROM goodwill_before),
  'reconciliation never creates goodwill or promotional access');
SELECT private.commerce_verifier_revoke(session_user::text);
SELECT throws_ok(format('SELECT private.commerce_verification_request(%L, ''webhook'')', pg_temp.order_of(3)), '42501', 'ADM_DENIED',
  'a revoked verifier login cannot ask for checks');

SELECT * FROM finish();
ROLLBACK;
