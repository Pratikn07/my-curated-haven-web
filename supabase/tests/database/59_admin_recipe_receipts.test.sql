BEGIN;
SELECT no_plan();
\ir ../../test-fixtures/admin-console.sql

INSERT INTO public.recipe_catalog(id, slug, title, public_summary, preview_image_path) VALUES
  ('91000000-0000-0000-0000-000000000901', 'receipt-a', 'Receipt A', 'Synthetic', ''),
  ('91000000-0000-0000-0000-000000000902', 'receipt-b', 'Receipt B', 'Synthetic', '');

INSERT INTO private.admin_operations(actor_id, operation_id, action, target, request_hash, result, committed_at)
SELECT '92000000-0000-0000-0000-000000000001',
  ('93000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'revision.publish', '91000000-0000-0000-0000-000000000901', 'synthetic',
  jsonb_build_object('operationId', ('93000000-0000-0000-0000-' || lpad(n::text, 12, '0')),
    'recipeId', '91000000-0000-0000-0000-000000000901', 'revisionId', NULL,
    'version', n, 'digest', 'synthetic', 'noChange', false,
    'committedAt', now() - make_interval(mins => n - 900), 'publication', 'published',
    'privateRequest', 'must not leak'),
  now() - make_interval(mins => n - 900)
FROM generate_series(900, 911) n;
INSERT INTO private.admin_operations(actor_id, operation_id, action, target, request_hash, result, committed_at) VALUES
  ('92000000-0000-0000-0000-000000000002', '93000000-0000-0000-0000-000000000920', 'revision.publish', '91000000-0000-0000-0000-000000000901', 'synthetic', '{"operationId":"other-actor"}', now()),
  ('92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000921', 'recipe.withdraw', '91000000-0000-0000-0000-000000000902', 'synthetic', '{"operationId":"other-recipe"}', now()),
  ('92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000922', 'revision.publish', '91000000-0000-0000-0000-000000000901', 'synthetic', NULL, NULL),
  ('92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000923', 'draft.save', '91000000-0000-0000-0000-000000000901', 'synthetic', '{"operationId":"wrong-action"}', now());

SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is(jsonb_array_length(public.admin_recipe_operations('91000000-0000-0000-0000-000000000901')), 10, 'receipt read is capped at ten');
SELECT is(public.admin_recipe_operations('91000000-0000-0000-0000-000000000901')->0->>'operationId', '93000000-0000-0000-0000-000000000900', 'latest committed operation is first');
SELECT ok(NOT (public.admin_recipe_operations('91000000-0000-0000-0000-000000000901')->0 ? 'privateRequest'), 'request payload is not returned');
SELECT is(jsonb_array_length(public.admin_recipe_operations('91000000-0000-0000-0000-000000000902')), 1, 'other recipe is independently scoped');
RESET ROLE;

SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000002', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is(jsonb_array_length(public.admin_recipe_operations('91000000-0000-0000-0000-000000000901')), 1, 'another actor sees only their own receipt');
RESET ROLE;
UPDATE private.admin_memberships SET active=false WHERE user_id='92000000-0000-0000-0000-000000000002';
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000002', 'aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_recipe_operations('91000000-0000-0000-0000-000000000901')$$, '42501', 'ADM_DENIED', 'revoked staff cannot recover receipts');
RESET ROLE;

SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal1');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_recipe_operations('91000000-0000-0000-0000-000000000901')$$, '42501', 'ADM_MFA_REQUIRED', 'aal1 cannot recover receipts');
RESET ROLE;

SELECT ok(NOT has_table_privilege('authenticated', 'private.admin_operations', 'SELECT'), 'operation table remains private');
SELECT * FROM finish();
ROLLBACK;
