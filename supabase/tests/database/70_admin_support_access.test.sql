BEGIN;
SELECT plan(41);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

-- Support starts switched off, even for support staff.
SELECT is((SELECT stage FROM private.support_workspace_settings), 'disabled', 'support starts switched off');
SELECT pg_temp.admin_claims('f3000000-0000-4000-8000-0000000000a1', 'aal2');
SELECT throws_ok($$SELECT private.support_assert('support.read','inspection')$$, '42501', 'ADM_DISABLED',
  'a switched-off support workspace refuses support staff');
UPDATE private.support_workspace_settings SET stage = 'inspection';

-- Identity, MFA and role.
SELECT pg_temp.admin_claims(NULL, 'aal2');
SELECT throws_ok($$SELECT private.support_assert('support.read','inspection')$$, '42501', 'ADM_AUTH_REQUIRED',
  'anonymous callers are refused');
SELECT pg_temp.admin_claims('f3000000-0000-4000-8000-0000000000a1', 'aal1');
SELECT throws_ok($$SELECT private.support_assert('support.read','inspection')$$, '42501', 'ADM_MFA_REQUIRED',
  'aal1 cannot read customer data');
SELECT pg_temp.admin_claims('f3000000-0000-4000-8000-0000000000a1', 'aal2');
SELECT is(private.support_assert('support.read','inspection'), 'f3000000-0000-4000-8000-0000000000a1'::uuid,
  'a support viewer can read');
SELECT throws_ok($$SELECT private.support_assert('support.case.write','inspection')$$, '42501', 'ADM_DENIED',
  'a support viewer cannot write cases');
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000003', 'aal2');
SELECT throws_ok($$SELECT private.support_assert('support.read','inspection')$$, '42501', 'ADM_DENIED',
  'a recipe editor has no support permission');
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000006', 'aal2');
SELECT throws_ok($$SELECT private.support_assert('support.read','inspection')$$, '42501', 'ADM_DENIED',
  'an ordinary customer is refused, whatever role their JWT metadata claims');

-- Stages unlock in order: inspection, diagnosis, repair.
SELECT pg_temp.admin_claims('f3000000-0000-4000-8000-0000000000a2', 'aal2');
SELECT is(private.support_assert('support.case.write','inspection'), 'f3000000-0000-4000-8000-0000000000a2'::uuid,
  'an operator writes cases during inspection');
SELECT throws_ok($$SELECT private.support_assert('support.provider.inspect','diagnosis')$$, '42501', 'ADM_DISABLED',
  'checking the provider needs the diagnosis stage');
UPDATE private.support_workspace_settings SET stage = 'diagnosis';
SELECT is(private.support_assert('support.provider.inspect','diagnosis'), 'f3000000-0000-4000-8000-0000000000a2'::uuid,
  'an operator checks the provider during diagnosis');
SELECT throws_ok($$SELECT private.support_assert('support.repair.execute','repair')$$, '42501', 'ADM_DISABLED',
  'applying a repair needs the repair stage');
UPDATE private.support_workspace_settings SET stage = 'repair';
SELECT is(private.support_assert('support.repair.execute','repair'), 'f3000000-0000-4000-8000-0000000000a2'::uuid,
  'an operator applies approved repairs in the repair stage');
SELECT throws_ok($$SELECT private.support_assert('support.repair.approve','repair')$$, '42501', 'ADM_DENIED',
  'approving a repair is owner-only');
SELECT throws_ok($$SELECT private.support_assert('support.refund.prepare','repair')$$, '42501', 'ADM_DENIED',
  'refunds are owner-only');
SELECT throws_ok($$SELECT private.support_assert('support.notice.send','repair')$$, '42501', 'ADM_DENIED',
  'dispute notices are owner-only');
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SELECT is(private.support_assert('support.repair.approve','repair'), '92000000-0000-0000-0000-000000000001'::uuid,
  'the owner approves repairs');
SELECT is(private.support_assert('support.refund.execute','repair'), '92000000-0000-0000-0000-000000000001'::uuid,
  'the owner submits refunds');

-- Support and recipe authority stay separate.
SELECT pg_temp.admin_claims('f3000000-0000-4000-8000-0000000000a1', 'aal2');
SELECT throws_ok($$SELECT private.admin_assert('recipe.read','inspection')$$, '42501', 'ADM_DENIED',
  'support roles never read recipes');
SELECT is((SELECT count(*)::int FROM unnest(ARRAY['viewer','editor','reviewer','publisher']) r,
  unnest(private.admin_permissions(r)) p WHERE p LIKE 'support.%'), 0,
  'recipe and collection roles carry no support permission');
SELECT ok(private.admin_permissions('support_operator') @> ARRAY['support.read','support.repair.prepare','support.repair.execute']
  AND NOT private.admin_permissions('support_operator') && ARRAY['support.repair.approve','support.refund.prepare',
    'support.refund.approve','support.refund.execute','support.notice.prepare','support.notice.approve','support.notice.send'],
  'operators prepare and apply repairs but never approve, refund or send notices');

-- The support stage is independent of the recipe console stage.
UPDATE private.admin_console_settings SET stage = 'disabled';
SELECT is(private.support_assert('support.read','inspection'), 'f3000000-0000-4000-8000-0000000000a1'::uuid,
  'support stays usable while the recipe console is switched off');
SELECT is(public.admin_console_context()->>'supportStage', 'repair', 'the context reports the support stage');
SELECT is(public.admin_console_context()->>'stage', 'disabled', 'and the recipe console as switched off');
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000003', 'aal2');
SELECT throws_ok($$SELECT public.admin_console_context()$$, '42501', 'ADM_DISABLED',
  'recipe staff still find a switched-off console closed');
UPDATE private.admin_console_settings SET stage = 'publication';
SELECT ok(NOT (public.admin_console_context()->'operator'->'permissions') ? 'support.read',
  'recipe staff get no support permission in their context');

-- Revocation takes effect at once.
UPDATE private.admin_memberships SET active = false, revoked_by = '92000000-0000-0000-0000-000000000001', revoked_at = now()
 WHERE user_id = 'f3000000-0000-4000-8000-0000000000a2';
SELECT pg_temp.admin_claims('f3000000-0000-4000-8000-0000000000a2', 'aal2');
SELECT throws_ok($$SELECT private.support_assert('support.read','inspection')$$, '42501', 'ADM_DENIED',
  'a revoked support operator is refused immediately');

-- Only known checks; the owner assigns support roles through Team.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SELECT throws_ok($$SELECT private.support_assert('recipe.read','inspection')$$, '22023', 'ADM_INVALID',
  'support_assert checks support permissions only');
SELECT throws_ok($$SELECT private.support_assert('support.read','publication')$$, '22023', 'ADM_INVALID',
  'an unknown support stage is refused');
SELECT is(public.admin_staff_assign('92000000-0000-0000-0000-000000000008', ARRAY['support_viewer'], 'Support hire',
  gen_random_uuid())->'roles', '["support_viewer"]'::jsonb, 'the owner assigns the support viewer role');
SELECT throws_ok($$SELECT public.admin_staff_assign('92000000-0000-0000-0000-000000000008', ARRAY['support_admin'], 'x', gen_random_uuid())$$,
  '22023', 'ADM_INVALID', 'unknown roles are refused');

-- Per-minute rate budgets, spent only by internal wrappers.
SELECT is(has_function_privilege('authenticated', 'private.support_consume_budget(uuid,text)', 'EXECUTE'), false,
  'browser roles cannot spend a rate budget directly');
SELECT ok(private.support_consume_budget('f3000000-0000-4000-8000-0000000000a1', 'lookup'), 'the first lookup is within budget');
SELECT is((SELECT count(*)::int FROM generate_series(1,40) n
  WHERE NOT private.support_consume_budget('f3000000-0000-4000-8000-0000000000a1', 'lookup')), 11,
  'lookups beyond 30 a minute are refused');
SELECT throws_ok($$SELECT private.support_consume_budget('f3000000-0000-4000-8000-0000000000a1','export')$$, '22023',
  'ADM_INVALID', 'an unknown budget kind is refused');

-- Canonical JSON and digests match the TypeScript golden vectors (tests/admin/support-digest.test.mjs).
SELECT is(private.support_canonical_json('{"é":1,"e":2,"q":"a\"b\n\u0001/ü","n":1.50}'::jsonb),
  '{"e":2,"n":1.5,"q":"a\"b\n\u0001/ü","é":1}', 'canonical JSON sorts keys and normalises numbers like TypeScript');
SELECT is(private.support_digest('{"accountId":"acct_support_test","mode":"test","sessionId":"cs_test_support",
  "paymentIntentId":"pi_support","chargeId":"ch_support","capturedMinor":1500,"currency":"usd","paymentState":"paid",
  "paidAt":"2026-10-01T10:00:00Z","refunds":[],"disputes":[]}'::jsonb),
  '47c7edb642e7f1b4a6edf427b5e48ad0590c42cb93a2e8ca1c9072b5cd4c2850', 'the material digest matches TypeScript');
SELECT is(private.support_digest(('{"accountId":"acct_support_test","mode":"test","sessionId":"cs_test_support",
  "paymentIntentId":"pi_support","chargeId":"ch_support","capturedMinor":1500,"currency":"usd","paymentState":"paid",
  "paidAt":"2026-10-01T10:00:00Z","disputes":[],"refunds":['
  || '{"id":"re_a","paymentIntentId":"pi_support","chargeId":"ch_support","amountMinor":100,"currency":"usd","status":"succeeded","occurredAt":"2026-10-02T10:00:00Z"},'
  || '{"id":"re_b","paymentIntentId":"pi_support","chargeId":"ch_support","amountMinor":200,"currency":"usd","status":"succeeded","occurredAt":"2026-10-02T10:00:00Z"}]}')::jsonb),
  'e87045b490c8aec5658546aaf719bd30fff787bf0f49035b5e7e3643a4ff9e3d', 'and with refunds in identity order');

-- Writers bound their lock waits; browser roles reach none of this directly.
SELECT ok((SELECT prosrc FROM pg_proc WHERE oid = 'private.support_assert(text,text)'::regprocedure) LIKE '%lock_timeout%',
  'support_assert bounds its lock waits');
SELECT is(has_function_privilege('authenticated', 'private.support_assert(text,text)', 'EXECUTE'), false,
  'browser roles cannot call support_assert directly');
SELECT is(has_table_privilege('authenticated', 'private.support_workspace_settings', 'SELECT'), false,
  'browser roles cannot read support settings');

SELECT * FROM finish();
ROLLBACK;
