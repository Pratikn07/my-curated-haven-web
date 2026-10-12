BEGIN;
SELECT plan(32);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

-- People: ...0a2 support operator (prepares), 92...01 owner (approves). This test login plays the agent's operator
-- login and, separately registered, the provider verifier.
CREATE FUNCTION pg_temp.facts() RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('accountId','acct_support_test','mode','test','sessionId','cs_test_support','paymentIntentId','pi_support',
   'chargeId','ch_support','capturedMinor',1500,'currency','usd','paymentState','paid','paidAt','2026-10-01T10:00:00Z',
   'refunds',jsonb_build_array(jsonb_build_object('id','re_support_1','paymentIntentId','pi_support','chargeId','ch_support',
     'amountMinor',100,'currency','usd','status','succeeded','occurredAt','2026-10-02T10:00:00Z')),
   'disputes',jsonb_build_array(jsonb_build_object('id','du_support_1','paymentIntentId','pi_support','chargeId','ch_support',
     'amountMinor',1500,'currency','usd','status','warning_needs_response','classification','inquiry','deadline',NULL)))
$$;
CREATE FUNCTION pg_temp.record(p_job uuid) RETURNS uuid LANGUAGE sql AS $$
 SELECT (private.commerce_observation_record(p_job, (private.commerce_verification_claim(p_job)->>'fence')::bigint, pg_temp.facts(), true,
  '[]', 'test')->>'observationId')::uuid
$$;
CREATE FUNCTION pg_temp.diagnose() RETURNS uuid LANGUAGE sql AS $$
 SELECT pg_temp.record((pg_temp.support_as('f3000000-0000-4000-8000-0000000000a2', 'aal2',
  format('SELECT public.admin_support_diagnose_begin(%L, %L)', 'f3000000-0000-4000-8000-000000000001', gen_random_uuid()))->>'jobId')::uuid)
$$;
CREATE FUNCTION pg_temp.prepare_command(p_observation uuid, p_op uuid, p_reason text DEFAULT 'Paid but the collection is missing')
RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('orderId', 'f3000000-0000-4000-8000-000000000001', 'observationId', p_observation, 'kind', 'reconcile_order',
  'reason', p_reason, 'humanId', 'f3000000-0000-4000-8000-0000000000a2', 'operationId', p_op)
$$;
CREATE FUNCTION pg_temp.attest(p jsonb, p_human uuid DEFAULT '92000000-0000-0000-0000-000000000001', p_digest text DEFAULT NULL,
  p_reference text DEFAULT 'chat 2026-10-10 owner said yes to this preview') RETURNS jsonb LANGUAGE sql AS $$
 SELECT private.support_operator_attest((p->>'id')::uuid, coalesce(p_digest, p->>'digest'), p_human, p_reference)
$$;

-- Nothing works for a login that is not registered, and browsers never reach these procedures.
SELECT throws_ok($$SELECT private.support_operator_attest(
  'f3000000-0000-4000-8000-000000000030','digest',
  'f3000000-0000-4000-8000-000000000002','local-approval-reference')$$,
  '42501',NULL,'unregistered session_user cannot attest approval');
SELECT is(has_function_privilege('authenticated', 'private.support_operator_execute(jsonb,uuid)', 'EXECUTE'), false,
  'browsers cannot call operator procedures');
SELECT is(has_function_privilege('mch_support_operator', 'private.support_execute_core(uuid,text,uuid,uuid)', 'EXECUTE'), false,
  'the operator group cannot reach the execution core directly');
SELECT is(has_function_privilege('mch_support_operator', 'private.support_operator_attest(uuid,text,uuid,text)', 'EXECUTE'), true,
  'it calls the operator procedures');

SELECT private.support_operator_register(session_user::text, 'Test agent', '92000000-0000-0000-0000-000000000001', true, false);
SELECT private.commerce_verifier_register(session_user::text, 'Test verifier', '92000000-0000-0000-0000-000000000001');
INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
VALUES ('v1', 'v1', '{"id":"synthetic","approved":true,"version":"synthetic-v1","pendingRefund":"retain","partialRefund":"retain",
  "fullRefund":"ineligible","inquiry":"retain","formalOpen":"hold","formalLost":"ineligible","duration":"indefinite","fixedSeconds":null}',
  '92000000-0000-0000-0000-000000000001', 'Synthetic test mapping');
UPDATE private.support_workspace_settings SET stage = 'repair';

-- Preparing for a named human with the right to prepare; the proposal lasts 30 minutes.
CREATE TEMP TABLE prep AS SELECT pg_temp.diagnose() obs, gen_random_uuid() op;
CREATE TEMP TABLE p1 AS SELECT private.support_operator_prepare(pg_temp.prepare_command((SELECT obs FROM prep), (SELECT op FROM prep))) p;
SELECT is((SELECT channel FROM private.support_proposals WHERE id = (SELECT (p->>'id')::uuid FROM p1)), 'operator',
  'the agent prepares an operator proposal');
SELECT ok((SELECT (p->>'expiresAt')::timestamptz - now() BETWEEN interval '29 minutes' AND interval '31 minutes' FROM p1),
  'operator proposals last 30 minutes');
SELECT is((SELECT actor FROM private.support_proposals WHERE id = (SELECT (p->>'id')::uuid FROM p1)), 'f3000000-0000-4000-8000-0000000000a2'::uuid,
  'in the name of the human it prepares for');
SELECT is(private.support_operator_prepare(pg_temp.prepare_command((SELECT obs FROM prep), (SELECT op FROM prep))), (SELECT p FROM p1),
  'repeating the command returns the same proposal');
SELECT throws_ok(format('SELECT private.support_operator_prepare(%L)', pg_temp.prepare_command((SELECT obs FROM prep), (SELECT op FROM prep),
  'A different reason')), '22023', 'ADM_INVALID', 'a different command under the same operation is refused');
SELECT throws_ok(format('SELECT private.support_operator_prepare(%L)', pg_temp.prepare_command((SELECT obs FROM prep), gen_random_uuid())
  || '{"humanId":"f3000000-0000-4000-8000-0000000000a1"}'), '42501', 'ADM_DENIED', 'a human who may not prepare cannot be named');
SELECT is((SELECT jsonb_build_array(x->'current', x->'expired', x->'approval', x->>'supportReference')
  FROM (SELECT private.support_operator_preview((SELECT (p->>'id')::uuid FROM p1)) x) y), '[true, false, null, "MCH-1A2B3C"]'::jsonb,
  'the preview shows the exact proposal as it stands');

-- Attesting: the named human must approve now; the digest and the reference are exact and bounded.
SELECT throws_ok(format('SELECT pg_temp.attest(%L, %L)', (SELECT p FROM p1), 'f3000000-0000-4000-8000-0000000000a2'), '42501', 'ADM_DENIED',
  'a human without approval authority cannot be named as approver');
SELECT throws_ok(format('SELECT pg_temp.attest(%L, %L, %L)', (SELECT p FROM p1), '92000000-0000-0000-0000-000000000001', repeat('0', 64)),
  'PT409', 'ADM_STALE', 'an attestation names the exact digest');
SELECT throws_ok(format('SELECT pg_temp.attest(%L, %L, NULL, %L)', (SELECT p FROM p1), '92000000-0000-0000-0000-000000000001', repeat('x', 201)),
  '22023', 'ADM_INVALID', 'the evidence reference is short, never a transcript');
CREATE TEMP TABLE a1 AS SELECT pg_temp.attest((SELECT p FROM p1)) a;
SELECT is((SELECT jsonb_build_array(a->>'humanAuthoriser', a->>'channel', a->>'expiresAt') FROM a1),
  (SELECT jsonb_build_array('92000000-0000-0000-0000-000000000001', 'operator', p->>'expiresAt') FROM p1),
  'the approval names the human, the operator channel and the proposal''s expiry');
SELECT is((SELECT jsonb_build_array(attested_by, evidence_reference) FROM private.support_approvals WHERE id = (SELECT (a->>'id')::uuid FROM a1)),
  jsonb_build_array(session_user::text, 'chat 2026-10-10 owner said yes to this preview'), 'and who recorded it and where it was given');
SELECT is(pg_temp.attest((SELECT p FROM p1)), (SELECT a FROM a1), 'repeating the attestation returns the same approval');

-- Executing needs the separate execute right; then it runs the browser's cores with fresh evidence.
CREATE TEMP TABLE cmd AS SELECT jsonb_build_object('operationId', gen_random_uuid(), 'proposalId', p->>'id', 'expectedDigest', p->>'digest',
  'caseId', NULL) c FROM p1;
SELECT throws_ok(format('SELECT private.support_operator_execute_begin(%L)', (SELECT c FROM cmd)), '42501', 'ADM_DENIED',
  'an attest-only login cannot execute');
UPDATE private.support_operator_principals SET can_execute = true WHERE principal = session_user::text;
CREATE TEMP TABLE b AS SELECT private.support_operator_execute_begin((SELECT c FROM cmd)) b;
SELECT is((SELECT b->'status'->>'state' FROM b), 'checking', 'execution starts with a fresh provider check');
SELECT throws_ok(format('SELECT private.support_operator_execute_begin(%L)', (SELECT c FROM cmd)
  || '{"caseId":"f3000000-0000-4000-8000-0000000000ff"}'), '22023', 'ADM_INVALID', 'a reused operation id with a different command is refused');
SELECT throws_ok(format('SELECT private.support_operator_execute(%L, %L)', (SELECT c FROM cmd), (SELECT obs FROM prep)), '22023', 'ADM_INVALID',
  'evidence gathered before approval cannot stand in for the fresh check');
CREATE TEMP TABLE r AS SELECT private.support_operator_execute((SELECT c FROM cmd), pg_temp.record((SELECT (b->>'jobId')::uuid FROM b))) r;
SELECT is((SELECT r->>'state' FROM r), 'applied', 'the attested repair is applied');
SELECT ok(private.collection_has_access('f3000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000003'),
  'the customer has the collection');
SELECT is((SELECT jsonb_build_array(actor, executor_principal) FROM private.support_operations WHERE operation_id = (SELECT (c->>'operationId')::uuid FROM cmd)),
  jsonb_build_array('92000000-0000-0000-0000-000000000001', session_user::text), 'the operation records the human and the executing login separately');
SELECT is((SELECT metadata->>'approvalId' FROM private.access_events WHERE id = (SELECT (r->>'auditId')::uuid FROM r)), (SELECT a->>'id' FROM a1),
  'the audit event names the attested approval');
SELECT is(private.support_operator_execute((SELECT c FROM cmd), gen_random_uuid()), (SELECT r FROM r), 'an exact retry returns the stored receipt');
SELECT throws_ok(format('SELECT private.support_operator_execute(%L, gen_random_uuid())', (SELECT c FROM cmd) || '{"caseId":"f3000000-0000-4000-8000-0000000000ff"}'),
  '22023', 'ADM_INVALID', 'a different command cannot commit under that operation');
SELECT is(private.support_operator_operation((SELECT (c->>'operationId')::uuid FROM cmd))->>'operationId', (SELECT c->>'operationId' FROM cmd),
  'the login reads the operations it ran');
SELECT throws_ok(format('SELECT pg_temp.support_as(''92000000-0000-0000-0000-000000000001'', ''aal2'', %L)',
  format('SELECT public.admin_support_execute(%L, gen_random_uuid())', (SELECT c->>'operationId' FROM cmd))), 'P0002', 'ADM_NOT_FOUND',
  'nobody can commit an agent''s operation from the browser');

-- A browser proposal is not attested by an agent; a revoked login and a switched-off stage stop everything.
CREATE TEMP TABLE web AS SELECT pg_temp.support_as('f3000000-0000-4000-8000-0000000000a2', 'aal2',
  format('SELECT public.admin_support_prepare(%L, %L, ''rebuild_projection'', ''Web check'', %L)', 'f3000000-0000-4000-8000-000000000001',
   pg_temp.diagnose(), gen_random_uuid())) p;
SELECT throws_ok(format('SELECT pg_temp.attest(%L)', (SELECT p FROM web)), 'PT409', 'ADM_STALE', 'an agent attests only operator proposals');
UPDATE private.support_workspace_settings SET stage = 'diagnosis';
SELECT throws_ok(format('SELECT private.support_operator_prepare(%L)', pg_temp.prepare_command((SELECT obs FROM prep), gen_random_uuid())),
  '42501', 'ADM_DISABLED', 'nothing is prepared outside the repair stage');
UPDATE private.support_workspace_settings SET stage = 'repair';
SELECT private.support_operator_revoke(session_user::text);
SELECT throws_ok(format('SELECT private.support_operator_preview(%L)', (SELECT p->>'id' FROM p1)), '42501', 'ADM_DENIED',
  'a revoked login is refused');

SELECT * FROM finish();
ROLLBACK;
