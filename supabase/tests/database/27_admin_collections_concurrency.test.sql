BEGIN;
SELECT no_plan();
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-collections.sql

-- Every entry point that takes collection, recipe or offer locks is bounded: it sets lock_timeout itself, on
-- the function, or through the authority check that sets it.
CREATE TEMP TABLE writers AS SELECT p.oid::regprocedure::text fn,
  coalesce(p.prosrc ~ 'lock_timeout' OR array_to_string(p.proconfig, ',') ~ 'lock_timeout'
    OR p.prosrc ~ 'private\.(collection|admin)_assert\(', false) bounded
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.oid::regprocedure::text = ANY(ARRAY[
 'admin_collection_create(jsonb)','admin_collection_draft_start(jsonb)','admin_collection_draft_save(jsonb)',
 'admin_collection_draft_control(jsonb)','admin_collection_submit(jsonb)','admin_collection_issue(jsonb)',
 'admin_collection_review(jsonb)','admin_collection_publish(jsonb)','admin_recipe_correct(jsonb)',
 'private.collection_publish_core(jsonb,jsonb)','private.recipe_correct_core(jsonb,jsonb)',
 'private.reserve_collection_order(uuid,uuid,jsonb,text)','private.collection_operator_prepare(jsonb)',
 'private.collection_operator_attest(jsonb)','private.collection_operator_publish(uuid,uuid)',
 'private.recipe_operator_correct(uuid,uuid)']);
SELECT is((SELECT count(*)::int FROM writers),16,'every listed writer exists');
SELECT is((SELECT array_agg(fn ORDER BY fn) FROM writers WHERE NOT bounded),NULL,'and every one has a bounded lock wait');
SELECT ok((SELECT 'lock_timeout=5s' = ANY(proconfig) FROM pg_proc
  WHERE oid='private.reserve_collection_order(uuid,uuid,jsonb,text)'::regprocedure),
  'checkout reservation waits at most 5 s for a collection lock');

-- Reusing an operation id with a different request is refused, never applied as a second change.
UPDATE private.collection_workspace_settings SET stage='publication';
CREATE TEMP TABLE save1 AS SELECT pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001',
  '{"tagline":"First"}'::jsonb) || '{"reopen_reviewed":true}'::jsonb c;
SELECT lives_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',(SELECT c FROM save1))$$,'a save applies once');
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',
  (SELECT c || '{"snapshot":{"tagline":"Second"}}'::jsonb FROM save1))$$,'22023','ADM_INVALID',
  'the same operation id with a different request is refused');
SELECT is(pg_temp.collection_cmd(1,'admin_collection_draft_save',(SELECT c FROM save1))->>'operationId',
  (SELECT c->>'operation_id' FROM save1),'and the original request still returns its receipt');

-- Indexes used by the scale-checked reads.
SELECT ok(EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_commercial_offers_release_id'),'offers are indexed by release');
SELECT ok(EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_collection_publications_collection_id'),
  'publications are indexed by collection');
SELECT ok(EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_collection_recipes_release_id'),'members are indexed by release');

SELECT * FROM finish();
ROLLBACK;
