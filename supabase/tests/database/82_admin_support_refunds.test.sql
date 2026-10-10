BEGIN;
SELECT plan(45);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

-- People: 92...01 owner (the only one who may refund), ...0a2 support operator, ...0a1 support viewer.
CREATE FUNCTION pg_temp.owner(p_sql text, p_aal text DEFAULT 'aal2') RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as('92000000-0000-0000-0000-000000000001', p_aal, p_sql)
$$;
CREATE FUNCTION pg_temp.operator(p_sql text) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as('f3000000-0000-4000-8000-0000000000a2', 'aal2', p_sql)
$$;
CREATE FUNCTION pg_temp.facts(p_disputes jsonb DEFAULT '[]') RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('accountId','acct_support_test','mode','test','sessionId','cs_test_support','paymentIntentId','pi_support',
   'chargeId','ch_support','capturedMinor',1500,'currency','usd','paymentState','paid','paidAt','2026-10-01T10:00:00Z',
   'refunds',jsonb_build_array(jsonb_build_object('id','re_support_1','paymentIntentId','pi_support','chargeId','ch_support',
     'amountMinor',100,'currency','usd','status','succeeded','occurredAt','2026-10-02T10:00:00Z')),'disputes',p_disputes)
$$;
-- An owner refund check of order ...001, recorded by this test login as the verifier.
CREATE FUNCTION pg_temp.check(p_facts jsonb DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_job uuid := (pg_temp.owner(format('SELECT public.admin_support_refund_check_begin(%L, %L)', 'f3000000-0000-4000-8000-000000000001',
  gen_random_uuid()))->>'jobId')::uuid;
BEGIN
 RETURN (private.commerce_observation_record(v_job, (private.commerce_verification_claim(v_job)->>'fence')::bigint,
  coalesce(p_facts, pg_temp.facts()), true, '[]', 'test')->>'observationId')::uuid;
END $$;
CREATE FUNCTION pg_temp.input(p_amount jsonb DEFAULT '{"kind":"full_remaining"}', p_op uuid DEFAULT gen_random_uuid()) RETURNS jsonb
LANGUAGE sql AS $$
 SELECT jsonb_build_object('orderId', 'f3000000-0000-4000-8000-000000000001', 'caseId', NULL, 'amount', p_amount,
  'providerReason', 'requested_by_customer', 'exceptionCategory', 'billing_error', 'internalReason', 'Charged twice by mistake', 'operationId', p_op)
$$;
CREATE FUNCTION pg_temp.prepare(p_input jsonb, p_observation uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.owner(format('SELECT public.admin_support_refund_prepare(%L, %L)', p_input, p_observation))
$$;
CREATE FUNCTION pg_temp.command(p jsonb, p_op uuid DEFAULT gen_random_uuid()) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('operationId', p_op, 'proposalId', p->>'id', 'expectedDigest', p->>'digest', 'caseId', NULL)
$$;
SELECT private.commerce_verifier_register(session_user::text, 'Test verifier', '92000000-0000-0000-0000-000000000001');

-- Only the signed-in owner may refund; nothing private is reachable from a browser or an agent login.
SELECT is((SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'private'
  AND c.relname LIKE 'support_refund%' AND has_table_privilege('authenticated', c.oid, 'SELECT')), 0, 'browsers cannot read refund records');
SELECT is((SELECT array_agg(p.proname::text ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('private','public') AND p.proname LIKE '%refund%' AND (has_function_privilege('mch_support_operator', p.oid, 'EXECUTE')
    OR has_function_privilege('mch_commerce_verifier', p.oid, 'EXECUTE'))),
  ARRAY['support_refund_dispatch_payload', 'support_refund_expire_claim', 'support_refund_reconciled', 'support_refund_recovery_target',
    'support_refund_result_record'], 'agent logins have no refund function; the verifier only reads requests and records answers');
SELECT throws_ok($$SELECT pg_temp.owner('SELECT public.admin_support_refund_check_begin(''f3000000-0000-4000-8000-000000000001'', gen_random_uuid())')$$,
  '42501', 'ADM_DISABLED', 'refunds need at least the diagnosis stage');
UPDATE private.support_workspace_settings SET stage = 'diagnosis';
SELECT throws_ok($$SELECT pg_temp.operator('SELECT public.admin_support_refund_check_begin(''f3000000-0000-4000-8000-000000000001'', gen_random_uuid())')$$,
  '42501', 'ADM_DENIED', 'a support operator cannot start a refund');
SELECT throws_ok($$SELECT pg_temp.owner('SELECT public.admin_support_refund_check_begin(''f3000000-0000-4000-8000-000000000001'', gen_random_uuid())', 'aal1')$$,
  '42501', 'ADM_MFA_REQUIRED', 'the owner needs a verified second factor');
SELECT is((SELECT refund_submission_enabled FROM private.support_workspace_settings), false, 'refund submission is switched off by default');

-- Without an approved policy for the order's terms a refund cannot be judged.
CREATE TEMP TABLE c0 AS SELECT pg_temp.check() obs;
SELECT ok((SELECT p->'blockers' ? 'policy_missing' FROM (SELECT pg_temp.prepare(pg_temp.input(), (SELECT obs FROM c0)) p) x),
  'without an approved policy the refund is blocked');
INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
VALUES ('v1', 'v1', '{"id":"synthetic","approved":true,"version":"synthetic-v1","pendingRefund":"retain","partialRefund":"retain",
  "fullRefund":"ineligible","inquiry":"retain","formalOpen":"hold","formalLost":"ineligible","duration":"indefinite","fixedSeconds":null}',
  '92000000-0000-0000-0000-000000000001', 'Synthetic test mapping');

-- Preparing: the database fixes the amount from what is still refundable and states every consequence.
CREATE TEMP TABLE c1 AS SELECT pg_temp.check() obs, gen_random_uuid() op;
CREATE TEMP TABLE p1 AS SELECT pg_temp.prepare(pg_temp.input('{"kind":"full_remaining"}', (SELECT op FROM c1)), (SELECT obs FROM c1)) p;
SELECT is((SELECT p->'capacity' FROM p1), '{"blockers": [], "pendingMinor": 0, "capturedMinor": 1500, "reservedMinor": 0, "availableMinor": 1400, "successfulMinor": 100}'::jsonb,
  'capacity counts the captured payment and the earlier refund');
SELECT is((SELECT (p->>'amountMinor')::int FROM p1), 1400, 'full remaining is fixed at preparation');
SELECT is((SELECT p->'blockers' FROM p1), '[]'::jsonb, 'nothing blocks it');
SELECT is((SELECT (p->'effects'->0) - 'recipeIds' - 'sourceId' FROM p1), '{"afterEligible": false, "afterEffective": "denied", "beforeEligible": null, "notification": "none", "beforeEffective": "denied"}'::jsonb,
  'the refund would leave the purchase ineligible, and sends no email');
SELECT is((SELECT p->>'digest' FROM p1), (SELECT private.support_digest(p - 'id' - 'observationId' - 'expiresAt' - 'digest') FROM p1), 'its digest covers its material');
SELECT is(pg_temp.prepare(pg_temp.input('{"kind":"full_remaining"}', (SELECT op FROM c1)), (SELECT obs FROM c1)), (SELECT p FROM p1),
  'repeating the operation returns the same proposal');
SELECT is((SELECT (p->>'amountMinor')::int FROM (SELECT pg_temp.prepare(pg_temp.input('{"kind":"partial","amountMinor":400}'), (SELECT obs FROM c1)) p) x),
  400, 'a partial refund keeps its exact amount');
SELECT throws_ok(format('SELECT pg_temp.prepare(%L, %L)', pg_temp.input('{"kind":"partial","amountMinor":1401}'), (SELECT obs FROM c1)), '22023',
  'ADM_INVALID', 'more than is still refundable is refused');
SELECT throws_ok(format('SELECT pg_temp.prepare(%L, %L)', pg_temp.input('{"kind":"partial","amountMinor":0.5}'), (SELECT obs FROM c1)), '22023',
  'ADM_INVALID', 'fractions of a minor unit are refused');
SELECT throws_ok(format('SELECT pg_temp.prepare(%L, %L)', pg_temp.input() || '{"humanAuthoriser":"92000000-0000-0000-0000-000000000001"}',
  (SELECT obs FROM c1)), '22023', 'ADM_INVALID', 'no extra field, such as an approver, is accepted');
SELECT throws_ok(format('SELECT pg_temp.prepare(%L, %L)', pg_temp.input() || '{"providerReason":"fraudulent"}', (SELECT obs FROM c1)), '22023',
  'ADM_INVALID', 'only customer-requested or duplicate refunds can be prepared');
CREATE TEMP TABLE diag AS SELECT (private.commerce_observation_record(j.id, (private.commerce_verification_claim(j.id)->>'fence')::bigint,
  pg_temp.facts(), true, '[]', 'test')->>'observationId')::uuid obs
  FROM (SELECT (pg_temp.support_as('92000000-0000-0000-0000-000000000001', 'aal2', format('SELECT public.admin_support_diagnose_begin(%L, %L)',
   'f3000000-0000-4000-8000-000000000001', gen_random_uuid()))->>'jobId')::uuid id) j;
SELECT throws_ok(format('SELECT pg_temp.prepare(%L, %L)', pg_temp.input(), (SELECT obs FROM diag)), '22023', 'ADM_INVALID',
  'a refund is prepared only from an owner refund check');
CREATE TEMP TABLE c2 AS SELECT pg_temp.check() obs;
SELECT throws_ok(format('SELECT pg_temp.owner(%L)', format('SELECT public.admin_support_refund_approve(%L, %L)', (SELECT p->>'id' FROM p1),
  (SELECT p->>'digest' FROM p1))), 'PT409', 'ADM_STALE', 'a newer check makes the proposal stale');
CREATE TEMP TABLE p2 AS SELECT pg_temp.prepare(pg_temp.input(), (SELECT obs FROM c2)) p;
-- The owner has used this minute's provider checks; later checks in this test start a fresh minute.
DELETE FROM private.support_rate_buckets;

-- Approving: owner only, exactly this digest, for at most five minutes.
SELECT throws_ok(format('SELECT pg_temp.operator(%L)', format('SELECT public.admin_support_refund_approve(%L, %L)', (SELECT p->>'id' FROM p2),
  (SELECT p->>'digest' FROM p2))), '42501', 'ADM_DENIED', 'a support operator cannot approve a refund');
SELECT throws_ok(format('SELECT pg_temp.owner(%L)', format('SELECT public.admin_support_refund_approve(%L, %L)', (SELECT p->>'id' FROM p2),
  repeat('0', 64))), 'PT409', 'ADM_STALE', 'the approval names the exact digest');
CREATE TEMP TABLE a2 AS SELECT pg_temp.owner(format('SELECT public.admin_support_refund_approve(%L, %L)', (SELECT p->>'id' FROM p2),
  (SELECT p->>'digest' FROM p2))) a;
SELECT ok((SELECT (a->>'expiresAt')::timestamptz <= clock_timestamp() + interval '5 minutes' AND a->>'channel' = 'web'
  AND a->>'humanAuthoriser' = '92000000-0000-0000-0000-000000000001' FROM a2), 'the owner approves for at most five minutes');
SELECT is(pg_temp.owner(format('SELECT public.admin_support_refund_approve(%L, %L)', (SELECT p->>'id' FROM p2), (SELECT p->>'digest' FROM p2))),
  (SELECT a FROM a2), 'approving again returns the same approval');

-- Reserving: the repair stage, once per proposal, never beyond what is available.
SELECT throws_ok(format('SELECT pg_temp.owner(%L)', format('SELECT public.admin_support_refund_reserve(%L)', pg_temp.command((SELECT p FROM p2)))),
  '42501', 'ADM_DISABLED', 'reserving needs the repair stage');
UPDATE private.support_workspace_settings SET stage = 'repair';
SELECT throws_ok(format('SELECT pg_temp.owner(%L)', format('SELECT public.admin_support_refund_reserve(%L)', pg_temp.command((SELECT p FROM p2)))),
  '42501', 'ADM_DISABLED', 'reserving needs refund sending switched on');
UPDATE private.support_workspace_settings SET refund_submission_enabled = true;
CREATE TEMP TABLE cmd AS SELECT pg_temp.command((SELECT p FROM p2)) c;
CREATE TEMP TABLE r2 AS SELECT pg_temp.owner(format('SELECT public.admin_support_refund_reserve(%L)', (SELECT c FROM cmd))) r;
SELECT is((SELECT jsonb_build_array(r->>'state', (r->>'amountMinor')::int, r->>'reconciliation', r->>'providerRefundId') FROM r2),
  '["reserved", 1400, "not_started", null]'::jsonb, 'the approved amount is reserved, nothing sent yet');
SELECT is((SELECT jsonb_build_array(idempotency_key, reserved, attempts) FROM private.support_refund_intents
  WHERE operation_id = (SELECT (c->>'operationId')::uuid FROM cmd)), jsonb_build_array('mch-support-refund-' || (SELECT c->>'operationId' FROM cmd), true, 0),
  'with a stable idempotency key derived from the operation');
SELECT is(pg_temp.owner(format('SELECT public.admin_support_refund_reserve(%L)', (SELECT c FROM cmd)))->>'auditId', (SELECT r->>'auditId' FROM r2),
  'repeating the command returns the same reservation');
SELECT throws_ok(format('SELECT pg_temp.owner(%L)', format('SELECT public.admin_support_refund_reserve(%L)',
  (SELECT c || '{"caseId":"f3000000-0000-4000-8000-0000000000ff"}' FROM cmd))), '22023', 'ADM_INVALID', 'a different command under that operation is refused');
SELECT throws_ok(format('SELECT pg_temp.owner(%L)', format('SELECT public.admin_support_refund_reserve(%L)', pg_temp.command((SELECT p FROM p2)))),
  'PT409', 'ADM_CONFLICT', 'a proposal is reserved once');
SELECT ok((SELECT p->'blockers' ? 'refund_in_flight' AND (p->'capacity'->>'availableMinor')::int = 0
  FROM (SELECT pg_temp.prepare(pg_temp.input(), pg_temp.check()) p) x), 'while it is in flight, nothing more can be prepared');
SELECT is(private.support_refund_capacity(jsonb_set(pg_temp.facts(), '{refunds}', '[
  {"id":"re_done","paymentIntentId":"pi_support","chargeId":"ch_support","amountMinor":300,"currency":"usd","status":"succeeded","occurredAt":"2026-10-07T10:00:00Z"},
  {"id":"re_pending","paymentIntentId":"pi_support","chargeId":"ch_support","amountMinor":100,"currency":"usd","status":"pending","occurredAt":"2026-10-07T10:00:00Z"}]'))
  - 'capturedMinor' - 'successfulMinor', '{"blockers": ["refund_in_flight"], "pendingMinor": 100, "reservedMinor": 1400, "availableMinor": 0}'::jsonb,
  'the SQL capacity counts provider refunds and local reservations like its TypeScript twin');
SELECT throws_ok(format('UPDATE private.support_refund_intents SET amount_minor = 1 WHERE operation_id = %L', (SELECT c->>'operationId' FROM cmd)),
  '42501', 'ADM_IMMUTABLE', 'what will be asked of the provider cannot change');
SELECT is(pg_temp.owner(format('SELECT public.admin_support_refund_operation(%L)', (SELECT c->>'operationId' FROM cmd)))->>'state', 'reserved',
  'the owner reads the refund receipt');
SELECT throws_ok(format('SELECT pg_temp.operator(%L)', format('SELECT public.admin_support_refund_operation(%L)', (SELECT c->>'operationId' FROM cmd))),
  '42501', 'ADM_DENIED', 'support staff cannot read it');

-- The owner's refund list shows each proposal with where its operation stands; staff cannot read it.
SELECT is((SELECT e->>'state' FROM jsonb_array_elements(pg_temp.owner(format('SELECT public.admin_support_refunds(%L)',
  'f3000000-0000-4000-8000-000000000001'))->'items') e WHERE e->'proposal'->>'id' = (SELECT p->>'id' FROM p2)), 'started',
  'the list marks the reserved proposal as started');
SELECT throws_ok($$SELECT pg_temp.operator('SELECT public.admin_support_refunds(''f3000000-0000-4000-8000-000000000001'')')$$,
  '42501', 'ADM_DENIED', 'support staff cannot list refunds');

-- A reservation that was never sent can never be sent once its approval expires, so it stops holding money back.
SET LOCAL session_replication_role = replica;
UPDATE private.support_refund_approvals SET expires_at = clock_timestamp() - interval '1 second' WHERE id = (SELECT (a->>'id')::uuid FROM a2);
SET LOCAL session_replication_role = origin;
SELECT is(pg_temp.owner(format('SELECT public.admin_support_refund_operation(%L)', (SELECT c->>'operationId' FROM cmd)))->>'state', 'expired',
  'an unsent reservation whose approval expired reads as expired');
CREATE TEMP TABLE p3 AS SELECT pg_temp.prepare(pg_temp.input(), pg_temp.check()) p;
SELECT is((SELECT jsonb_build_array((p->'capacity'->>'reservedMinor')::int, (p->'capacity'->>'availableMinor')::int, p->'blockers') FROM p3),
  '[0, 1400, []]'::jsonb, 'and no longer holds the amount back');

-- Budgets: three new refund operations and five preparations a minute; repeating an operation spends nothing.
SELECT lives_ok(format('SELECT pg_temp.owner(%L)', format('SELECT public.admin_support_refund_approve(%L, %L)', (SELECT p->>'id' FROM p3),
  (SELECT p->>'digest' FROM p3))), 'the new proposal is approved');
INSERT INTO private.support_rate_buckets(actor_id, kind, minute, used)
SELECT '92000000-0000-0000-0000-000000000001', k, date_trunc('minute', clock_timestamp()) + m * interval '1 minute', n
FROM (VALUES ('refund_submit', 3), ('refund_prepare', 5)) v(k, n), generate_series(0, 1) m
ON CONFLICT (actor_id, kind, minute) DO UPDATE SET used = excluded.used;
SELECT throws_ok(format('SELECT pg_temp.owner(%L)', format('SELECT public.admin_support_refund_reserve(%L)', pg_temp.command((SELECT p FROM p3)))),
  'PT429', 'ADM_RATE_LIMITED', 'a fourth new refund operation in a minute is refused');
SELECT is(pg_temp.owner(format('SELECT public.admin_support_refund_reserve(%L)', (SELECT c FROM cmd)))->>'auditId', (SELECT r->>'auditId' FROM r2),
  'an existing refund operation is still returned');
SELECT throws_ok(format('SELECT pg_temp.prepare(%L, %L)', pg_temp.input(), (SELECT p->>'observationId' FROM p3)), 'PT429', 'ADM_RATE_LIMITED',
  'a sixth preparation in a minute is refused');
DELETE FROM private.support_rate_buckets;

-- An open formal dispute blocks a new refund.
UPDATE private.support_workspace_settings SET stage = 'diagnosis';
SELECT ok((SELECT p->'blockers' ? 'dispute_open' FROM (SELECT pg_temp.prepare(pg_temp.input(), pg_temp.check(pg_temp.facts(jsonb_build_array(
  jsonb_build_object('id','du_support_formal','paymentIntentId','pi_support','chargeId','ch_support','amountMinor',1500,'currency','usd',
   'status','needs_response','classification','formal','deadline',NULL))))) p) x), 'an open formal dispute blocks a refund');

SELECT * FROM finish();
ROLLBACK;
