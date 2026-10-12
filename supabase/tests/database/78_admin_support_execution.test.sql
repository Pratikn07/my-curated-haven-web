BEGIN;
SELECT plan(28);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

-- Staff: ...0a2 support operator (prepares and executes), ...0a1 support viewer, 92...01 owner (approves).
CREATE TEMP TABLE staff AS SELECT 'f3000000-0000-4000-8000-0000000000a2'::uuid op, 'f3000000-0000-4000-8000-0000000000a1'::uuid viewer,
 '92000000-0000-0000-0000-000000000001'::uuid owner;
CREATE FUNCTION pg_temp.call(p_user uuid, p_sql text) RETURNS jsonb LANGUAGE sql AS $$ SELECT pg_temp.support_as(p_user, 'aal2', p_sql) $$;
CREATE FUNCTION pg_temp.new_order(p_n int, p_paid_source boolean) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid := ('f3000000-0000-4000-8000-0000000009' || lpad(p_n::text, 2, '0'))::uuid;
 v_user uuid := ('f3000000-0000-4000-8000-0000000008' || lpad(p_n::text, 2, '0'))::uuid;
BEGIN
 INSERT INTO auth.users(id, email, role, aud, email_confirmed_at) VALUES (v_user, 'exec-' || p_n || '@synthetic.test', 'authenticated',
  'authenticated', now());
 INSERT INTO private.purchase_orders(id, support_reference, owner_principal, user_id, offer_id, release_id, snapshot, attempt_state,
  session_id, idempotency_key, version)
 SELECT v_id, 'MCH-E' || p_n, v_user, v_user, offer_id, release_id, snapshot, 'closed', 'cs_test_exec_' || p_n, 'exec-' || p_n, 1
 FROM private.purchase_orders WHERE id = 'f3000000-0000-4000-8000-000000000001';
 INSERT INTO private.provider_payments(order_id, provider_account_id, provider_mode, payment_intent_id, charge_id, status,
  captured_amount, currency, paid_at)
 VALUES (v_id, 'acct_support_test', 'test', 'pi_exec_' || p_n, 'ch_exec_' || p_n, 'succeeded', 1500, 'usd', '2026-10-01T10:00:00Z');
 IF p_paid_source THEN
  INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, valid_from)
  VALUES (v_user, 'f3000000-0000-4000-8000-000000000004', 'stripe_purchase', v_id::text, true, now() - interval '1 minute');
 END IF;
 RETURN v_id;
END $$;
CREATE FUNCTION pg_temp.facts(p_order uuid, p_extra_refund boolean DEFAULT false) RETURNS jsonb LANGUAGE sql AS $$
 SELECT CASE WHEN p_order = 'f3000000-0000-4000-8000-000000000001' THEN
  jsonb_build_object('accountId','acct_support_test','mode','test','sessionId','cs_test_support','paymentIntentId','pi_support',
   'chargeId','ch_support','capturedMinor',1500,'currency','usd','paymentState','paid','paidAt','2026-10-01T10:00:00Z',
   'refunds',jsonb_build_array(jsonb_build_object('id','re_support_1','paymentIntentId','pi_support','chargeId','ch_support',
     'amountMinor',100,'currency','usd','status','succeeded','occurredAt','2026-10-02T10:00:00Z'))
     || CASE WHEN p_extra_refund THEN jsonb_build_array(jsonb_build_object('id','re_support_2','paymentIntentId','pi_support',
       'chargeId','ch_support','amountMinor',200,'currency','usd','status','succeeded','occurredAt','2026-10-03T10:00:00Z')) ELSE '[]' END,
   'disputes',jsonb_build_array(jsonb_build_object('id','du_support_1','paymentIntentId','pi_support','chargeId','ch_support',
     'amountMinor',1500,'currency','usd','status','warning_needs_response','classification','inquiry','deadline',NULL)))
 ELSE
  (SELECT jsonb_build_object('accountId','acct_support_test','mode','test','sessionId',o.session_id,'paymentIntentId',p.payment_intent_id,
   'chargeId',p.charge_id,'capturedMinor',1500,'currency','usd','paymentState','paid','paidAt','2026-10-01T10:00:00Z',
   'refunds','[]'::jsonb,'disputes','[]'::jsonb)
   FROM private.purchase_orders o JOIN private.provider_payments p ON p.order_id = o.id WHERE o.id = p_order)
 END
$$;
-- Record an answer for a job as the registered verifier.
CREATE FUNCTION pg_temp.record(p_job uuid, p_facts jsonb) RETURNS uuid LANGUAGE sql AS $$
 SELECT (private.commerce_observation_record(p_job, (private.commerce_verification_claim(p_job)->>'fence')::bigint, p_facts, true, '[]',
  'test')->>'observationId')::uuid
$$;
CREATE FUNCTION pg_temp.diagnose(p_order uuid, p_extra_refund boolean DEFAULT false) RETURNS uuid LANGUAGE sql AS $$
 SELECT pg_temp.record((pg_temp.call((SELECT op FROM staff), format('SELECT public.admin_support_diagnose_begin(%L, %L)', p_order,
  gen_random_uuid()))->>'jobId')::uuid, pg_temp.facts(p_order, p_extra_refund))
$$;
CREATE FUNCTION pg_temp.prepare(p_order uuid, p_observation uuid, p_kind text DEFAULT 'reconcile_order') RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.call((SELECT op FROM staff), format('SELECT public.admin_support_prepare(%L, %L, %L, ''Repair test'', %L)', p_order,
  p_observation, p_kind, gen_random_uuid()))
$$;
CREATE FUNCTION pg_temp.approve(p jsonb) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.call((SELECT owner FROM staff), format('SELECT public.admin_support_approve(%L, %L, %L)', p->>'id', p->>'digest',
  gen_random_uuid()))
$$;
CREATE FUNCTION pg_temp.command(p jsonb, p_op uuid, p_case uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('operationId', p_op, 'proposalId', p->>'id', 'expectedDigest', p->>'digest', 'caseId', p_case)
$$;
CREATE FUNCTION pg_temp.begin(p_user uuid, p_command jsonb) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.call(p_user, format('SELECT public.admin_support_execute_begin(%L)', p_command))
$$;
CREATE FUNCTION pg_temp.execute(p_user uuid, p_op uuid, p_observation uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.call(p_user, format('SELECT public.admin_support_execute(%L, %L)', p_op, p_observation))
$$;
CREATE FUNCTION pg_temp.status(p_user uuid, p_op uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.call(p_user, format('SELECT public.admin_support_operation(%L)', p_op))
$$;
SELECT private.commerce_verifier_register(session_user::text, 'Test verifier', '92000000-0000-0000-0000-000000000001');
INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
VALUES ('v1', 'v1', '{"id":"synthetic","approved":true,"version":"synthetic-v1","pendingRefund":"retain","partialRefund":"retain",
  "fullRefund":"ineligible","inquiry":"retain","formalOpen":"hold","formalLost":"ineligible","duration":"indefinite","fixedSeconds":null}',
  '92000000-0000-0000-0000-000000000001', 'Synthetic test mapping');
UPDATE private.support_workspace_settings SET stage = 'repair';

-- Order ...001 is paid but has no purchase source. Proposal A is approved; an unapproved proposal cannot start.
CREATE TEMP TABLE a AS SELECT pg_temp.prepare('f3000000-0000-4000-8000-000000000001', pg_temp.diagnose('f3000000-0000-4000-8000-000000000001')) p,
 gen_random_uuid() op;
SELECT throws_ok(format('SELECT pg_temp.begin((SELECT op FROM staff), %L)', pg_temp.command((SELECT p FROM a), (SELECT op FROM a)))::text,
  '42501', 'ADM_BLOCKED', 'an unapproved proposal cannot be executed');
SELECT pg_temp.approve((SELECT p FROM a));
SELECT throws_ok(format('SELECT pg_temp.begin((SELECT viewer FROM staff), %L)', pg_temp.command((SELECT p FROM a), (SELECT op FROM a))),
  '42501', 'ADM_DENIED', 'a support viewer cannot execute');
SELECT throws_ok(format('SELECT pg_temp.begin((SELECT op FROM staff), %L)', pg_temp.command((SELECT p FROM a), (SELECT op FROM a))
  || jsonb_build_object('expectedDigest', repeat('0', 64))), 'PT409', 'ADM_STALE', 'execution names the approved digest');
SELECT throws_ok(format('SELECT pg_temp.begin((SELECT op FROM staff), %L)', pg_temp.command((SELECT p FROM a), (SELECT op FROM a))
  || '{"humanAuthoriser":"92000000-0000-0000-0000-000000000001"}'), '22023', 'ADM_INVALID', 'no approver can be posted with the command');
CREATE TEMP TABLE a_begin AS SELECT pg_temp.begin((SELECT op FROM staff), pg_temp.command((SELECT p FROM a), (SELECT op FROM a))) b;
SELECT is((SELECT b->'status'->>'state' FROM a_begin), 'checking', 'an approved repair starts with a fresh provider check');
SELECT is(pg_temp.begin((SELECT op FROM staff), pg_temp.command((SELECT p FROM a), (SELECT op FROM a)))->>'jobId',
  (SELECT b->>'jobId' FROM a_begin), 'repeating the command returns the same operation');
SELECT throws_ok(format('SELECT pg_temp.begin((SELECT op FROM staff), %L)', pg_temp.command((SELECT p FROM a), (SELECT op FROM a),
  'f3000000-0000-4000-8000-0000000000ff')), '22023', 'ADM_INVALID', 'a different command under the same operation is refused');
SELECT throws_ok(format('SELECT pg_temp.begin((SELECT op FROM staff), %L)', pg_temp.command((SELECT p FROM a), gen_random_uuid())),
  'PT409', 'ADM_CONFLICT', 'a proposal is executed by one operation');

-- The fresh check finds a refund made after approval: the repair needs another preview and approval.
CREATE TEMP TABLE a_obs AS SELECT pg_temp.record((SELECT (b->>'jobId')::uuid FROM a_begin),
  pg_temp.facts('f3000000-0000-4000-8000-000000000001', true)) id;
SELECT throws_ok(format('SELECT pg_temp.execute((SELECT op FROM staff), %L, %L)', (SELECT op FROM a),
  (SELECT p->>'observationId' FROM a)), '22023', 'ADM_INVALID', 'only the operation''s own check counts as evidence');
SELECT throws_ok(format('SELECT pg_temp.execute((SELECT op FROM staff), %L, %L)', (SELECT op FROM a), (SELECT id FROM a_obs)),
  'PT409', 'ADM_STALE', 'a newly verified refund requires another preview and approval');
SELECT is(pg_temp.status((SELECT op FROM staff), (SELECT op FROM a))->>'state', 'checking', 'nothing was committed');

-- Proposal B from the newer evidence is approved and applied through the shared writer.
CREATE TEMP TABLE b AS SELECT pg_temp.prepare('f3000000-0000-4000-8000-000000000001', (SELECT id FROM a_obs)) p, gen_random_uuid() op;
SELECT pg_temp.approve((SELECT p FROM b));
CREATE TEMP TABLE b_begin AS SELECT pg_temp.begin((SELECT op FROM staff), pg_temp.command((SELECT p FROM b), (SELECT op FROM b))) b;
CREATE TEMP TABLE b_obs AS SELECT pg_temp.record((SELECT (b->>'jobId')::uuid FROM b_begin),
  pg_temp.facts('f3000000-0000-4000-8000-000000000001', true)) id;
SELECT throws_ok(format('SELECT pg_temp.execute((SELECT owner FROM staff), %L, %L)', (SELECT op FROM b), (SELECT id FROM b_obs)),
  'P0002', 'ADM_NOT_FOUND', 'only the person who started the operation commits it');
CREATE TEMP TABLE b_receipt AS SELECT pg_temp.execute((SELECT op FROM staff), (SELECT op FROM b), (SELECT id FROM b_obs)) r;
SELECT is((SELECT r->>'state' FROM b_receipt), 'applied', 'the approved repair is applied');
SELECT is((SELECT r->'effects' FROM b_receipt), (SELECT p->'effects' FROM b), 'exactly the approved effects');
SELECT is((SELECT jsonb_build_array(r->>'proposalId', r->>'verification') FROM b_receipt), (SELECT jsonb_build_array(p->>'id', 'pending') FROM b),
  'the receipt names its proposal and awaits a post-check');
SELECT ok(private.collection_has_access('f3000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000003')
  AND EXISTS (SELECT 1 FROM private.payment_refunds WHERE provider_refund_id = 're_support_2'),
  'the customer has the collection and the newly verified refund is recorded');
SELECT is((SELECT metadata->>'approvalId' FROM private.access_events WHERE id = (SELECT (r->>'auditId')::uuid FROM b_receipt)),
  (SELECT approval_id::text FROM private.support_operations WHERE operation_id = (SELECT op FROM b)), 'the audit event names the approval');
SELECT is(pg_temp.execute((SELECT op FROM staff), (SELECT op FROM b), (SELECT id FROM b_obs)), (SELECT r FROM b_receipt),
  'committing again returns the stored receipt');
SELECT is(pg_temp.status((SELECT op FROM staff), (SELECT op FROM b)), (SELECT r FROM b_receipt), 'a lost response is recovered by reading');
SELECT is(pg_temp.status((SELECT owner FROM staff), (SELECT op FROM b)), (SELECT r FROM b_receipt), 'the approver can read it too');
SELECT throws_ok(format('SELECT pg_temp.status((SELECT viewer FROM staff), %L)', (SELECT op FROM b)), 'P0002', 'ADM_NOT_FOUND',
  'other staff cannot read the receipt');
SELECT throws_ok($$UPDATE private.support_operations SET case_id = NULL$$, '42501', 'ADM_IMMUTABLE', 'a committed operation cannot change');

-- A projection rebuild reprojects only: the purchase source and payment facts stay as they were.
SELECT pg_temp.new_order(1, true);
CREATE TEMP TABLE c AS SELECT pg_temp.prepare('f3000000-0000-4000-8000-000000000901',
 pg_temp.diagnose('f3000000-0000-4000-8000-000000000901'), 'rebuild_projection') p, gen_random_uuid() op;
SELECT pg_temp.approve((SELECT p FROM c));
CREATE TEMP TABLE c_begin AS SELECT pg_temp.begin((SELECT op FROM staff), pg_temp.command((SELECT p FROM c), (SELECT op FROM c))) b;
CREATE TEMP TABLE c_receipt AS SELECT pg_temp.execute((SELECT op FROM staff), (SELECT op FROM c),
  pg_temp.record((SELECT (b->>'jobId')::uuid FROM c_begin), pg_temp.facts('f3000000-0000-4000-8000-000000000901'))) r;
SELECT ok((SELECT r->>'state' = 'applied' FROM c_receipt) AND private.collection_has_access('f3000000-0000-4000-8000-000000000801',
  'f3000000-0000-4000-8000-000000000003'), 'a missing projection is rebuilt');
SELECT ok(NOT EXISTS (SELECT 1 FROM private.commerce_reconcile_receipts WHERE operation_id = (SELECT op FROM c))
  AND (SELECT event_type FROM private.access_events WHERE id = (SELECT (r->>'auditId')::uuid FROM c_receipt)) = 'support_repair',
  'without going through the payment writer');

-- If the approved rights already exist when the repair commits, it is already satisfied.
SELECT pg_temp.new_order(2, false);
CREATE TEMP TABLE d AS SELECT pg_temp.prepare('f3000000-0000-4000-8000-000000000902', pg_temp.diagnose('f3000000-0000-4000-8000-000000000902')) p,
 gen_random_uuid() op;
SELECT pg_temp.approve((SELECT p FROM d));
CREATE TEMP TABLE d_begin AS SELECT pg_temp.begin((SELECT op FROM staff), pg_temp.command((SELECT p FROM d), (SELECT op FROM d))) b;
INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, valid_from)
VALUES ('f3000000-0000-4000-8000-000000000802', 'f3000000-0000-4000-8000-000000000004', 'stripe_purchase',
  'f3000000-0000-4000-8000-000000000902', true, now());
SELECT private.project_user_entitlement('f3000000-0000-4000-8000-000000000802', 'f3000000-0000-4000-8000-000000000004');
SELECT is(pg_temp.execute((SELECT op FROM staff), (SELECT op FROM d), pg_temp.record((SELECT (b->>'jobId')::uuid FROM d_begin),
  pg_temp.facts('f3000000-0000-4000-8000-000000000902')))->>'state', 'already_satisfied', 'a repair a webhook already completed is satisfied');

-- An order that changes during the check fails without committing; a case must belong to the order.
SELECT pg_temp.new_order(3, false);
CREATE TEMP TABLE e AS SELECT pg_temp.prepare('f3000000-0000-4000-8000-000000000903', pg_temp.diagnose('f3000000-0000-4000-8000-000000000903')) p,
 gen_random_uuid() op;
SELECT pg_temp.approve((SELECT p FROM e));
INSERT INTO private.support_cases(order_id, user_id, category, state, created_by)
VALUES ('f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000002', 'missing_access', 'open',
  'f3000000-0000-4000-8000-0000000000a2');
SELECT throws_ok(format('SELECT pg_temp.begin((SELECT op FROM staff), %L)', pg_temp.command((SELECT p FROM e), gen_random_uuid(),
  (SELECT id FROM private.support_cases LIMIT 1))), '22023', 'ADM_INVALID', 'a case on another order cannot be linked');
CREATE TEMP TABLE e_begin AS SELECT pg_temp.begin((SELECT op FROM staff), pg_temp.command((SELECT p FROM e), (SELECT op FROM e))) b;
UPDATE private.purchase_orders SET version = version + 1 WHERE id = 'f3000000-0000-4000-8000-000000000903';
SELECT pg_temp.record((SELECT (b->>'jobId')::uuid FROM e_begin), pg_temp.facts('f3000000-0000-4000-8000-000000000903'));
SELECT is(pg_temp.status((SELECT op FROM staff), (SELECT op FROM e)), jsonb_build_object('operationId', (SELECT op FROM e),
  'state', 'failed_no_commit', 'reasonCode', 'ORDER_CHANGED'), 'an order that changed during the check fails without committing');

-- An expired approval cannot start a repair.
INSERT INTO private.support_proposals(id, actor, operation_id, order_id, observation_id, kind, proposal, digest, blocked, prepared_at, expires_at)
SELECT 'f3000000-0000-4000-8000-000000000940', actor, gen_random_uuid(), order_id, observation_id, kind,
  proposal || '{"id":"f3000000-0000-4000-8000-000000000940"}', digest, false, now() - interval '10 minutes', now() - interval '5 minutes'
FROM private.support_proposals WHERE id = (SELECT (p->>'id')::uuid FROM d);
INSERT INTO private.support_approvals(proposal_id, digest, authoriser, channel, approved_at, expires_at)
SELECT 'f3000000-0000-4000-8000-000000000940', digest, '92000000-0000-0000-0000-000000000001', 'web', now() - interval '9 minutes',
  now() - interval '5 minutes' FROM private.support_proposals WHERE id = 'f3000000-0000-4000-8000-000000000940';
SELECT throws_ok(format('SELECT pg_temp.begin((SELECT op FROM staff), %L)', jsonb_build_object('operationId', gen_random_uuid(),
  'proposalId', 'f3000000-0000-4000-8000-000000000940', 'expectedDigest', (SELECT p->>'digest' FROM d), 'caseId', NULL)),
  'PT409', 'ADM_STALE', 'an expired approval cannot start a repair');

SELECT * FROM finish();
ROLLBACK;
