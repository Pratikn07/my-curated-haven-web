BEGIN;
SELECT plan(31);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

-- Staff: 92...01 owner, ...0a1 support viewer, ...0a2 support operator.
CREATE FUNCTION pg_temp.owner(p_sql text) RETURNS jsonb LANGUAGE sql AS $$ SELECT pg_temp.support_as('92000000-0000-0000-0000-000000000001', 'aal2', p_sql) $$;
CREATE FUNCTION pg_temp.viewer(p_sql text) RETURNS jsonb LANGUAGE sql AS $$ SELECT pg_temp.support_as('f3000000-0000-4000-8000-0000000000a1', 'aal2', p_sql) $$;
CREATE FUNCTION pg_temp.operator(p_sql text) RETURNS jsonb LANGUAGE sql AS $$ SELECT pg_temp.support_as('f3000000-0000-4000-8000-0000000000a2', 'aal2', p_sql) $$;
-- A complete check of order ...001 recorded at a chosen time, with its own finished job.
CREATE FUNCTION pg_temp.old_observation(p_days integer) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_job uuid; v_obs uuid; v_facts jsonb := jsonb_build_object('accountId','acct_support_test','mode','test','sessionId','cs_test_support',
  'paymentIntentId','pi_support','chargeId','ch_support','capturedMinor',1500,'currency','usd','paymentState','paid','paidAt','2026-10-01T10:00:00Z',
  'refunds',jsonb_build_array(jsonb_build_object('id','re_support_1','paymentIntentId','pi_support','chargeId','ch_support','amountMinor',100,
    'currency','usd','status','succeeded','occurredAt','2026-10-02T10:00:00Z')),'disputes','[]'::jsonb);
BEGIN
 INSERT INTO private.commerce_verification_jobs(order_id, purpose, expected_order_version, state, completed_at)
 VALUES ('f3000000-0000-4000-8000-000000000001', 'webhook', 3, 'complete', now() - make_interval(days => p_days)) RETURNING id INTO v_job;
 INSERT INTO private.commerce_provider_observations(job_id, order_id, fence, purpose, facts, complete, blockers, material_digest, api_version,
  verifier, verified_at)
 VALUES (v_job, 'f3000000-0000-4000-8000-000000000001', nextval('private.commerce_verification_fence'), 'webhook', v_facts, true, '[]',
  private.support_digest(v_facts), 'test', 'postgres', now() - make_interval(days => p_days)) RETURNING id INTO v_obs;
 RETURN v_obs;
END $$;

-- Repairs: five new executions a minute per person.
SELECT is(ARRAY(SELECT private.support_consume_budget('f3000000-0000-4000-8000-0000000000a2', 'repair_execute') FROM generate_series(1, 6)),
  ARRAY[true, true, true, true, true, false], 'a sixth new repair in a minute is refused');

-- Retention: owner only, and only once both periods are set.
SELECT throws_ok($$SELECT pg_temp.operator('SELECT public.admin_support_retention_run(gen_random_uuid())')$$, '42501', 'ADM_DENIED',
  'only the owner runs retention');
SELECT throws_ok($$SELECT pg_temp.owner('SELECT public.admin_support_retention_run(gen_random_uuid())')$$, '42501', 'ADM_BLOCKED',
  'retention needs both periods set');
UPDATE private.support_workspace_settings SET stage = 'inspection', note_retention_days = 30, observation_retention_days = 30;
INSERT INTO private.support_cases(id, order_id, user_id, category, state, created_by)
VALUES ('f3000000-0000-4000-8000-000000000960', 'f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000002',
  'missing_access', 'open', 'f3000000-0000-4000-8000-0000000000a2');
INSERT INTO private.support_case_events(id, case_id, action, actor_id, at, state, operation_id) VALUES
 ('f3000000-0000-4000-8000-000000000961', 'f3000000-0000-4000-8000-000000000960', 'append_note', 'f3000000-0000-4000-8000-0000000000a2',
  now() - interval '40 days', 'open', gen_random_uuid()),
 ('f3000000-0000-4000-8000-000000000962', 'f3000000-0000-4000-8000-000000000960', 'append_note', 'f3000000-0000-4000-8000-0000000000a2',
  now() - interval '2 days', 'open', gen_random_uuid());
INSERT INTO private.support_note_texts(event_id, text) VALUES ('f3000000-0000-4000-8000-000000000961', 'Old private note'),
 ('f3000000-0000-4000-8000-000000000962', 'Recent private note');
CREATE TEMP TABLE obs AS SELECT pg_temp.old_observation(40) expired, pg_temp.old_observation(40) held, pg_temp.old_observation(2) fresh,
 gen_random_uuid() op;
-- A proposal still waiting for approval relies on the second old check.
INSERT INTO private.support_proposals(id, actor, operation_id, order_id, observation_id, kind, proposal, digest, blocked, expires_at)
VALUES ('f3000000-0000-4000-8000-000000000963', 'f3000000-0000-4000-8000-0000000000a2', gen_random_uuid(), 'f3000000-0000-4000-8000-000000000001',
  (SELECT held FROM obs), 'reconcile_order', '{}', repeat('e', 64), false, now() + interval '4 minutes');
CREATE TEMP TABLE run AS SELECT pg_temp.owner(format('SELECT public.admin_support_retention_run(%L)', (SELECT op FROM obs))) r;
SELECT is((SELECT r FROM run), '{"notesRedacted": 1, "noticesRedacted": 0, "observationsMinimised": 1}'::jsonb, 'one expired note and one expired check are cleared');
SELECT is((SELECT jsonb_build_array(text, redaction_reason) FROM private.support_note_texts WHERE event_id = 'f3000000-0000-4000-8000-000000000961'),
  '[null, "Retention period ended"]'::jsonb, 'the expired note text is gone, with the reason kept');
SELECT is((SELECT text FROM private.support_note_texts WHERE event_id = 'f3000000-0000-4000-8000-000000000962'), 'Recent private note',
  'a recent note is untouched');
SELECT is((SELECT count(*)::int FROM private.support_case_events WHERE action = 'redact_note' AND amends_event_id = 'f3000000-0000-4000-8000-000000000961'),
  1, 'the case keeps a record of the redaction');
SELECT ok((SELECT facts->>'paymentIntentId' IS NULL AND facts->'refunds'->0->>'id' = 'redacted' AND facts->>'capturedMinor' = '1500'
  AND facts->'refunds'->0->>'amountMinor' = '100' FROM private.commerce_provider_observations WHERE id = (SELECT expired FROM obs)),
  'an expired check keeps amounts and statuses but no provider ids');
SELECT is((SELECT material_digest FROM private.commerce_provider_observations WHERE id = (SELECT expired FROM obs)),
  (SELECT material_digest FROM private.commerce_provider_observations WHERE id = (SELECT fresh FROM obs)),
  'its evidence digest is unchanged');
SELECT ok((SELECT minimised_at IS NULL AND facts->>'paymentIntentId' = 'pi_support' FROM private.commerce_provider_observations
  WHERE id = (SELECT held FROM obs)), 'a check that a pending proposal relies on is kept whole');
SELECT is(pg_temp.owner(format('SELECT public.admin_support_retention_run(%L)', (SELECT op FROM obs))), (SELECT r FROM run),
  'repeating the retention run returns its first result');
SELECT is((SELECT count(*)::int FROM private.commerce_provider_observations WHERE minimised_at IS NOT NULL), 1, 'and changes nothing more');
SELECT throws_ok(format('UPDATE private.commerce_provider_observations SET facts = private.commerce_minimised_facts(facts), minimised_at = now() WHERE id = %L',
  (SELECT fresh FROM obs)), '42501', 'ADM_IMMUTABLE', 'checks cannot be minimised outside a retention run');
SELECT set_config('mch.support_retention', 'on', true);
SELECT throws_ok(format('UPDATE private.commerce_provider_observations SET material_digest = repeat(''0'', 64) WHERE id = %L',
  (SELECT fresh FROM obs)), '42501', 'ADM_IMMUTABLE', 'and nothing else about a check can change even then');
SELECT set_config('mch.support_retention', 'off', true);

-- Stages: diagnosis and repair wait for the verifier, retention and an approved policy; turning down is always allowed.
UPDATE private.support_workspace_settings SET observation_retention_days = NULL;
SELECT is(pg_temp.owner('SELECT public.admin_support_readiness()')->'repair',
  '["access_policy_missing", "observation_retention_unset", "verifier_unregistered"]'::jsonb, 'readiness names what repair still needs');
SELECT throws_ok($$SELECT pg_temp.owner('SELECT public.admin_support_set_stage(''repair'', ''Go live'', gen_random_uuid())')$$, '42501',
  'ADM_BLOCKED', 'repair cannot be switched on while anything is missing');
SELECT throws_ok($$SELECT pg_temp.operator('SELECT public.admin_support_set_stage(''disabled'', ''Stop'', gen_random_uuid())')$$, '42501',
  'ADM_DENIED', 'only the owner changes the stage');
UPDATE private.support_workspace_settings SET observation_retention_days = 90;
SELECT private.commerce_verifier_register(session_user::text, 'Test verifier', '92000000-0000-0000-0000-000000000001');
INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
VALUES ('v1', 'v1', '{"id":"synthetic","approved":true,"version":"synthetic-v1","pendingRefund":"retain","partialRefund":"retain",
  "fullRefund":"ineligible","inquiry":"retain","formalOpen":"hold","formalLost":"ineligible","duration":"indefinite","fixedSeconds":null}',
  '92000000-0000-0000-0000-000000000001', 'Synthetic test mapping');
SELECT is(pg_temp.owner('SELECT public.admin_support_set_stage(''repair'', ''Ready'', gen_random_uuid())'), '{"stage": "repair"}'::jsonb,
  'with everything in place repair can be switched on');
SELECT is(pg_temp.owner('SELECT public.admin_support_set_stage(''disabled'', ''Pause'', gen_random_uuid())'), '{"stage": "disabled"}'::jsonb,
  'and support can always be switched off');
UPDATE private.support_workspace_settings SET stage = 'inspection';

-- Metrics: counts only, per mode.
INSERT INTO private.commerce_verification_jobs(order_id, purpose, expected_order_version, created_at)
VALUES ('f3000000-0000-4000-8000-000000000001', 'recovery', 3, now() - interval '10 minutes');
INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, ineligibility_reason)
VALUES ('f3000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000004', 'stripe_purchase',
  'f3000000-0000-4000-8000-000000000001', false, 'manual_hold');
CREATE TEMP TABLE m AS SELECT pg_temp.viewer('SELECT public.admin_support_metrics(''test'')') m;
SELECT is((SELECT (m->>'pendingChecks')::int FROM m), 1, 'waiting provider checks are counted');
SELECT ok((SELECT (m->>'oldestPendingCheckSeconds')::int BETWEEN 590 AND 700 FROM m), 'with the age of the oldest');
SELECT is((SELECT (m->>'unresolvedMismatches')::int FROM m), 1, 'a paid order whose source is off is counted as a mismatch');
SELECT is((SELECT jsonb_object_keys_sorted FROM (SELECT array_to_string(ARRAY(SELECT jsonb_object_keys(m) ORDER BY 1), ',') jsonb_object_keys_sorted FROM m) x),
  'blockedRepairReasons,mode,oldestPendingCheckSeconds,pendingChecks,postchecks,repairs,unresolvedMismatches,unresolvedRefunds,webhookEvents',
  'metrics hold only the approved counts');
SELECT ok((SELECT m::text !~ '(@|pi_|ch_|re_|cs_|acct_|MCH-)' FROM m), 'and no email, provider id or order reference');
SELECT is((SELECT (m->>'pendingChecks')::int FROM (SELECT pg_temp.viewer('SELECT public.admin_support_metrics(''live'')') m) x), 0,
  'live and test are counted apart');
SELECT throws_ok($$SELECT pg_temp.viewer('SELECT public.admin_support_metrics(''all'')')$$, '22023', 'ADM_INVALID', 'only one mode at a time');

-- Grants: nothing private is reachable from a browser, and public support functions need a signed-in session.
SELECT is((SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private'
  AND (p.proname LIKE 'support%' OR p.proname LIKE 'commerce%')
  AND (has_function_privilege('authenticated', p.oid, 'EXECUTE') OR has_function_privilege('anon', p.oid, 'EXECUTE'))), 0,
  'no private support or commerce function is executable by browsers');
SELECT is((SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'private' AND c.relkind = 'r'
  AND (c.relname LIKE 'support%' OR c.relname LIKE 'commerce%')
  AND (has_table_privilege('authenticated', c.oid, 'SELECT') OR has_table_privilege('anon', c.oid, 'SELECT'))), 0,
  'no private support or commerce table is readable by browsers');
SELECT is((SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'
  AND p.proname LIKE 'admin_support%' AND has_function_privilege('anon', p.oid, 'EXECUTE')), 0, 'signed-out visitors reach no support function');

-- Read audit keeps what was found, never the search term.
SELECT pg_temp.viewer('SELECT public.admin_support_lookup(''{"kind":"email","value":"first.last+buyer@synthetic.test"}'')');
SELECT is((SELECT count(*)::int FROM private.support_read_audit a WHERE to_jsonb(a)::text LIKE '%@%'), 0,
  'the read audit never stores the email searched');

-- Closing the customer's account keeps the order, its payment history, checks and approvals.
DELETE FROM private.access_sources WHERE user_id = 'f3000000-0000-4000-8000-000000000002';
DELETE FROM auth.users WHERE id = 'f3000000-0000-4000-8000-000000000002';
SELECT ok((SELECT user_id IS NULL AND owner_principal = 'f3000000-0000-4000-8000-000000000002' FROM private.purchase_orders
  WHERE id = 'f3000000-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM private.provider_payments WHERE order_id = 'f3000000-0000-4000-8000-000000000001')
  AND (SELECT count(*) FROM private.commerce_provider_observations WHERE order_id = 'f3000000-0000-4000-8000-000000000001') = 3
  AND EXISTS (SELECT 1 FROM private.support_proposals WHERE id = 'f3000000-0000-4000-8000-000000000963'),
  'account closure keeps the order, payment, checks and proposals');

SELECT * FROM finish();
ROLLBACK;
