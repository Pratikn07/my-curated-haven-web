BEGIN;
SELECT plan(26);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

-- The owner (92...01) refunds; this test login is the registered verifier that reads requests and records answers.
CREATE FUNCTION pg_temp.owner(p_sql text) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as('92000000-0000-0000-0000-000000000001', 'aal2', p_sql)
$$;
CREATE FUNCTION pg_temp.facts(p_refunds jsonb DEFAULT '[]') RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('accountId','acct_support_test','mode','test','sessionId','cs_test_support','paymentIntentId','pi_support',
   'chargeId','ch_support','capturedMinor',1500,'currency','usd','paymentState','paid','paidAt','2026-10-01T10:00:00Z',
   'refunds',jsonb_build_array(jsonb_build_object('id','re_support_1','paymentIntentId','pi_support','chargeId','ch_support',
     'amountMinor',100,'currency','usd','status','succeeded','occurredAt','2026-10-02T10:00:00Z')) || p_refunds,'disputes','[]'::jsonb)
$$;
CREATE FUNCTION pg_temp.record(p_job uuid, p_facts jsonb) RETURNS uuid LANGUAGE sql AS $$
 SELECT (private.commerce_observation_record(p_job, (private.commerce_verification_claim(p_job)->>'fence')::bigint, p_facts, true, '[]',
  'test')->>'observationId')::uuid
$$;
-- Prepare, approve and reserve a partial refund; returns the reservation command.
CREATE FUNCTION pg_temp.reserved(p_amount int, p_facts jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
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
 RETURN c;
END $$;
-- The owner's fresh dispatch check, recorded with the given facts.
CREATE FUNCTION pg_temp.dispatch_check(c jsonb, p_facts jsonb) RETURNS uuid LANGUAGE sql AS $$
 SELECT pg_temp.record((pg_temp.owner(format('SELECT public.admin_support_refund_dispatch_check(%L)', c->>'operationId'))->>'jobId')::uuid, p_facts)
$$;
CREATE FUNCTION pg_temp.claim(c jsonb, p_obs uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.owner(format('SELECT public.admin_support_refund_dispatch_claim(%L, %L)', c, p_obs))
$$;
CREATE FUNCTION pg_temp.intent(c jsonb) RETURNS private.support_refund_intents LANGUAGE sql AS $$
 SELECT * FROM private.support_refund_intents WHERE operation_id = (c->>'operationId')::uuid
$$;
CREATE FUNCTION pg_temp.fact(p_id text, p_amount int, p_status text DEFAULT 'succeeded') RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('id', p_id, 'paymentIntentId', 'pi_support', 'chargeId', 'ch_support', 'amountMinor', p_amount, 'currency', 'usd',
  'status', p_status, 'occurredAt', '2026-10-10T10:00:00Z')
$$;
SELECT private.commerce_verifier_register(session_user::text, 'Test verifier', '92000000-0000-0000-0000-000000000001');
INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
VALUES ('v1', 'v1', '{"id":"synthetic","approved":true,"version":"synthetic-v1","pendingRefund":"retain","partialRefund":"retain",
  "fullRefund":"ineligible","inquiry":"retain","formalOpen":"hold","formalLost":"ineligible","duration":"indefinite","fixedSeconds":null}',
  '92000000-0000-0000-0000-000000000001', 'Synthetic test mapping');
UPDATE private.support_workspace_settings SET stage = 'repair', refund_submission_enabled = true;
CREATE TEMP TABLE a AS SELECT pg_temp.reserved(400, pg_temp.facts()) c;
UPDATE private.support_workspace_settings SET refund_submission_enabled = false;

-- Dispatch needs the refund switch, an owner dispatch check, and evidence identical to what was approved.
SELECT throws_ok(format('SELECT pg_temp.claim(%L, %L)', (SELECT c FROM a), pg_temp.dispatch_check((SELECT c FROM a), pg_temp.facts())),
  '42501', 'ADM_DISABLED', 'nothing is sent while the refund switch is off');
UPDATE private.support_workspace_settings SET refund_submission_enabled = true;
SELECT throws_ok(format('SELECT pg_temp.claim(%L, %L)', (SELECT c FROM a), (SELECT observation_id FROM private.support_refund_proposals
  WHERE id = (SELECT (c->>'proposalId')::uuid FROM a))), '22023', 'ADM_INVALID', 'the preparation check cannot stand in for a dispatch check');
SELECT throws_ok(format('SELECT pg_temp.claim(%L, %L)', (SELECT c FROM a), pg_temp.dispatch_check((SELECT c FROM a),
  pg_temp.facts(jsonb_build_array(pg_temp.fact('re_elsewhere', 50))))), 'PT409', 'ADM_STALE', 'a refund made elsewhere since approval stops the dispatch');
CREATE TEMP TABLE k AS SELECT pg_temp.claim((SELECT c FROM a), pg_temp.dispatch_check((SELECT c FROM a), pg_temp.facts())) k;
SELECT ok((SELECT (k->>'fence')::bigint > 0 AND (k->>'expiresAt')::timestamptz <= clock_timestamp() + interval '10 seconds' FROM k),
  'the claim is fenced and lasts ten seconds at most');
SELECT ok((SELECT state = 'dispatching' AND attempts = 1 AND retry_until = first_dispatched_at + interval '23 hours'
  FROM pg_temp.intent((SELECT c FROM a))), 'the dispatch and its 23-hour recovery window are written before anything is sent');
SELECT throws_ok(format('SELECT pg_temp.claim(%L, %L)', (SELECT c FROM a), (SELECT gen_random_uuid())), 'PT409', 'ADM_CONFLICT',
  'a refund is dispatched once');

-- The verifier reads the frozen request under the claim only.
SELECT is(has_function_privilege('authenticated', 'private.support_refund_dispatch_payload(uuid,bigint)', 'EXECUTE'), false,
  'browsers cannot read the request');
SELECT throws_ok(format('SELECT private.support_refund_dispatch_payload(%L, %s)', (SELECT c->>'operationId' FROM a), (SELECT (k->>'fence')::bigint - 1 FROM k)),
  'PT409', 'ADM_STALE', 'an old fence cannot read it');
SELECT is((SELECT jsonb_build_array(x->>'chargeId', (x->>'amountMinor')::int, x->>'providerReason', x->>'providerKey') FROM
  (SELECT private.support_refund_dispatch_payload((SELECT (c->>'operationId')::uuid FROM a), (SELECT (k->>'fence')::bigint FROM k)) x) y),
  jsonb_build_array('ch_support', 400, 'requested_by_customer', 'mch-support-refund-' || (SELECT c->>'operationId' FROM a)),
  'the request is exactly the approved charge, amount, reason and idempotency key');

-- An answer that never came back is unknown and keeps the money reserved; an ordinary retry only reads.
SELECT throws_ok(format('SELECT private.support_refund_result_record(%L, %s, %L)', (SELECT c->>'operationId' FROM a), (SELECT (k->>'fence')::bigint - 1 FROM k),
  '{"kind":"unknown","code":"PROVIDER_OUTCOME_UNKNOWN"}'), 'PT409', 'ADM_STALE', 'only the current claim can report an unknown answer');
SELECT is((SELECT r->>'state' FROM (SELECT private.support_refund_result_record((SELECT (c->>'operationId')::uuid FROM a), (SELECT (k->>'fence')::bigint FROM k),
  '{"kind":"unknown","code":"PROVIDER_OUTCOME_UNKNOWN"}') r) x), 'outcome_unknown', 'a lost answer is recorded as unknown');
SELECT is((SELECT reserved FROM pg_temp.intent((SELECT c FROM a))), true, 'and the amount stays reserved');
SELECT is((private.support_refund_capacity(pg_temp.facts())->>'reservedMinor')::int, 400, 'capacity still counts it');
SELECT is(pg_temp.owner(format('SELECT public.admin_support_refund_reserve(%L)', (SELECT c FROM a)))->>'state', 'outcome_unknown',
  'repeating the command returns the unknown outcome');
SELECT throws_ok(format('SELECT pg_temp.claim(%L, %L)', (SELECT c FROM a), (SELECT gen_random_uuid())), 'PT409', 'ADM_CONFLICT',
  'and can never send it again');

-- Recovery: a refund strongly bound to this operation is kept even after its claim; anything else is refused.
SELECT is(private.support_refund_recovery_target((SELECT (c->>'operationId')::uuid FROM a))->>'chargeId', 'ch_support', 'recovery reads the bound charge');
SELECT throws_ok(format('SELECT private.support_refund_result_record(%L, 0, %L)', (SELECT c->>'operationId' FROM a),
  jsonb_build_object('kind', 'known', 'fact', pg_temp.fact('re_found', 399))), '22023', 'ADM_INVALID', 'a refund with another amount is not this one');
CREATE TEMP TABLE found AS SELECT private.support_refund_result_record((SELECT (c->>'operationId')::uuid FROM a), 0,
  jsonb_build_object('kind', 'known', 'fact', pg_temp.fact('re_found', 400))) r;
SELECT is((SELECT jsonb_build_array(r->>'state', r->>'providerRefundId', r->>'providerStatus', r->>'reconciliation') FROM found),
  '["submitted", "re_found", "succeeded", "pending"]'::jsonb, 'a late but exact provider refund is recorded');
SELECT throws_ok(format('SELECT private.support_refund_result_record(%L, 0, %L)', (SELECT c->>'operationId' FROM a),
  jsonb_build_object('kind', 'known', 'fact', pg_temp.fact('re_other', 400))), 'PT409', 'ADM_CONFLICT', 'a second provider refund cannot replace it');
SELECT is(private.support_refund_reconciled((SELECT (c->>'operationId')::uuid FROM a), true)->>'reconciliation', 'applied',
  'access reconciliation is recorded separately');
SELECT is(private.support_refund_capacity(pg_temp.facts(jsonb_build_array(pg_temp.fact('re_found', 400)))) - 'blockers' - 'capturedMinor',
  '{"pendingMinor": 0, "reservedMinor": 0, "availableMinor": 1000, "successfulMinor": 500}'::jsonb,
  'once visible at the provider the refund is counted once');

-- A request the provider refused releases the reservation; an expired claim without an answer becomes unknown.
CREATE TEMP TABLE b AS SELECT pg_temp.reserved(200, pg_temp.facts(jsonb_build_array(pg_temp.fact('re_found', 400)))) c;
CREATE TEMP TABLE kb AS SELECT pg_temp.claim((SELECT c FROM b), pg_temp.dispatch_check((SELECT c FROM b), pg_temp.facts(jsonb_build_array(pg_temp.fact('re_found', 400))))) k;
SELECT is((SELECT r->>'state' FROM (SELECT private.support_refund_result_record((SELECT (c->>'operationId')::uuid FROM b), (SELECT (k->>'fence')::bigint FROM kb),
  '{"kind":"not_executed","code":"AMOUNT_TOO_LARGE"}') r) x), 'rejected', 'a refused request is recorded as not made');
SELECT is((SELECT reserved FROM pg_temp.intent((SELECT c FROM b))), false, 'and holds nothing back');
CREATE TEMP TABLE cc AS SELECT pg_temp.reserved(100, pg_temp.facts(jsonb_build_array(pg_temp.fact('re_found', 400)))) c;
SELECT pg_temp.claim((SELECT c FROM cc), pg_temp.dispatch_check((SELECT c FROM cc), pg_temp.facts(jsonb_build_array(pg_temp.fact('re_found', 400)))));
UPDATE private.support_refund_intents SET claim_until = clock_timestamp() - interval '1 second' WHERE operation_id = (SELECT (c->>'operationId')::uuid FROM cc);
SELECT is(private.support_refund_expire_claim((SELECT (c->>'operationId')::uuid FROM cc))->>'reasonCode', 'CLAIM_EXPIRED',
  'a claim that ran out without an answer becomes unknown, not failed');
SELECT is((SELECT jsonb_build_array(state, reserved) FROM pg_temp.intent((SELECT c FROM cc))), '["outcome_unknown", true]'::jsonb,
  'with the amount still reserved');

-- Results are still recorded with the switch off; the switch stops only new requests.
UPDATE private.support_workspace_settings SET refund_submission_enabled = false;
SELECT is((SELECT r->>'state' FROM (SELECT private.support_refund_result_record((SELECT (c->>'operationId')::uuid FROM cc), 0,
  jsonb_build_object('kind', 'known', 'fact', pg_temp.fact('re_late', 100))) r) x), 'submitted', 'a late result is recorded with the switch off');

SELECT * FROM finish();
ROLLBACK;
