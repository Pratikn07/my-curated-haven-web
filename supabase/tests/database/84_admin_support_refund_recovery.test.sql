BEGIN;
SELECT plan(17);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

-- Refund recovery after the world changes under a sent refund: the owner revoked, support switched off, a claim run
-- out, old evidence minimised. Answers are still captured; nothing new can be sent; nothing stale can release money.
CREATE FUNCTION pg_temp.owner(p_sql text) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as('92000000-0000-0000-0000-000000000001', 'aal2', p_sql)
$$;
CREATE FUNCTION pg_temp.fact(p_id text, p_amount int) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('id', p_id, 'paymentIntentId', 'pi_support', 'chargeId', 'ch_support', 'amountMinor', p_amount, 'currency', 'usd',
  'status', 'succeeded', 'occurredAt', '2026-10-10T10:00:00Z')
$$;
CREATE FUNCTION pg_temp.facts(p_refunds jsonb DEFAULT '[]') RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('accountId','acct_support_test','mode','test','sessionId','cs_test_support','paymentIntentId','pi_support',
   'chargeId','ch_support','capturedMinor',1500,'currency','usd','paymentState','paid','paidAt','2026-10-01T10:00:00Z',
   'refunds', jsonb_build_array(pg_temp.fact('re_support_1', 100)) || p_refunds, 'disputes', '[]'::jsonb)
$$;
CREATE FUNCTION pg_temp.record(p_job uuid, p_facts jsonb) RETURNS uuid LANGUAGE sql AS $$
 SELECT (private.commerce_observation_record(p_job, (private.commerce_verification_claim(p_job)->>'fence')::bigint, p_facts, true, '[]',
  'test')->>'observationId')::uuid
$$;
-- Prepare, approve, reserve and claim one partial refund; returns {c: command, k: claim}.
CREATE FUNCTION pg_temp.sent(p_amount int, p_facts jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE v_obs uuid; p jsonb; c jsonb;
BEGIN
 DELETE FROM private.support_rate_buckets;
 v_obs := pg_temp.record((pg_temp.owner(format('SELECT public.admin_support_refund_check_begin(%L, %L)', 'f3000000-0000-4000-8000-000000000001',
  gen_random_uuid()))->>'jobId')::uuid, p_facts);
 p := pg_temp.owner(format('SELECT public.admin_support_refund_prepare(%L, %L)', jsonb_build_object('orderId', 'f3000000-0000-4000-8000-000000000001',
  'caseId', NULL, 'amount', jsonb_build_object('kind', 'partial', 'amountMinor', p_amount), 'providerReason', 'requested_by_customer',
  'exceptionCategory', 'billing_error', 'internalReason', 'Charged in error', 'operationId', gen_random_uuid()), v_obs));
 PERFORM pg_temp.owner(format('SELECT public.admin_support_refund_approve(%L, %L)', p->>'id', p->>'digest'));
 c := jsonb_build_object('operationId', gen_random_uuid(), 'proposalId', p->>'id', 'expectedDigest', p->>'digest', 'caseId', NULL);
 PERFORM pg_temp.owner(format('SELECT public.admin_support_refund_reserve(%L)', c));
 v_obs := pg_temp.record((pg_temp.owner(format('SELECT public.admin_support_refund_dispatch_check(%L)', c->>'operationId'))->>'jobId')::uuid, p_facts);
 RETURN jsonb_build_object('c', c, 'k', pg_temp.owner(format('SELECT public.admin_support_refund_dispatch_claim(%L, %L)', c, v_obs)));
END $$;
CREATE FUNCTION pg_temp.op(s jsonb) RETURNS uuid LANGUAGE sql AS $$ SELECT (s->'c'->>'operationId')::uuid $$;
CREATE FUNCTION pg_temp.fence(s jsonb) RETURNS bigint LANGUAGE sql AS $$ SELECT (s->'k'->>'fence')::bigint $$;
CREATE FUNCTION pg_temp.answer(s jsonb, p_fence bigint, p_result jsonb) RETURNS jsonb LANGUAGE sql AS $$
 SELECT private.support_refund_result_record(pg_temp.op(s), p_fence, p_result)
$$;
SELECT private.commerce_verifier_register(session_user::text, 'Test verifier', '92000000-0000-0000-0000-000000000001');
INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
VALUES ('v1', 'v1', '{"id":"synthetic","approved":true,"version":"synthetic-v1","pendingRefund":"retain","partialRefund":"retain",
  "fullRefund":"ineligible","inquiry":"retain","formalOpen":"hold","formalLost":"ineligible","duration":"indefinite","fixedSeconds":null}',
  '92000000-0000-0000-0000-000000000001', 'Synthetic test mapping');
UPDATE private.support_workspace_settings SET stage = 'repair', refund_submission_enabled = true;

-- The owner is revoked while a refund is in flight: Stripe's answer is still recorded and applied; the owner can do nothing more.
CREATE TEMP TABLE a AS SELECT pg_temp.sent(400, pg_temp.facts()) s;
-- As after an ownership transfer; the owner guard is paused only inside this rolled-back test.
SET LOCAL session_replication_role = replica;
UPDATE private.admin_memberships SET active = false WHERE user_id = '92000000-0000-0000-0000-000000000001';
SET LOCAL session_replication_role = origin;
SELECT is((SELECT pg_temp.answer(s, pg_temp.fence(s), jsonb_build_object('kind', 'known', 'fact', pg_temp.fact('re_a', 400)))->>'state' FROM a),
  'submitted', 'a refund sent before the owner was revoked is still recorded');
SELECT is((SELECT private.support_refund_reconciled(pg_temp.op(s), true)->>'reconciliation' FROM a), 'applied', 'and reconciled');
SELECT throws_ok(format('SELECT pg_temp.owner(%L)', format('SELECT public.admin_support_refund_operation(%L)', (SELECT pg_temp.op(s) FROM a))),
  '42501', NULL, 'the revoked owner can no longer read it');
SELECT throws_ok(format('SELECT pg_temp.owner(%L)', format('SELECT public.admin_support_refund_reserve(%L)', (SELECT s->'c' FROM a))),
  '42501', NULL, 'or send anything');
SET LOCAL session_replication_role = replica;
UPDATE private.admin_memberships SET active = true WHERE user_id = '92000000-0000-0000-0000-000000000001';
SET LOCAL session_replication_role = origin;

-- Support is switched off while a refund is in flight: answers and recovery still work; sending does not.
CREATE TEMP TABLE b AS SELECT pg_temp.sent(200, pg_temp.facts(jsonb_build_array(pg_temp.fact('re_a', 400)))) s;
UPDATE private.support_workspace_settings SET stage = 'disabled';
SELECT is((SELECT pg_temp.answer(s, pg_temp.fence(s), '{"kind":"unknown","code":"PROVIDER_OUTCOME_UNKNOWN"}')->>'state' FROM b),
  'outcome_unknown', 'an answer arriving after support was switched off is recorded');
SELECT is((SELECT private.support_refund_recovery_target(pg_temp.op(s))->>'chargeId' FROM b), 'ch_support', 'and recovery can still read the charge');
SELECT throws_ok(format('SELECT pg_temp.owner(%L)', format('SELECT public.admin_support_refund_reserve(%L)', (SELECT s->'c' FROM b))),
  '42501', 'ADM_DISABLED', 'nothing can be sent while support is off');
SELECT is((SELECT pg_temp.answer(s, 0, jsonb_build_object('kind', 'known', 'fact', pg_temp.fact('re_b', 200)))->>'state' FROM b),
  'submitted', 'a refund found later is recorded while support is off');
UPDATE private.support_workspace_settings SET stage = 'repair';

-- A claim that ran out: a delayed answer from it can report a refund that exists, but never "unknown" or "not made".
CREATE TEMP TABLE c AS SELECT pg_temp.sent(100, pg_temp.facts(jsonb_build_array(pg_temp.fact('re_a', 400), pg_temp.fact('re_b', 200)))) s;
UPDATE private.support_refund_intents SET claim_until = clock_timestamp() - interval '1 second' WHERE operation_id = (SELECT pg_temp.op(s) FROM c);
SELECT is((SELECT private.support_refund_expire_claim(pg_temp.op(s))->>'state' FROM c), 'outcome_unknown', 'the run-out claim becomes unknown');
SELECT throws_ok(format('SELECT pg_temp.answer(%L, %s, %L)', (SELECT s FROM c), (SELECT pg_temp.fence(s) FROM c),
  '{"kind":"not_executed","code":"AMOUNT_TOO_LARGE"}'), 'PT409', 'ADM_STALE', 'a delayed "not made" from the old claim cannot release the money');
SELECT throws_ok(format('SELECT pg_temp.answer(%L, %s, %L)', (SELECT s FROM c), (SELECT pg_temp.fence(s) FROM c),
  '{"kind":"unknown","code":"PROVIDER_OUTCOME_UNKNOWN"}'), 'PT409', 'ADM_STALE', 'nor report unknown again');
SELECT is((SELECT jsonb_build_array(state, reserved) FROM private.support_refund_intents WHERE operation_id = (SELECT pg_temp.op(s) FROM c)),
  '["outcome_unknown", true]'::jsonb, 'so the amount stays reserved');
SELECT is(pg_temp.owner('SELECT public.admin_support_metrics(''test'')')->'unresolvedRefunds'->'count', '1'::jsonb,
  'and the metrics count it as an unresolved refund');
SELECT is((SELECT pg_temp.answer(s, pg_temp.fence(s), jsonb_build_object('kind', 'known', 'fact', pg_temp.fact('re_c', 100)))->>'providerRefundId' FROM c),
  're_c', 'but the refund it made is captured');

-- Retention minimises old evidence without touching what a refund needs to be read or recovered.
UPDATE private.support_workspace_settings SET note_retention_days = 365, observation_retention_days = 30;
SET LOCAL session_replication_role = replica;
UPDATE private.commerce_provider_observations SET verified_at = verified_at - interval '31 days' WHERE order_id = 'f3000000-0000-4000-8000-000000000001';
SET LOCAL session_replication_role = origin;
SELECT ok((pg_temp.owner('SELECT public.admin_support_retention_run(gen_random_uuid())')->>'observationsMinimised')::int > 0,
  'retention minimises the old refund checks');
SELECT is((SELECT jsonb_build_array(t->>'chargeId', (t->>'amountMinor')::int) FROM b, private.support_refund_recovery_target(pg_temp.op(s)) t),
  '["ch_support", 200]'::jsonb, 'a refund can still be recovered from its frozen request');
SELECT is((SELECT pg_temp.owner(format('SELECT public.admin_support_refund_operation(%L)', pg_temp.op(s)))->>'providerRefundId' FROM b),
  're_b', 'and its receipt is still readable');

SELECT * FROM finish();
ROLLBACK;
