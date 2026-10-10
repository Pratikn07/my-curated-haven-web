BEGIN;
SELECT plan(36);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

CREATE FUNCTION pg_temp.begin_check(p_user uuid, p_order uuid, p_op uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as(p_user, 'aal2', format('SELECT public.admin_support_diagnose_begin(%L, %L)', p_order, p_op))
$$;
CREATE FUNCTION pg_temp.facts(p_refunds jsonb DEFAULT '[]') RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('accountId','acct_support_test','mode','test','sessionId','cs_test_support','paymentIntentId','pi_support',
   'chargeId','ch_support','capturedMinor',1500,'currency','usd','paymentState','paid','paidAt','2026-10-01T10:00:00Z',
   'refunds',p_refunds,'disputes','[]'::jsonb)
$$;
CREATE TEMP TABLE ids AS SELECT 'f3000000-0000-4000-8000-0000000000a2'::uuid op, 'f3000000-0000-4000-8000-0000000000a1'::uuid viewer,
 'f3000000-0000-4000-8000-000000000001'::uuid o1, 'f3000000-0000-4000-8000-000000000011'::uuid o11,
 'f3000000-0000-4000-8000-000000000012'::uuid o12, 'f3000000-0000-4000-8000-000000000013'::uuid o13,
 gen_random_uuid() op1;
CREATE TEMP TABLE ledger_before AS SELECT (SELECT count(*) FROM private.provider_payments) p, (SELECT count(*) FROM private.payment_refunds) r,
 (SELECT count(*) FROM private.access_sources) s, (SELECT count(*) FROM public.access_entitlements) e,
 (SELECT count(*) FROM private.commerce_outbox) x;

-- Browser roles can neither claim nor record evidence.
SELECT is(has_function_privilege('authenticated', 'private.commerce_observation_record(uuid,bigint,jsonb,boolean,jsonb,text)', 'EXECUTE'),
  false, 'ordinary authenticated role cannot attest provider evidence');
SELECT is(has_function_privilege('authenticated', 'private.commerce_verification_claim(uuid)', 'EXECUTE'), false,
  'or claim a verification job');
SELECT throws_ok($$SELECT pg_temp.support_as('f3000000-0000-4000-8000-0000000000a2', 'aal2',
  'SELECT private.commerce_observation_record(''f3000000-0000-4000-8000-000000000020'',1,''{}'',true,''[]'',''x'')')$$,
  '42501', NULL, 'a support operator cannot call the recorder either');

-- Asking for a check: provider inspection, the diagnosis stage and a per-minute budget.
UPDATE private.support_workspace_settings SET stage = 'inspection';
SELECT throws_ok($$SELECT pg_temp.begin_check((SELECT op FROM ids), (SELECT o1 FROM ids), gen_random_uuid())$$, '42501', 'ADM_DISABLED',
  'provider checks need the diagnosis stage');
UPDATE private.support_workspace_settings SET stage = 'diagnosis';
SELECT throws_ok($$SELECT pg_temp.begin_check((SELECT viewer FROM ids), (SELECT o1 FROM ids), gen_random_uuid())$$, '42501', 'ADM_DENIED',
  'a support viewer cannot ask for a provider check');
CREATE TEMP TABLE job1 AS SELECT pg_temp.begin_check((SELECT op FROM ids), (SELECT o1 FROM ids), (SELECT op1 FROM ids)) r;
SELECT ok((SELECT r->>'jobId' IS NOT NULL FROM job1), 'an operator asks for a check');
SELECT is(pg_temp.begin_check((SELECT op FROM ids), (SELECT o1 FROM ids), (SELECT op1 FROM ids))->>'jobId', (SELECT r->>'jobId' FROM job1),
  'repeating the operation returns the same job');
SELECT is(pg_temp.begin_check((SELECT op FROM ids), (SELECT o1 FROM ids), gen_random_uuid())->>'jobId', (SELECT r->>'jobId' FROM job1),
  'a second request joins the live check instead of starting another');
INSERT INTO private.support_rate_buckets(actor_id, kind, minute, used)
SELECT (SELECT op FROM ids), 'provider_check', date_trunc('minute', clock_timestamp()) + m * interval '1 minute', 5 FROM generate_series(0,1) m
ON CONFLICT (actor_id, kind, minute) DO UPDATE SET used = 5;
SELECT throws_ok($$SELECT pg_temp.begin_check((SELECT op FROM ids), (SELECT o11 FROM ids), gen_random_uuid())$$, 'PT429', 'ADM_RATE_LIMITED',
  'more than five checks a minute are refused');
DELETE FROM private.support_rate_buckets;

-- Only a registered verifier login claims and records.
SELECT throws_ok(format($$SELECT private.commerce_verification_claim(%L)$$, (SELECT r->>'jobId' FROM job1)), '42501', 'ADM_DENIED',
  'an unregistered database login cannot claim a job');
SELECT private.commerce_verifier_register(session_user::text, 'Test verifier', '92000000-0000-0000-0000-000000000001');
CREATE TEMP TABLE claim1 AS SELECT private.commerce_verification_claim((SELECT (r->>'jobId')::uuid FROM job1)) c;
SELECT is((SELECT c->>'state' FROM claim1), 'claimed', 'a registered verifier claims the job');
SELECT is((SELECT c#>>'{binding,orderId}' FROM claim1), 'f3000000-0000-4000-8000-000000000001', 'with the order''s frozen binding');
SELECT throws_ok(format($$SELECT private.commerce_verification_claim(%L)$$, (SELECT r->>'jobId' FROM job1)), 'PT409', 'ADM_CONFLICT',
  'a live lease cannot be claimed twice');

-- Recording checks the fence and the shape of the facts.
SELECT throws_ok(format($$SELECT private.commerce_observation_record(%L, %s, pg_temp.facts(), true, '[]', '2025-02-24.acacia')$$,
  (SELECT r->>'jobId' FROM job1), (SELECT (c->>'fence')::bigint + 1 FROM claim1)), 'PT409', 'ADM_STALE', 'a wrong fence is refused');
SELECT throws_ok(format($$SELECT private.commerce_observation_record(%L, %s, '{"accountId":"acct_support_test"}', true, '[]', '2025-02-24.acacia')$$,
  (SELECT r->>'jobId' FROM job1), (SELECT c->>'fence' FROM claim1)), '22023', 'ADM_INVALID', 'facts in the wrong shape are refused');
SELECT throws_ok(format($$SELECT private.commerce_observation_record(%L, %s, NULL, true, '[]', '2025-02-24.acacia')$$,
  (SELECT r->>'jobId' FROM job1), (SELECT c->>'fence' FROM claim1)), '22023', 'ADM_INVALID', 'missing facts are refused');
SELECT throws_ok(format($$SELECT private.commerce_observation_record(%L, %s, pg_temp.facts(), true, '["refunds_incomplete"]', '2025-02-24.acacia')$$,
  (SELECT r->>'jobId' FROM job1), (SELECT c->>'fence' FROM claim1)), '22023', 'ADM_INVALID', 'a complete read cannot carry blockers');
CREATE TEMP TABLE rec1 AS SELECT private.commerce_observation_record((SELECT (r->>'jobId')::uuid FROM job1),
 (SELECT (c->>'fence')::bigint FROM claim1),
 pg_temp.facts('[{"id":"re_b","paymentIntentId":"pi_support","chargeId":"ch_support","amountMinor":200,"currency":"usd","status":"succeeded","occurredAt":"2026-10-02T10:00:00Z"},
  {"id":"re_a","paymentIntentId":"pi_support","chargeId":"ch_support","amountMinor":100,"currency":"usd","status":"succeeded","occurredAt":"2026-10-02T10:00:00Z"}]'),
 true, '[]', '2025-02-24.acacia') r;
SELECT is((SELECT r->>'state' FROM rec1), 'complete', 'a valid read is recorded');
SELECT is((SELECT material_digest FROM private.commerce_provider_observations WHERE id = (SELECT (r->>'observationId')::uuid FROM rec1)),
  'e87045b490c8aec5658546aaf719bd30fff787bf0f49035b5e7e3643a4ff9e3d', 'its digest matches the TypeScript material digest');
SELECT is((SELECT facts#>>'{refunds,0,id}' FROM private.commerce_provider_observations WHERE id = (SELECT (r->>'observationId')::uuid FROM rec1)),
  're_a', 'refunds are stored in identity order');
SELECT is((SELECT state FROM private.commerce_verification_jobs WHERE id = (SELECT (r->>'jobId')::uuid FROM job1)), 'complete', 'the job completes');
SELECT is(private.commerce_verification_claim((SELECT (r->>'jobId')::uuid FROM job1))->>'state', 'complete',
  'claiming a finished job returns its result instead of running again');
SELECT throws_ok($$UPDATE private.commerce_provider_observations SET complete = false$$, '42501', 'ADM_IMMUTABLE', 'observations cannot be edited');
SELECT ok((SELECT p = (SELECT count(*) FROM private.provider_payments) AND r = (SELECT count(*) FROM private.payment_refunds)
  AND s = (SELECT count(*) FROM private.access_sources) AND e = (SELECT count(*) FROM public.access_entitlements)
  AND x = (SELECT count(*) FROM private.commerce_outbox) FROM ledger_before), 'a diagnosis writes no payment, refund, access or outbox row');

-- Staff read the observation through provider inspection only.
SELECT is(pg_temp.support_as((SELECT op FROM ids), 'aal2', format('SELECT public.admin_support_observation(%L)',
  (SELECT r->>'observationId' FROM rec1)))#>>'{value,facts,capturedMinor}', '1500', 'the operator reads the recorded facts');
CREATE FUNCTION pg_temp.observation_as(p_user uuid, p_id text) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as(p_user, 'aal2', format('SELECT public.admin_support_observation(%L)', p_id))
$$;
SELECT throws_ok($$SELECT pg_temp.observation_as((SELECT viewer FROM ids), (SELECT r->>'observationId' FROM rec1))$$,
  '42501', 'ADM_DENIED', 'a support viewer cannot');
SELECT is(pg_temp.support_as((SELECT op FROM ids), 'aal2', format('SELECT public.admin_support_latest_observation(%L)',
  (SELECT o1 FROM ids)))#>>'{value,id}', (SELECT r->>'observationId' FROM rec1), 'the latest observation of the order is found');

-- An expired lease is retried under a new fence; the old fence can no longer record.
CREATE TEMP TABLE job2 AS SELECT pg_temp.begin_check((SELECT op FROM ids), (SELECT o11 FROM ids), gen_random_uuid()) r;
CREATE TEMP TABLE claim2a AS SELECT private.commerce_verification_claim((SELECT (r->>'jobId')::uuid FROM job2)) c;
UPDATE private.commerce_verification_jobs SET lease_until = clock_timestamp() - interval '1 second' WHERE id = (SELECT (r->>'jobId')::uuid FROM job2);
CREATE TEMP TABLE claim2b AS SELECT private.commerce_verification_claim((SELECT (r->>'jobId')::uuid FROM job2)) c;
SELECT ok((SELECT (c->>'fence')::bigint FROM claim2b) > (SELECT (c->>'fence')::bigint FROM claim2a), 'a retry gets a higher fence');
SELECT throws_ok(format($$SELECT private.commerce_observation_record(%L, %s, pg_temp.facts(), true, '[]', '2025-02-24.acacia')$$,
  (SELECT r->>'jobId' FROM job2), (SELECT c->>'fence' FROM claim2a)), 'PT409', 'ADM_STALE', 'the expired claim cannot record');
SELECT is(private.commerce_observation_record((SELECT (r->>'jobId')::uuid FROM job2), (SELECT (c->>'fence')::bigint FROM claim2b),
  jsonb_set(pg_temp.facts(), '{sessionId}', '"cs_test_legacy"'), true, '[]', '2025-02-24.acacia')->>'state', 'complete', 'the current claim records');

-- A changed order or a revoked requester fails the job without recording.
CREATE TEMP TABLE job3 AS SELECT pg_temp.begin_check((SELECT op FROM ids), (SELECT o12 FROM ids), gen_random_uuid()) r;
CREATE TEMP TABLE claim3 AS SELECT private.commerce_verification_claim((SELECT (r->>'jobId')::uuid FROM job3)) c;
UPDATE private.purchase_orders SET version = version + 1 WHERE id = (SELECT o12 FROM ids);
SELECT is(private.commerce_observation_record((SELECT (r->>'jobId')::uuid FROM job3), (SELECT (c->>'fence')::bigint FROM claim3),
  jsonb_set(jsonb_set(pg_temp.facts(), '{accountId}', '"acct_support_live"'), '{mode}', '"live"'), true, '[]', '2025-02-24.acacia')->>'code',
  'ORDER_CHANGED', 'an order that changed during the check records nothing');
CREATE TEMP TABLE job4 AS SELECT pg_temp.begin_check((SELECT op FROM ids), (SELECT o13 FROM ids), gen_random_uuid()) r;
CREATE TEMP TABLE claim4 AS SELECT private.commerce_verification_claim((SELECT (r->>'jobId')::uuid FROM job4)) c;
UPDATE private.admin_memberships SET active = false, revoked_by = '92000000-0000-0000-0000-000000000001', revoked_at = now()
 WHERE user_id = (SELECT op FROM ids);
SELECT is(private.commerce_observation_record((SELECT (r->>'jobId')::uuid FROM job4), (SELECT (c->>'fence')::bigint FROM claim4),
  pg_temp.facts(), false, '["payment_incomplete"]', '2025-02-24.acacia')->>'code', 'REQUESTER_REVOKED',
  'a check asked for by someone since revoked records nothing');
SELECT is((SELECT count(*)::int FROM private.commerce_provider_observations WHERE order_id IN ((SELECT o12 FROM ids), (SELECT o13 FROM ids))), 0,
  'neither failed check left an observation');

-- Eligibility from a recorded observation uses the order's approved policy only.
SELECT is(private.commerce_evaluate_purchase((SELECT o1 FROM ids), (SELECT (r->>'observationId')::uuid FROM rec1))->>'state', 'blocked',
  'without an approved mapping for the order''s versions, eligibility is blocked');
INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
VALUES ('v1', 'v1', '{"id":"synthetic","approved":true,"version":"synthetic-v1","pendingRefund":"retain","partialRefund":"retain",
  "fullRefund":"ineligible","inquiry":"retain","formalOpen":"hold","formalLost":"ineligible","duration":"indefinite","fixedSeconds":null}',
  '92000000-0000-0000-0000-000000000001', 'Synthetic test mapping');
SELECT is(private.commerce_evaluate_purchase((SELECT o1 FROM ids), (SELECT (r->>'observationId')::uuid FROM rec1))->>'state', 'eligible',
  'with one, the recorded facts are evaluated');

-- A revoked verifier is refused.
SELECT private.commerce_verifier_revoke(session_user::text);
SELECT throws_ok(format($$SELECT private.commerce_verification_claim(%L)$$, (SELECT r->>'jobId' FROM job1)), '42501', 'ADM_DENIED',
  'a revoked verifier login cannot claim');

SELECT * FROM finish();
ROLLBACK;
