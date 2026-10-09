BEGIN;
SELECT plan(37);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql
\ir ../../test-fixtures/support-eligibility-matrix.sql

-- The SQL evaluator agrees with the TypeScript evaluator on every shared case (tests/fixtures/eligibility-matrix.mjs).
SELECT is(private.commerce_evaluate(input), expected, 'eligibility: ' || (name #>> '{}')) FROM support_eligibility_matrix ORDER BY name #>> '{}';

-- Installing the policy code maps nothing and changes no access.
SELECT is((SELECT count(*)::int FROM private.commerce_access_policies), 0, 'no policy mapping is installed without an approval');
SELECT is(private.commerce_policy_for('v1', 'v1'), NULL, 'existing v1 orders have no rules until the owner approves a mapping');

INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
VALUES ('fixture-refund-v1', 'fixture-access-v1', '{"id":"support-fixture-policy","approved":true,"version":"fixture-v1",
  "pendingRefund":"retain","partialRefund":"retain","fullRefund":"ineligible","inquiry":"retain","formalOpen":"hold",
  "formalLost":"ineligible","duration":"indefinite","fixedSeconds":null}', '92000000-0000-0000-0000-000000000001',
  'Synthetic approval for tests');
SELECT is(private.commerce_policy_for('fixture-refund-v1', 'fixture-access-v1')->>'formalOpen', 'hold', 'an approved mapping returns its rules');
SELECT is(private.commerce_policy_for('fixture-refund-v1', 'other'), NULL, 'a different version pair has no rules');
SELECT throws_ok($$UPDATE private.commerce_access_policies SET evidence = 'changed'$$, '42501', 'ADM_IMMUTABLE',
  'an approved mapping cannot be edited');
SELECT throws_ok($$INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
  VALUES ('x', 'y', '{"id":"x","approved":true,"version":"x","pendingRefund":"revoke","partialRefund":"retain","fullRefund":"ineligible",
  "inquiry":"retain","formalOpen":"hold","formalLost":"ineligible","duration":"indefinite","fixedSeconds":null}',
  '92000000-0000-0000-0000-000000000001', 'x')$$, '23514', NULL, 'rules outside the accepted policy are refused');
SELECT throws_ok($$INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
  VALUES ('x', 'y', '{"id":"x","approved":true,"version":"x","pendingRefund":"retain","partialRefund":"retain","fullRefund":"ineligible",
  "inquiry":"retain","formalOpen":"hold","formalLost":"ineligible","duration":"indefinite","fixedSeconds":null,"extra":1}',
  '92000000-0000-0000-0000-000000000001', 'x')$$, '23514', NULL, 'unknown policy fields are refused');

-- Note retention never touches purchase access.
CREATE TEMP TABLE access_before AS SELECT (SELECT count(*) FROM private.access_sources) s, (SELECT count(*) FROM public.access_entitlements) e;
UPDATE private.support_workspace_settings SET note_retention_days = 1;
SELECT ok((SELECT s = (SELECT count(*) FROM private.access_sources) AND e = (SELECT count(*) FROM public.access_entitlements) FROM access_before),
  'setting note retention changes no access');
SELECT is(has_table_privilege('authenticated', 'private.commerce_access_policies', 'SELECT'), false,
  'browser roles cannot read policy mappings');

SELECT * FROM finish();
ROLLBACK;
