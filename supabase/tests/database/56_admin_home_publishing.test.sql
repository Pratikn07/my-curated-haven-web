BEGIN;
SELECT plan(25);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-collections.sql

-- Results: one real collection publication by the owner (refresh pending), plus recipe ledger rows.
UPDATE private.collection_workspace_settings SET stage='publication';
SELECT pg_temp.collection_make_ready();
CREATE TEMP TABLE pub AS SELECT pg_temp.collection_cmd(1,'admin_collection_publish',pg_temp.collection_publish_command(true,
  '93000000-0000-0000-0000-000000000001','[{"release_id":"93000000-0000-0000-0000-000000000011","source_kind":"native_legacy","policy":"additions-v1"}]'::jsonb)) r;
GRANT SELECT ON pub TO authenticated;
INSERT INTO private.admin_operations(actor_id,operation_id,action,target,request_hash,result,committed_at) VALUES
 ('92000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000001','revision.publish',
  '93000000-0000-0000-0000-000000000101','h','{"noChange":false,"version":2}',now()-interval '1 hour'),
 ('92000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000002','recipe.withdraw',
  '93000000-0000-0000-0000-000000000102','h','{"noChange":false}',now()-interval '2 hours'),
 ('92000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000003','revision.publish',
  '93000000-0000-0000-0000-000000000103','h',NULL,NULL),
 ('92000000-0000-0000-0000-000000000003','94000000-0000-0000-0000-000000000004','revision.publish',
  '93000000-0000-0000-0000-000000000103','h','{"noChange":false}',now()-interval '30 minutes'),
 ('92000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000005','draft.save',
  '93000000-0000-0000-0000-000000000103','h','{"noChange":false}',now()-interval '10 minutes');
INSERT INTO private.admin_operations(actor_id,operation_id,action,target,request_hash,result,committed_at)
SELECT '92000000-0000-0000-0000-000000000001',('94000000-0000-0000-0000-0000000001'||lpad(n::text,2,'0'))::uuid,'revision.publish',
  '93000000-0000-0000-0000-000000000101','h','{"noChange":true}',now()-interval '1 day'-n*interval '1 minute'
FROM generate_series(1,12) n;

-- Continue work: one open recipe draft saved by the editor, beside the fixture's two collection drafts.
INSERT INTO private.recipe_drafts(id,recipe_id,workflow_schema,lifecycle,working_version,created_by,updated_by)
VALUES('94000000-0000-0000-0000-000000000501','93000000-0000-0000-0000-000000000103',1,'submitted',1,
  '92000000-0000-0000-0000-000000000003','92000000-0000-0000-0000-000000000003');
INSERT INTO private.recipe_revisions(id,draft_id,recipe_id,version,snapshot,digest,base_active_hash,actor_id,saved_at)
VALUES('94000000-0000-0000-0000-000000000502','94000000-0000-0000-0000-000000000501','93000000-0000-0000-0000-000000000103',1,
  '{"catalog":{"title":"Draft recipe title"}}','d','h','92000000-0000-0000-0000-000000000003',now()+interval '1 minute');
UPDATE private.recipe_drafts SET current_revision_id='94000000-0000-0000-0000-000000000502' WHERE id='94000000-0000-0000-0000-000000000501';

-- Authority.
SET LOCAL ROLE authenticated;
SELECT pg_temp.admin_claims(NULL,'aal2');
SELECT throws_ok($$SELECT public.admin_home_publishing_results(10)$$,'42501','ADM_AUTH_REQUIRED','signed-out callers are refused');
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal1');
SELECT throws_ok($$SELECT public.admin_home_publishing_results(10)$$,'42501','ADM_MFA_REQUIRED','aal1 is refused');
SELECT throws_ok($$SELECT public.admin_home_continue_work(10)$$,'42501','ADM_MFA_REQUIRED','for both reads');
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000006','aal2');
SELECT throws_ok($$SELECT public.admin_home_publishing_results(10)$$,'42501','ADM_DENIED','customers are refused');
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SELECT throws_ok($$SELECT public.admin_home_publishing_results(11)$$,'22023','ADM_INVALID','at most ten results');
SELECT throws_ok($$SELECT public.admin_home_continue_work(0)$$,'22023','ADM_INVALID','at least one');

-- Owner results.
CREATE TEMP TABLE res AS SELECT public.admin_home_publishing_results(10) j;
SELECT is(jsonb_array_length((SELECT j FROM res)),10,'ten results at most');
SELECT is((SELECT j#>>'{0,domain}' FROM res),'collection','newest first: the collection publication');
SELECT is((SELECT j#>>'{0,refreshState}' FROM res),'pending','with its refresh still pending');
SELECT is((SELECT j#>>'{0,operationId}' FROM res),(SELECT r->>'operationId' FROM pub),'and its committed operation');
SELECT is((SELECT j#>>'{1,operationId}' FROM res),'94000000-0000-0000-0000-000000000001','then the recipe publication');
SELECT ok((SELECT j->1->'refreshState' = 'null'::jsonb FROM res),'recipe refresh is not tracked');
SELECT is((SELECT j#>>'{2,action}' FROM res),'recipe.withdraw','withdrawals are results too');
SELECT ok(NOT (SELECT j::text LIKE '%94000000-0000-0000-0000-000000000003%' OR j::text LIKE '%94000000-0000-0000-0000-000000000004%'
  OR j::text LIKE '%94000000-0000-0000-0000-000000000005%' FROM res),'no uncommitted, other-actor or non-publication rows');
SELECT is((SELECT array_agg(DISTINCT k ORDER BY k) FROM res, jsonb_array_elements(j) e, jsonb_object_keys(e) k),
  ARRAY['action','committedAt','domain','noChange','objectId','operationId','refreshState','title'],'only safe receipt fields');
SELECT is(jsonb_array_length(public.admin_home_publishing_results(1)),1,'the limit applies');

-- Domain switches.
RESET ROLE;
UPDATE private.collection_workspace_settings SET stage='disabled';
SET LOCAL ROLE authenticated;
SELECT ok(NOT (public.admin_home_publishing_results(10)::text LIKE '%"collection"%'),'collections off: no collection results');
SELECT is(public.admin_home_publishing_results(10)#>>'{0,operationId}','94000000-0000-0000-0000-000000000001','recipe results remain');

-- Continue work.
SELECT is((SELECT array_agg(e->>'domain') FROM jsonb_array_elements(public.admin_home_continue_work(10)) e),ARRAY['recipe'],
  'collections off: only recipe drafts');
RESET ROLE;
UPDATE private.collection_workspace_settings SET stage='editing';
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE work AS SELECT public.admin_home_continue_work(10) j;
SELECT is((SELECT j#>>'{0,title}' FROM work),'Draft recipe title','the most recently saved draft first, with its draft title');
SELECT is((SELECT j#>>'{0,state}' FROM work)||'/'||(SELECT j#>>'{0,savedByYou}' FROM work),'submitted/false',
  'its state and who saved it');
SELECT is((SELECT count(*)::int FROM work, jsonb_array_elements(j) e WHERE e->>'domain'='collection'),1,
  'the open collection draft (the published one closed its draft)');
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000002','aal2');
SELECT is(public.admin_home_continue_work(10),'[]'::jsonb,'viewers have no drafts to continue');
RESET ROLE;
UPDATE private.admin_console_settings SET stage='inspection';
SET LOCAL ROLE authenticated;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SELECT is(public.admin_home_continue_work(10),'[]'::jsonb,'nothing to continue while the console is inspection-only');
RESET ROLE;

SELECT ok(NOT has_table_privilege('authenticated','private.collection_operations','SELECT')
  AND NOT has_table_privilege('authenticated','private.admin_operations','SELECT'),'ledgers stay private');

SELECT * FROM finish();
ROLLBACK;
