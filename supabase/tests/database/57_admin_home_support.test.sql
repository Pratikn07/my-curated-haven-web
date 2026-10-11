BEGIN;
SELECT plan(19);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

-- People: 92...01 owner, 92...03 recipe editor, f3...a1 support viewer, f3...a2 support operator. Order ...001 (MCH-1A2B3C)
-- is paid and verified, belongs to ...002, and has a dispute inquiry (du_support_1).
CREATE FUNCTION pg_temp.results(p_user uuid, p_limit int DEFAULT 10, p_aal text DEFAULT 'aal2') RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as(p_user, p_aal, format('SELECT public.admin_home_support_results(%s)', p_limit))
$$;
CREATE FUNCTION pg_temp.queue() RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as('f3000000-0000-4000-8000-0000000000a1', 'aal2', 'SELECT public.admin_support_queue(''test'', NULL)')->'items'
$$;
UPDATE private.support_workspace_settings SET stage = 'repair';

-- Synthetic outcomes, written directly with constraints paused (this transaction rolls back): a repair the operator ran
-- and the owner approved, an owner refund whose outcome is unknown, and an owner notice that was accepted.
SET LOCAL session_replication_role = replica;
INSERT INTO private.support_proposals(id, actor, operation_id, order_id, observation_id, kind, proposal, digest, blocked, expires_at)
VALUES ('f3000000-0000-4000-8000-0000000000c1', 'f3000000-0000-4000-8000-0000000000a2', gen_random_uuid(), 'f3000000-0000-4000-8000-000000000001',
 gen_random_uuid(), 'reconcile_order', '{}', repeat('a', 64), false, now() + interval '5 minutes');
INSERT INTO private.support_approvals(id, proposal_id, digest, authoriser, channel, expires_at)
VALUES ('f3000000-0000-4000-8000-0000000000c2', 'f3000000-0000-4000-8000-0000000000c1', repeat('a', 64), '92000000-0000-0000-0000-000000000001',
 'web', now() + interval '5 minutes');
INSERT INTO private.support_operations(operation_id, actor, proposal_id, approval_id, command, job_id, state, receipt, created_at, committed_at)
VALUES ('f3000000-0000-4000-8000-0000000000c3', 'f3000000-0000-4000-8000-0000000000a2', 'f3000000-0000-4000-8000-0000000000c1',
 'f3000000-0000-4000-8000-0000000000c2', '{}', gen_random_uuid(), 'committed',
 '{"operationId":"f3000000-0000-4000-8000-0000000000c3","state":"applied","orderId":"f3000000-0000-4000-8000-000000000001"}',
 now() - interval '3 hours', now() - interval '3 hours');
INSERT INTO private.support_refund_intents(operation_id, proposal_id, approval_id, actor, order_id, command, account_id, mode, payment_intent_id,
 charge_id, amount_minor, currency, provider_reason, exception_category, idempotency_key, request_digest, state, audit_id, updated_at)
VALUES ('f3000000-0000-4000-8000-0000000000c4', gen_random_uuid(), gen_random_uuid(), '92000000-0000-0000-0000-000000000001',
 'f3000000-0000-4000-8000-000000000001', '{}', 'acct_support_test', 'test', 'pi_support', 'ch_support', 400, 'usd', 'requested_by_customer',
 'billing_error', 'mch-support-refund-home', repeat('b', 64), 'outcome_unknown', gen_random_uuid(), now() - interval '2 hours');
INSERT INTO private.support_notices(id, account_id, mode, dispute_id, notice_type, order_id)
VALUES ('f3000000-0000-4000-8000-0000000000c5', 'acct_support_test', 'test', 'du_home_formal', 'dispute_opened', 'f3000000-0000-4000-8000-000000000001');
INSERT INTO private.support_notice_sends(operation_id, notice_id, draft_id, approval_id, actor, command, request_digest, state, fence,
 provider_message_id, audit_id, updated_at)
VALUES ('f3000000-0000-4000-8000-0000000000c6', 'f3000000-0000-4000-8000-0000000000c5', gen_random_uuid(), gen_random_uuid(),
 '92000000-0000-0000-0000-000000000001', '{}', repeat('c', 64), 'accepted', 1, 'msg-home-1', gen_random_uuid(), now() - interval '1 hour');
SET LOCAL session_replication_role = origin;

-- Results: each person sees only outcomes they ran or approved, and only while they hold the right.
SELECT is(pg_temp.results('92000000-0000-0000-0000-000000000003'), '[]'::jsonb, 'a recipe editor gets no support results');
SELECT is(pg_temp.results('f3000000-0000-4000-8000-0000000000a1'), '[]'::jsonb, 'a support viewer with no operations gets none');
SELECT is((SELECT jsonb_agg(r->>'kind') FROM jsonb_array_elements(pg_temp.results('f3000000-0000-4000-8000-0000000000a2')) r), '["repair"]'::jsonb,
  'the operator sees the repair they ran');
SELECT is((SELECT jsonb_agg(jsonb_build_array(r->>'kind', r->>'state')) FROM jsonb_array_elements(pg_temp.results('92000000-0000-0000-0000-000000000001')) r),
  '[["notice", "accepted"], ["refund", "outcome_unknown"], ["repair", "applied"]]'::jsonb,
  'the owner sees the repair they approved, their refund still unknown and their notice, newest first');
SELECT is(jsonb_array_length(pg_temp.results('92000000-0000-0000-0000-000000000001', 2)), 2, 'the limit holds');
SELECT is((SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(pg_temp.results('92000000-0000-0000-0000-000000000001')->0) k),
  ARRAY['at','kind','operationId','orderId','state','supportReference'], 'a result carries only safe facts');
SELECT ok(pg_temp.results('92000000-0000-0000-0000-000000000001')::text !~ '(@|pi_|ch_|re_|acct_|msg-|amount|Minor)',
  'and no email, provider id, message id or amount');
SELECT is(pg_temp.results('92000000-0000-0000-0000-000000000001')->0->>'supportReference', 'MCH-1A2B3C', 'the order is named by its support reference');
SELECT throws_ok($$SELECT pg_temp.results('92000000-0000-0000-0000-000000000001', 11)$$, '22023', 'ADM_INVALID', 'at most ten');
SELECT throws_ok($$SELECT pg_temp.results('92000000-0000-0000-0000-000000000001', 10, 'aal1')$$, '42501', 'ADM_MFA_REQUIRED',
  'a session without a second factor gets nothing');
UPDATE private.admin_memberships SET active = false WHERE user_id = 'f3000000-0000-4000-8000-0000000000a2';
SELECT throws_ok($$SELECT pg_temp.results('f3000000-0000-4000-8000-0000000000a2')$$, '42501', 'ADM_DENIED', 'a revoked operator gets nothing');
UPDATE private.admin_memberships SET active = true WHERE user_id = 'f3000000-0000-4000-8000-0000000000a2';
UPDATE private.support_workspace_settings SET stage = 'disabled';
SELECT is(pg_temp.results('92000000-0000-0000-0000-000000000001'), '[]'::jsonb, 'with support switched off there are no support results');
UPDATE private.support_workspace_settings SET stage = 'repair';
SELECT is(has_function_privilege('anon', 'public.admin_home_support_results(int)', 'EXECUTE'), false, 'signed-out visitors cannot call it');

-- The queue: a paid order without access is blocked; a formal dispute carries Stripe's deadline; an inquiry carries none.
INSERT INTO private.support_cases(id, order_id, user_id, category, state, created_by)
VALUES ('f3000000-0000-4000-8000-0000000000c7', 'f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000002', 'missing_access',
 'open', 'f3000000-0000-4000-8000-0000000000a2');
DELETE FROM public.access_entitlements WHERE user_id = 'f3000000-0000-4000-8000-000000000002';
SELECT is((SELECT i->>'accessConsequence' FROM jsonb_array_elements(pg_temp.queue()) i WHERE i->>'caseId' = 'f3000000-0000-4000-8000-0000000000c7'),
  'blocked', 'a verified paid order without access is blocked');
UPDATE private.payment_disputes SET response_deadline = '2026-10-15T23:59:59Z' WHERE provider_dispute_id = 'du_support_1';
SELECT is((SELECT i->'deadlineAt' FROM jsonb_array_elements(pg_temp.queue()) i WHERE i->>'reasonCode' = 'DISPUTE_INQUIRY'), 'null'::jsonb,
  'an inquiry shows no response deadline');
INSERT INTO private.payment_disputes(provider_dispute_id, order_id, payment_id, amount, currency, status, access_effect, response_deadline)
VALUES ('du_home_formal', 'f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000031', 1500, 'usd', 'needs_response', 'held',
 '2026-10-20T23:59:59Z');
SELECT is((SELECT (i->>'deadlineAt')::timestamptz FROM jsonb_array_elements(pg_temp.queue()) i WHERE i->>'reasonCode' = 'DISPUTE_OPEN'),
  '2026-10-20T23:59:59Z'::timestamptz, 'a formal dispute shows Stripe''s response deadline');
SELECT is((SELECT i->>'accessConsequence' FROM jsonb_array_elements(pg_temp.queue()) i WHERE i->>'reasonCode' = 'DISPUTE_OPEN'), 'at_risk',
  'and puts access at risk');
SELECT is((SELECT i->>'accessConsequence' FROM jsonb_array_elements(pg_temp.queue()) i WHERE i->>'caseId' = 'f3000000-0000-4000-8000-0000000000c7'),
  'at_risk', 'once a formal dispute is open, the missing access is at risk rather than plainly blocked');
SELECT is((SELECT count(*)::int FROM jsonb_array_elements(pg_temp.queue()) i WHERE NOT (i ? 'deadlineAt' AND i ? 'accessConsequence')), 0,
  'every queue item says its deadline and access consequence');

SELECT * FROM finish();
ROLLBACK;
