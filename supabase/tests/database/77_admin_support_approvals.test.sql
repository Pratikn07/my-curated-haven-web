BEGIN;
SELECT plan(36);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

-- Staff: ...0a2 support operator (prepares, cannot approve), ...0a1 support viewer, 92...01 owner (approves).
CREATE FUNCTION pg_temp.as_op(p_sql text) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as('f3000000-0000-4000-8000-0000000000a2', 'aal2', p_sql)
$$;
CREATE FUNCTION pg_temp.as_owner(p_sql text, p_aal text DEFAULT 'aal2') RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as('92000000-0000-0000-0000-000000000001', p_aal, p_sql)
$$;
-- A staff diagnosis of an order, recorded by this test login as the registered verifier.
CREATE FUNCTION pg_temp.observe(p_order uuid, p_facts jsonb, p_complete boolean DEFAULT true, p_blockers jsonb DEFAULT '[]')
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_job uuid := (pg_temp.as_op(format('SELECT public.admin_support_diagnose_begin(%L, %L)', p_order, gen_random_uuid()))->>'jobId')::uuid;
 v_claim jsonb := private.commerce_verification_claim(v_job);
BEGIN
 RETURN (private.commerce_observation_record(v_job, (v_claim->>'fence')::bigint, p_facts, p_complete, p_blockers, 'test')
  ->>'observationId')::uuid;
END $$;
CREATE FUNCTION pg_temp.facts_001(p_disputes jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('accountId','acct_support_test','mode','test','sessionId','cs_test_support','paymentIntentId','pi_support',
   'chargeId','ch_support','capturedMinor',1500,'currency','usd','paymentState','paid','paidAt','2026-10-01T10:00:00Z',
   'refunds',jsonb_build_array(jsonb_build_object('id','re_support_1','paymentIntentId','pi_support','chargeId','ch_support',
     'amountMinor',100,'currency','usd','status','succeeded','occurredAt','2026-10-02T10:00:00Z')),
   'disputes',coalesce(p_disputes, jsonb_build_array(jsonb_build_object('id','du_support_1','paymentIntentId','pi_support',
     'chargeId','ch_support','amountMinor',1500,'currency','usd','status','warning_needs_response','classification','inquiry',
     'deadline',NULL))))
$$;
CREATE FUNCTION pg_temp.prepare(p_observation uuid, p_kind text DEFAULT 'reconcile_order', p_op uuid DEFAULT gen_random_uuid(),
  p_order uuid DEFAULT 'f3000000-0000-4000-8000-000000000001', p_reason text DEFAULT 'Paid but the collection is missing')
RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.as_op(format('SELECT public.admin_support_prepare(%L, %L, %L, %L, %L)', p_order, p_observation, p_kind, p_reason, p_op))
$$;
CREATE FUNCTION pg_temp.approve(p_proposal jsonb, p_op uuid DEFAULT gen_random_uuid(), p_digest text DEFAULT NULL) RETURNS jsonb
LANGUAGE sql AS $$
 SELECT pg_temp.as_owner(format('SELECT public.admin_support_approve(%L, %L, %L)', p_proposal->>'id',
   coalesce(p_digest, p_proposal->>'digest'), p_op))
$$;
CREATE FUNCTION pg_temp.prepare_as(p_user uuid, p_observation uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as(p_user, 'aal2', format('SELECT public.admin_support_prepare(%L, %L, ''reconcile_order'', ''x'', %L)',
   'f3000000-0000-4000-8000-000000000001', p_observation, gen_random_uuid()))
$$;
CREATE FUNCTION pg_temp.approve_as(p_user uuid, p_aal text, p_proposal jsonb) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as(p_user, p_aal, format('SELECT public.admin_support_approve(%L, %L, %L)', p_proposal->>'id',
   p_proposal->>'digest', gen_random_uuid()))
$$;
SELECT private.commerce_verifier_register(session_user::text, 'Test verifier', '92000000-0000-0000-0000-000000000001');
INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
VALUES ('v1', 'v1', '{"id":"synthetic","approved":true,"version":"synthetic-v1","pendingRefund":"retain","partialRefund":"retain",
  "fullRefund":"ineligible","inquiry":"retain","formalOpen":"hold","formalLost":"ineligible","duration":"indefinite","fixedSeconds":null}',
  '92000000-0000-0000-0000-000000000001', 'Synthetic test mapping');
UPDATE private.support_workspace_settings SET stage = 'repair';
CREATE TEMP TABLE obs AS SELECT pg_temp.observe('f3000000-0000-4000-8000-000000000001', pg_temp.facts_001()) id;
CREATE TEMP TABLE ops AS SELECT gen_random_uuid() prep, gen_random_uuid() appr;

-- The proposal digest matches the TypeScript golden vector for the shared fixture proposal.
SELECT is(private.support_digest(private.support_proposal_material('{"id":"f3000000-0000-4000-8000-000000000005","orderId":"f3000000-0000-4000-8000-000000000001","userId":"f3000000-0000-4000-8000-000000000002","ownerPrincipal":"f3000000-0000-4000-8000-000000000002","binding":{"orderId":"f3000000-0000-4000-8000-000000000001","userId":"f3000000-0000-4000-8000-000000000002","ownerPrincipal":"f3000000-0000-4000-8000-000000000002","collectionId":"f3000000-0000-4000-8000-000000000003","releaseId":"f3000000-0000-4000-8000-000000000004","sessionId":"cs_test_support","accountId":"acct_support_test","mode":"test","expectedCapturedMinor":1500,"currency":"usd","manifestHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","refundPolicyVersion":"v1","accessPolicyVersion":"v1","version":3},"kind":"reconcile_order","observationId":"f3000000-0000-4000-8000-000000000006","materialDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","expectedOrderVersion":3,"dependencyToken":"dep-1","policyVersion":"fixture-v1","effects":[{"sourceId":"f3000000-0000-4000-8000-000000000001","beforeEligible":null,"afterEligible":true,"beforeEffective":"denied","afterEffective":"active","recipeIds":["f3000000-0000-4000-8000-000000000009"],"notification":"none"}],"blockers":[],"digest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","expiresAt":"2026-10-01T10:30:00.000Z","reason":"Paid but not fulfilled"}')),
  'b8aebb3043f0b45314d94405229c016096bbe86399db89101c7b1bead1b03436', 'the proposal digest agrees with TypeScript');
SELECT is(has_table_privilege('authenticated', 'private.support_proposals', 'SELECT'), false, 'browsers cannot read proposals directly');

-- Preparing needs the repair stage, both prepare and provider-inspection rights, a reason and a supported kind.
UPDATE private.support_workspace_settings SET stage = 'diagnosis';
SELECT throws_ok(format('SELECT pg_temp.prepare(%L)', (SELECT id FROM obs)), '42501', 'ADM_DISABLED', 'repairs need the repair stage');
UPDATE private.support_workspace_settings SET stage = 'repair';
SELECT throws_ok(format('SELECT pg_temp.prepare_as(''f3000000-0000-4000-8000-0000000000a1'', %L)', (SELECT id FROM obs)), '42501',
  'ADM_DENIED', 'a support viewer cannot prepare');
SELECT throws_ok(format('SELECT pg_temp.prepare(%L, ''reconcile_order'', gen_random_uuid(), ''f3000000-0000-4000-8000-000000000001'', ''  '')',
  (SELECT id FROM obs)), '22023', 'ADM_INVALID', 'a reason is required');
SELECT throws_ok(format('SELECT pg_temp.prepare(%L, ''grant_access'')', (SELECT id FROM obs)), '22023', 'ADM_INVALID',
  'only the two supported repairs can be prepared');

-- The database works out the effects from the evidence; preparing changes nothing.
CREATE TEMP TABLE p1 AS SELECT pg_temp.prepare((SELECT id FROM obs), 'reconcile_order', (SELECT prep FROM ops)) p;
SELECT is((SELECT p->'blockers' FROM p1), '[]'::jsonb, 'a paid order missing its purchase source can be repaired');
SELECT is((SELECT (p->'effects'->0) - 'recipeIds' FROM p1), jsonb_build_object('sourceId', 'f3000000-0000-4000-8000-000000000001',
  'beforeEligible', NULL, 'afterEligible', true, 'beforeEffective', 'denied', 'afterEffective', 'active', 'notification', 'none'),
  'the proposal shows the source and the customer''s access before and after');
SELECT is((SELECT p->>'digest' FROM p1), (SELECT private.support_digest(private.support_proposal_material(p - 'digest')) FROM p1),
  'its digest covers its material');
SELECT ok(NOT EXISTS (SELECT 1 FROM private.access_sources WHERE source_id = 'f3000000-0000-4000-8000-000000000001')
  AND NOT EXISTS (SELECT 1 FROM private.commerce_reconcile_receipts) AND NOT EXISTS (SELECT 1 FROM private.access_events
  WHERE event_type = 'commerce_reconciled'), 'preparing a repair changes nothing');
SELECT ok((SELECT (p->>'expiresAt')::timestamptz - now() BETWEEN interval '290 seconds' AND interval '301 seconds' FROM p1),
  'a proposal lasts five minutes');
SELECT is(pg_temp.prepare((SELECT id FROM obs), 'reconcile_order', (SELECT prep FROM ops)), (SELECT p FROM p1),
  'repeating the operation returns the same proposal');
SELECT throws_ok($$UPDATE private.support_proposals SET blocked = true$$, '42501', 'ADM_IMMUTABLE', 'proposals cannot be edited');

-- Approval: owner only, the exact digest, once.
SELECT throws_ok(format('SELECT pg_temp.approve_as(''f3000000-0000-4000-8000-0000000000a2'', ''aal2'', %L)', (SELECT p FROM p1)),
  '42501', 'ADM_DENIED', 'a support operator cannot approve');
SELECT throws_ok(format('SELECT pg_temp.approve(%L, gen_random_uuid(), %L)', (SELECT p FROM p1), repeat('0', 64)), 'PT409', 'ADM_STALE',
  'approval cannot bind a different proposal digest');
SELECT throws_ok(format('SELECT pg_temp.approve_as(''92000000-0000-0000-0000-000000000001'', ''aal1'', %L)', (SELECT p FROM p1)),
  '42501', 'ADM_MFA_REQUIRED', 'approval needs a verified second factor');
CREATE TEMP TABLE a1 AS SELECT pg_temp.approve((SELECT p FROM p1), (SELECT appr FROM ops)) a;
SELECT is((SELECT a->>'humanAuthoriser' FROM a1), '92000000-0000-0000-0000-000000000001', 'the approver is the signed-in owner');
SELECT is((SELECT jsonb_build_array(a->>'proposalId', a->>'digest', a->>'channel', a->>'expiresAt') FROM a1),
  (SELECT jsonb_build_array(p->>'id', p->>'digest', 'web', p->>'expiresAt') FROM p1), 'it binds the proposal, its digest and its expiry');
SELECT is(pg_temp.approve((SELECT p FROM p1), (SELECT appr FROM ops)), (SELECT a FROM a1), 'repeating the approval returns the same one');
SELECT throws_ok(format('SELECT pg_temp.approve(%L)', (SELECT p FROM p1)), 'PT409', 'ADM_CONFLICT', 'a proposal is approved once');
SELECT throws_ok($$UPDATE private.support_approvals SET channel = 'operator'$$, '42501', 'ADM_IMMUTABLE', 'approvals cannot be edited');
SELECT is((SELECT pg_temp.as_op(format('SELECT public.admin_support_proposals(%L)', 'f3000000-0000-4000-8000-000000000001'))->0->>'state'),
  'approved', 'the order lists its approved proposal');

-- Expired, blocked and out-of-date proposals cannot be approved.
INSERT INTO private.support_proposals(id, actor, operation_id, order_id, observation_id, kind, proposal, digest, blocked, prepared_at, expires_at)
SELECT 'f3000000-0000-4000-8000-000000000930', actor, gen_random_uuid(), order_id, observation_id, kind,
  proposal || '{"id":"f3000000-0000-4000-8000-000000000930"}', digest, false, now() - interval '10 minutes', now() - interval '5 minutes'
FROM private.support_proposals WHERE id = (SELECT (p->>'id')::uuid FROM p1);
SELECT throws_ok($$SELECT pg_temp.approve(jsonb_build_object('id','f3000000-0000-4000-8000-000000000930','digest',
  (SELECT digest FROM private.support_proposals WHERE id = 'f3000000-0000-4000-8000-000000000930')))$$, 'PT409', 'ADM_STALE',
  'an expired proposal cannot be approved');
CREATE TEMP TABLE obs_partial AS SELECT pg_temp.observe('f3000000-0000-4000-8000-000000000001', pg_temp.facts_001(), false,
  '["refunds_incomplete"]') id;
CREATE TEMP TABLE p2 AS SELECT pg_temp.prepare((SELECT id FROM obs_partial)) p;
SELECT ok((SELECT p->'blockers' ? 'evidence_incomplete' FROM p2), 'incomplete evidence blocks the proposal');
SELECT throws_ok(format('SELECT pg_temp.approve(%L)', (SELECT p FROM p2)), '42501', 'ADM_BLOCKED', 'and a blocked proposal cannot be approved');
CREATE TEMP TABLE p3 AS SELECT pg_temp.prepare((SELECT id FROM obs)) p;
CREATE TEMP TABLE obs_newer AS SELECT pg_temp.observe('f3000000-0000-4000-8000-000000000001', pg_temp.facts_001()) id;
SELECT throws_ok(format('SELECT pg_temp.approve(%L)', (SELECT p FROM p3)), 'PT409', 'ADM_STALE', 'newer evidence makes a proposal stale');
SELECT throws_ok(format('SELECT pg_temp.prepare(%L)', (SELECT id FROM obs)), 'PT409', 'ADM_STALE', 'and older evidence cannot be prepared from');
CREATE TEMP TABLE p4 AS SELECT pg_temp.prepare((SELECT id FROM obs_newer)) p;
INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, valid_from)
VALUES ('f3000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000004', 'native_legacy', 'app-receipt-77', false, now());
SELECT throws_ok(format('SELECT pg_temp.approve(%L)', (SELECT p FROM p4)), 'PT409', 'ADM_STALE', 'a change to the customer''s access makes it stale');

-- A projection rebuild never changes purchase sources; one that would change nothing is blocked.
INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, valid_from)
VALUES ('f3000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000004', 'stripe_purchase',
  'f3000000-0000-4000-8000-000000000001', true, now() - interval '1 minute');
CREATE TEMP TABLE p5 AS SELECT pg_temp.prepare((SELECT id FROM obs_newer), 'rebuild_projection') p;
SELECT is((SELECT jsonb_build_array(p->'blockers', p->'effects'->0->'beforeEligible', p->'effects'->0->'afterEligible',
  p->'effects'->0->>'beforeEffective', p->'effects'->0->>'afterEffective') FROM p5), '[[], true, true, "denied", "active"]'::jsonb,
  'a missing projection is rebuilt without touching the source');
SELECT is((SELECT count(*)::int FROM public.access_entitlements WHERE user_id = 'f3000000-0000-4000-8000-000000000002'), 0,
  'previewing the rebuild projected nothing');
SELECT private.project_user_entitlement('f3000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000004');
SELECT is((SELECT p->'blockers' FROM (SELECT pg_temp.prepare((SELECT id FROM obs_newer), 'rebuild_projection') p) x), '["no_change"]'::jsonb,
  'a rebuild that would change nothing is blocked');
SELECT is((SELECT p->'blockers' FROM (SELECT pg_temp.prepare((SELECT id FROM obs_newer)) p) x), '["no_change"]'::jsonb,
  'so is a reconciliation that is already satisfied');

-- An owner may prepare and approve their own repair.
CREATE TEMP TABLE p6 AS SELECT pg_temp.as_owner(format('SELECT public.admin_support_prepare(%L, %L, ''rebuild_projection'', ''Owner check'', gen_random_uuid())',
  'f3000000-0000-4000-8000-000000000001', (SELECT id FROM obs_newer))) p;
SELECT is((SELECT p->'blockers' FROM p6), '["no_change"]'::jsonb, 'the owner prepares with the same rules');

-- Restoring access while a formal dispute is open is never prepared, even under a policy that keeps access.
INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
VALUES ('retain-v1', 'retain-v1', '{"id":"retain","approved":true,"version":"retain-v1","pendingRefund":"retain","partialRefund":"retain",
  "fullRefund":"ineligible","inquiry":"retain","formalOpen":"retain","formalLost":"ineligible","duration":"indefinite","fixedSeconds":null}',
  '92000000-0000-0000-0000-000000000001', 'Synthetic retain mapping');
INSERT INTO private.purchase_orders(id, support_reference, owner_principal, user_id, offer_id, release_id, snapshot, attempt_state,
  session_id, idempotency_key, version)
SELECT 'f3000000-0000-4000-8000-000000000977', 'MCH-D77', 'f3000000-0000-4000-8000-00000000000b', 'f3000000-0000-4000-8000-00000000000b',
  offer_id, release_id, snapshot || '{"refund_policy_version":"retain-v1","access_policy_version":"retain-v1"}', 'closed', 'cs_test_d77',
  'd77', 1 FROM private.purchase_orders WHERE id = 'f3000000-0000-4000-8000-000000000001';
INSERT INTO private.provider_payments(order_id, provider_account_id, provider_mode, payment_intent_id, charge_id, status, captured_amount,
  currency, paid_at)
VALUES ('f3000000-0000-4000-8000-000000000977', 'acct_support_test', 'test', 'pi_d77', 'ch_d77', 'succeeded', 1500, 'usd', '2026-10-01T10:00:00Z');
CREATE TEMP TABLE p7 AS SELECT pg_temp.prepare(pg_temp.observe('f3000000-0000-4000-8000-000000000977',
  jsonb_build_object('accountId','acct_support_test','mode','test','sessionId','cs_test_d77','paymentIntentId','pi_d77','chargeId','ch_d77',
   'capturedMinor',1500,'currency','usd','paymentState','paid','paidAt','2026-10-01T10:00:00Z','refunds','[]'::jsonb,
   'disputes',jsonb_build_array(jsonb_build_object('id','du_d77','paymentIntentId','pi_d77','chargeId','ch_d77','amountMinor',1500,
     'currency','usd','status','needs_response','classification','formal','deadline',NULL)))),
  'reconcile_order', gen_random_uuid(), 'f3000000-0000-4000-8000-000000000977') p;
SELECT is((SELECT p->'blockers' FROM p7), '["dispute_open"]'::jsonb, 'access is not restored while a formal dispute is open');

-- A closed account's order is not repaired here, and an order that changed since the check is stale.
SELECT throws_ok(format('SELECT pg_temp.prepare(%L, ''reconcile_order'', gen_random_uuid(), ''f3000000-0000-4000-8000-000000000013'')',
  pg_temp.observe('f3000000-0000-4000-8000-000000000013', jsonb_build_object('accountId','acct_support_test','mode','test',
   'sessionId','cs_test_closed','paymentIntentId',NULL,'chargeId',NULL,'capturedMinor',NULL,'currency',NULL,'paymentState','unpaid',
   'paidAt',NULL,'refunds','[]'::jsonb,'disputes','[]'::jsonb))), '42501', 'ADM_BLOCKED', 'a closed account''s order is not repaired');
CREATE TEMP TABLE p8 AS SELECT pg_temp.prepare((SELECT id FROM obs_newer), 'rebuild_projection') p;
UPDATE private.purchase_orders SET version = version + 1 WHERE id = 'f3000000-0000-4000-8000-000000000001';
SELECT throws_ok(format('SELECT pg_temp.prepare(%L)', (SELECT id FROM obs_newer)), 'PT409', 'ADM_STALE',
  'evidence about an order that changed since cannot be prepared from');

SELECT * FROM finish();
ROLLBACK;
