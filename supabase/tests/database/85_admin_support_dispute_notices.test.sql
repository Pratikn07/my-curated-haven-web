BEGIN;
SELECT plan(47);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

-- People: 92...01 owner (the only one who may send a notice), ...0a2 support operator. Order ...001 (MCH-1A2B3C) belongs to
-- ...002, whose verified email is first.last+buyer@synthetic.test. This test login is the registered verifier.
CREATE FUNCTION pg_temp.owner(p_sql text, p_aal text DEFAULT 'aal2') RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as('92000000-0000-0000-0000-000000000001', p_aal, p_sql)
$$;
CREATE FUNCTION pg_temp.operator(p_sql text) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as('f3000000-0000-4000-8000-0000000000a2', 'aal2', p_sql)
$$;
CREATE FUNCTION pg_temp.dispute(p_id text, p_status text DEFAULT 'needs_response') RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('id', p_id, 'paymentIntentId', 'pi_support', 'chargeId', 'ch_support', 'amountMinor', 1500, 'currency', 'usd',
  'status', p_status, 'classification', private.support_dispute_classification(p_status), 'deadline', '2026-10-20T23:59:59Z')
$$;
CREATE FUNCTION pg_temp.facts(p_disputes jsonb) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('accountId','acct_support_test','mode','test','sessionId','cs_test_support','paymentIntentId','pi_support',
   'chargeId','ch_support','capturedMinor',1500,'currency','usd','paymentState','paid','paidAt','2026-10-01T10:00:00Z',
   'refunds',jsonb_build_array(jsonb_build_object('id','re_support_1','paymentIntentId','pi_support','chargeId','ch_support',
     'amountMinor',100,'currency','usd','status','succeeded','occurredAt','2026-10-02T10:00:00Z')),'disputes',p_disputes)
$$;
CREATE FUNCTION pg_temp.record(p_job uuid, p_facts jsonb) RETURNS uuid LANGUAGE sql AS $$
 SELECT (private.commerce_observation_record(p_job, (private.commerce_verification_claim(p_job)->>'fence')::bigint, p_facts, true, '[]',
  'test')->>'observationId')::uuid
$$;
-- An owner provider check of order ...001 with the given disputes.
CREATE FUNCTION pg_temp.check(p_disputes jsonb) RETURNS uuid LANGUAGE plpgsql AS $$
BEGIN
 DELETE FROM private.support_rate_buckets;
 RETURN pg_temp.record((pg_temp.owner(format('SELECT public.admin_support_diagnose_begin(%L, %L)', 'f3000000-0000-4000-8000-000000000001',
  gen_random_uuid()))->>'jobId')::uuid, pg_temp.facts(p_disputes));
END $$;
CREATE FUNCTION pg_temp.prepare(p_dispute text, p_obs uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.owner(format('SELECT public.admin_support_notice_prepare(%L, %L, %L)', 'f3000000-0000-4000-8000-000000000001', p_dispute, p_obs))
$$;
CREATE FUNCTION pg_temp.approve(d jsonb) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.owner(format('SELECT public.admin_support_notice_approve(%L, %L)', d->>'id', d->>'digest'))
$$;
CREATE FUNCTION pg_temp.send_check(d jsonb, p_disputes jsonb) RETURNS uuid LANGUAGE plpgsql AS $$
BEGIN
 DELETE FROM private.support_rate_buckets;
 RETURN pg_temp.record((pg_temp.owner(format('SELECT public.admin_support_notice_send_check(%L)', d->>'id'))->>'jobId')::uuid,
  pg_temp.facts(p_disputes));
END $$;
CREATE FUNCTION pg_temp.command(d jsonb, p_op uuid DEFAULT gen_random_uuid()) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('operationId', p_op, 'draftId', d->>'id', 'expectedDigest', d->>'digest')
$$;
CREATE FUNCTION pg_temp.claim(c jsonb, p_obs uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.owner(format('SELECT public.admin_support_notice_send_claim(%L, %L)', c, p_obs))
$$;
SELECT private.commerce_verifier_register(session_user::text, 'Test verifier', '92000000-0000-0000-0000-000000000001');
UPDATE private.support_workspace_settings SET stage = 'diagnosis', notice_retention_days = 90, notice_support_email = 'support@mycuratedhaven.com';

-- Only the signed-in owner may send; nothing private is reachable from a browser or an agent login.
SELECT is((SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'private'
  AND c.relname LIKE 'support_notice%' AND has_table_privilege('authenticated', c.oid, 'SELECT')), 0, 'browsers cannot read notice records');
SELECT is((SELECT array_agg(p.proname::text ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('private','public') AND p.proname LIKE '%notice%' AND (has_function_privilege('mch_support_operator', p.oid, 'EXECUTE')
    OR has_function_privilege('mch_commerce_verifier', p.oid, 'EXECUTE'))),
  ARRAY['support_notice_expire_claim', 'support_notice_payload', 'support_notice_result_record'],
  'agent logins have no notice function; the verifier only reads a claimed email and records the answer');
SELECT is((SELECT dispute_notice_enabled FROM private.support_workspace_settings), false, 'sending notices is switched off by default');
CREATE TEMP TABLE c1 AS SELECT pg_temp.check(jsonb_build_array(pg_temp.dispute('du_support_1', 'warning_needs_response'),
  pg_temp.dispute('du_support_formal'))) obs;
SELECT throws_ok(format('SELECT pg_temp.operator(%L)', format('SELECT public.admin_support_notice_prepare(%L, %L, %L)',
  'f3000000-0000-4000-8000-000000000001', 'du_support_formal', (SELECT obs FROM c1))), '42501', 'ADM_DENIED', 'a support operator cannot prepare a notice');
SELECT throws_ok(format('SELECT pg_temp.owner(%L, %L)', format('SELECT public.admin_support_notice_prepare(%L, %L, %L)',
  'f3000000-0000-4000-8000-000000000001', 'du_support_formal', (SELECT obs FROM c1)), 'aal1'), '42501', 'ADM_MFA_REQUIRED',
  'the owner needs a verified second factor');

-- The approved template, pinned to the same text as its TypeScript twin.
SELECT is(private.support_notice_copy('MCH-TEST-1', 'Weeknight recipes', 'active', 'support@mycuratedhaven.com'),
  jsonb_build_object('subject', 'About your order MCH-TEST-1', 'text', 'Hello,' || E'\n\n'
  || 'Your bank or card issuer has told us that you are disputing the payment for your My Curated Haven order MCH-TEST-1 (Weeknight recipes).'
  || E'\n\n' || 'Your collection remains available through another valid purchase or access source.' || E'\n\n'
  || 'Your bank decides the dispute, and this email does not change it. If you have a question, or you did not mean to dispute this payment, '
  || 'reply to this email or write to support@mycuratedhaven.com and quote MCH-TEST-1.' || E'\n\n' || 'My Curated Haven'),
  'the template renders exactly the approved text');
SELECT ok(private.support_notice_copy('MCH-TEST-1', 'Weeknight recipes', 'denied', 'support@mycuratedhaven.com')->>'text'
  LIKE '%While the dispute is open, the recipes from this purchase are paused. Nothing else in your account changes.%',
  'without another source it says only this purchase is paused');
SELECT ok(private.support_notice_copy('MCH-TEST-1', E'Week\r\nBcc: x@example.com', 'active', 'support@mycuratedhaven.com')->>'text'
  LIKE '%(Week Bcc: x@example.com)%', 'a title cannot break the text into new lines or headers');

-- Preparing: only from the newest complete check, only for a formal open dispute, with everything it depends on.
SELECT throws_ok(format('SELECT pg_temp.prepare(%L, %L)', 'du_elsewhere', (SELECT obs FROM c1)), '22023', 'ADM_INVALID',
  'a dispute the check did not find is refused');
SELECT throws_ok(format('SELECT pg_temp.prepare(%L, %L)', 'dp_support_formal', (SELECT obs FROM c1)), '22023', 'ADM_INVALID',
  'only a provider dispute id is accepted');
SELECT ok((SELECT d->'blockers' ? 'dispute_not_open' FROM (SELECT pg_temp.prepare('du_support_1', (SELECT obs FROM c1)) d) x),
  'an inquiry is not a formal dispute, so no notice');
CREATE TEMP TABLE d1 AS SELECT pg_temp.prepare('du_support_formal', (SELECT obs FROM c1)) d;
SELECT is((SELECT jsonb_build_array(d->>'recipient', d->>'subject', d->>'templateVersion', d->>'respondBy', d->'blockers') FROM d1),
  '["first.last+buyer@synthetic.test", "About your order MCH-1A2B3C", "dispute-opened-v1", "2026-10-20T23:59:59Z", []]'::jsonb,
  'the draft names the verified recipient, the exact subject and the response deadline');
SELECT ok((SELECT d->>'text' LIKE '%order MCH-1A2B3C (Synthetic support shelf).%' FROM d1), 'and renders the order and collection');
SELECT is((SELECT d->>'effectiveAccess' FROM d1), (SELECT CASE WHEN private.collection_has_access('f3000000-0000-4000-8000-000000000002',
  'f3000000-0000-4000-8000-000000000003') THEN 'active' ELSE 'denied' END), 'the access it describes is the customer''s actual access');
SELECT is((SELECT d->>'digest' FROM d1), (SELECT private.support_digest(d - 'id' - 'expiresAt' - 'digest' - 'redacted') FROM d1),
  'its digest covers the recipient and the exact text');
UPDATE auth.users SET email_confirmed_at = NULL WHERE id = 'f3000000-0000-4000-8000-000000000002';
SELECT ok((SELECT d->'blockers' ? 'recipient_unverified' FROM (SELECT pg_temp.prepare('du_support_formal', (SELECT obs FROM c1)) d) x),
  'an unconfirmed email is never a recipient');
UPDATE auth.users SET email_confirmed_at = now() WHERE id = 'f3000000-0000-4000-8000-000000000002';
UPDATE private.support_workspace_settings SET notice_retention_days = NULL;
DELETE FROM private.support_rate_buckets;
SELECT ok((SELECT d->'blockers' ? 'retention_unset' FROM (SELECT pg_temp.prepare('du_support_formal', (SELECT obs FROM c1)) d) x),
  'no notice is prepared until its content has a retention period');
UPDATE private.support_workspace_settings SET notice_retention_days = 90;

-- Approving: owner only, exactly this digest, for five minutes at most, and only while it still describes things.
SELECT throws_ok(format('SELECT pg_temp.operator(%L)', format('SELECT public.admin_support_notice_approve(%L, %L)', (SELECT d->>'id' FROM d1),
  (SELECT d->>'digest' FROM d1))), '42501', 'ADM_DENIED', 'a support operator cannot approve a notice');
SELECT throws_ok(format('SELECT pg_temp.owner(%L)', format('SELECT public.admin_support_notice_approve(%L, %L)', (SELECT d->>'id' FROM d1),
  repeat('0', 64))), 'PT409', 'ADM_STALE', 'the approval names the exact digest');
SELECT throws_ok(format('SELECT pg_temp.approve(%L)', (SELECT d FROM (SELECT pg_temp.prepare('du_support_1', (SELECT obs FROM c1)) d) x)),
  '42501', 'ADM_BLOCKED', 'a blocked draft cannot be approved');
UPDATE auth.users SET email = 'changed+buyer@synthetic.test' WHERE id = 'f3000000-0000-4000-8000-000000000002';
SELECT throws_ok(format('SELECT pg_temp.approve(%L)', (SELECT d FROM d1)), 'PT409', 'ADM_STALE', 'a changed email makes the draft stale');
UPDATE auth.users SET email = 'first.last+buyer@synthetic.test' WHERE id = 'f3000000-0000-4000-8000-000000000002';
CREATE TEMP TABLE a1 AS SELECT pg_temp.approve((SELECT d FROM d1)) a;
SELECT ok((SELECT (a->>'expiresAt')::timestamptz <= clock_timestamp() + interval '5 minutes' AND a->>'channel' = 'web'
  AND a->>'humanAuthoriser' = '92000000-0000-0000-0000-000000000001' FROM a1), 'the owner approves for at most five minutes');
SELECT is(pg_temp.approve((SELECT d FROM d1)), (SELECT a FROM a1), 'approving again returns the same approval');

-- Sending: the repair stage, the switch, a fresh check that still shows the same open dispute.
SELECT throws_ok(format('SELECT pg_temp.send_check(%L, %L)', (SELECT d FROM d1), jsonb_build_array(pg_temp.dispute('du_support_formal'))),
  '42501', 'ADM_DISABLED', 'sending needs the repair stage');
UPDATE private.support_workspace_settings SET stage = 'repair';
SELECT throws_ok(format('SELECT pg_temp.send_check(%L, %L)', (SELECT d FROM d1), jsonb_build_array(pg_temp.dispute('du_support_formal'))),
  '42501', 'ADM_DISABLED', 'and the notice switch');
UPDATE private.support_workspace_settings SET dispute_notice_enabled = true;
SELECT throws_ok(format('SELECT pg_temp.claim(%L, %L)', pg_temp.command((SELECT d FROM d1)), (SELECT obs FROM c1)), '22023', 'ADM_INVALID',
  'the preparation check cannot stand in for a send check');
SELECT throws_ok(format('SELECT pg_temp.claim(%L, %L)', pg_temp.command((SELECT d FROM d1)),
  pg_temp.send_check((SELECT d FROM d1), jsonb_build_array(pg_temp.dispute('du_support_formal', 'won')))), 'PT409', 'ADM_STALE',
  'a dispute resolved since approval stops the email');
CREATE TEMP TABLE k1 AS SELECT pg_temp.command((SELECT d FROM d1)) c,
  pg_temp.send_check((SELECT d FROM d1), jsonb_build_array(pg_temp.dispute('du_support_formal'))) obs;
CREATE TEMP TABLE claim1 AS SELECT pg_temp.claim((SELECT c FROM k1), (SELECT obs FROM k1)) k;
SELECT ok((SELECT (k->>'fence')::bigint > 0 AND (k->>'expiresAt')::timestamptz <= clock_timestamp() + interval '10 seconds' FROM claim1),
  'the send is claimed once, for ten seconds at most');
SELECT throws_ok(format('SELECT pg_temp.claim(%L, %L)', pg_temp.command((SELECT d FROM d1)), (SELECT obs FROM k1)), 'PT409', 'ADM_CONFLICT',
  'a second operation cannot send the same draft');
SELECT throws_ok(format('SELECT private.support_notice_payload(%L, %s)', (SELECT c->>'operationId' FROM k1), (SELECT (k->>'fence')::bigint - 1 FROM claim1)),
  'PT409', 'ADM_STALE', 'an old fence cannot read the email');
SELECT is((SELECT p - 'operationId' - 'mode' FROM (SELECT private.support_notice_payload((SELECT (c->>'operationId')::uuid FROM k1),
  (SELECT (k->>'fence')::bigint FROM claim1)) p) x), (SELECT jsonb_build_object('recipient', d->>'recipient', 'subject', d->>'subject',
  'text', d->>'text') FROM d1), 'the email sent is exactly the approved one');

-- Answers: a lost answer is unknown and blocks another email; acceptance is recorded late; nothing stale frees the dispute.
SELECT is((SELECT r->>'state' FROM (SELECT private.support_notice_result_record((SELECT (c->>'operationId')::uuid FROM k1),
  (SELECT (k->>'fence')::bigint FROM claim1), '{"kind":"unknown","code":"TRANSPORT_TIMEOUT"}') r) x), 'outcome_unknown',
  'a lost answer is recorded as unknown');
SELECT ok((SELECT d->'blockers' ? 'already_sent' FROM (SELECT pg_temp.prepare('du_support_formal',
  pg_temp.check(jsonb_build_array(pg_temp.dispute('du_support_formal')))) d) x), 'so a new notice for that dispute is blocked');
SELECT throws_ok(format('SELECT private.support_notice_result_record(%L, %s, %L)', (SELECT c->>'operationId' FROM k1), (SELECT k->>'fence' FROM claim1),
  '{"kind":"not_executed","code":"MESSAGE_REJECTED"}'), 'PT409', 'ADM_STALE', 'a late "not sent" cannot free the dispute');
UPDATE private.support_workspace_settings SET dispute_notice_enabled = false;
SELECT is((SELECT jsonb_build_array(r->>'state', r->>'providerMessageId', r->>'delivery') FROM (SELECT private.support_notice_result_record(
  (SELECT (c->>'operationId')::uuid FROM k1), 0, '{"kind":"accepted","providerMessageId":"msg-support-1"}') r) x),
  '["accepted", "msg-support-1", "unconfirmed"]'::jsonb, 'a late acceptance is recorded with the switch off, and delivery stays unconfirmed');
SELECT throws_ok(format('SELECT private.support_notice_result_record(%L, 0, %L)', (SELECT c->>'operationId' FROM k1),
  '{"kind":"accepted","providerMessageId":"msg-other"}'), 'PT409', 'ADM_CONFLICT', 'a second acceptance cannot replace it');
UPDATE private.support_workspace_settings SET dispute_notice_enabled = true;
SELECT is(pg_temp.owner(format('SELECT public.admin_support_notice_operation(%L)', (SELECT c->>'operationId' FROM k1)))->>'state', 'accepted',
  'the owner reads the receipt');
SELECT throws_ok(format('SELECT pg_temp.operator(%L)', format('SELECT public.admin_support_notice_operation(%L)', (SELECT c->>'operationId' FROM k1))),
  '42501', 'ADM_DENIED', 'support staff cannot');
SELECT is((SELECT e->>'state' FROM jsonb_array_elements(pg_temp.owner(format('SELECT public.admin_support_notices(%L)',
  'f3000000-0000-4000-8000-000000000001'))->'items') e WHERE e->'draft'->>'id' = (SELECT d->>'id' FROM d1)), 'started',
  'the owner''s list marks the sent draft');

-- A claim that runs out without an answer becomes unknown, never "not sent".
CREATE TEMP TABLE d2 AS SELECT pg_temp.prepare('du_support_formal_2', pg_temp.check(jsonb_build_array(pg_temp.dispute('du_support_formal'),
  pg_temp.dispute('du_support_formal_2')))) d;
SELECT lives_ok(format('SELECT pg_temp.approve(%L)', (SELECT d FROM d2)), 'a second dispute gets its own notice');
CREATE TEMP TABLE k2 AS SELECT pg_temp.command((SELECT d FROM d2)) c;
CREATE TEMP TABLE claim2 AS SELECT pg_temp.claim((SELECT c FROM k2), pg_temp.send_check((SELECT d FROM d2),
  jsonb_build_array(pg_temp.dispute('du_support_formal'), pg_temp.dispute('du_support_formal_2')))) k;
UPDATE private.support_notice_sends SET claim_until = clock_timestamp() - interval '1 second' WHERE operation_id = (SELECT (c->>'operationId')::uuid FROM k2);
SELECT is((SELECT r->>'reasonCode' FROM (SELECT private.support_notice_expire_claim((SELECT (c->>'operationId')::uuid FROM k2)) r) x), 'CLAIM_EXPIRED',
  'a claim that ran out becomes unknown');
SELECT throws_ok(format('SELECT private.support_notice_payload(%L, %s)', (SELECT c->>'operationId' FROM k2), (SELECT k->>'fence' FROM claim2)),
  'PT409', 'ADM_STALE', 'and its email can no longer be read for sending');

-- Retention removes old recipients and text, except for a notice whose send is unresolved; digests and receipts stay.
SET LOCAL session_replication_role = replica;
UPDATE private.support_notice_drafts SET prepared_at = prepared_at - interval '91 days' WHERE order_id = 'f3000000-0000-4000-8000-000000000001';
SET LOCAL session_replication_role = origin;
UPDATE private.support_workspace_settings SET note_retention_days = 365, observation_retention_days = 365;
SELECT ok((pg_temp.owner('SELECT public.admin_support_retention_run(gen_random_uuid())')->>'noticesRedacted')::int > 0,
  'retention removes the content of old notices');
SELECT is((SELECT jsonb_build_array(redacted_at IS NOT NULL, recipient, digest = (SELECT d->>'digest' FROM d1)) FROM private.support_notice_drafts
  WHERE id = (SELECT (d->>'id')::uuid FROM d1)), '[true, null, true]'::jsonb, 'the sent notice keeps its digest but not its recipient');
SELECT is((SELECT redacted_at FROM private.support_notice_drafts WHERE id = (SELECT (d->>'id')::uuid FROM d2)), NULL,
  'a notice whose send is unknown keeps its content for investigation');

-- The accepted policy: a formal open dispute holds that purchase; an inquiry keeps it; nothing expires on a schedule.
CREATE TEMP TABLE pol AS SELECT '{"id":"accepted","approved":true,"version":"accepted-v1","pendingRefund":"retain","partialRefund":"retain",
  "fullRefund":"ineligible","inquiry":"retain","formalOpen":"hold","formalLost":"ineligible","duration":"indefinite","fixedSeconds":null}'::jsonb p;
CREATE FUNCTION pg_temp.judge(p_disputes jsonb) RETURNS jsonb LANGUAGE sql AS $$
 SELECT private.commerce_evaluate(jsonb_build_object('facts', pg_temp.facts(p_disputes), 'binding', jsonb_build_object('accountId', 'acct_support_test',
  'mode', 'test', 'sessionId', 'cs_test_support', 'expectedCapturedMinor', 1500, 'currency', 'usd'), 'policy', (SELECT p FROM pol),
  'accountActive', true, 'manualHold', false, 'now', '2036-10-10T00:00:00Z'))
$$;
SELECT is((SELECT jsonb_build_array(j->>'state', j->'reasons' ? 'dispute_hold') FROM (SELECT pg_temp.judge(jsonb_build_array(pg_temp.dispute('du_support_formal'))) j) x),
  '["ineligible", true]'::jsonb, 'a formal open dispute holds that purchase');
SELECT is((SELECT jsonb_build_array(j->>'state', j->'expiresAt') FROM (SELECT pg_temp.judge(jsonb_build_array(pg_temp.dispute('du_support_1', 'warning_needs_response'))) j) x),
  '["eligible", null]'::jsonb, 'an inquiry keeps it, and ten years on nothing has expired');

SELECT * FROM finish();
ROLLBACK;
