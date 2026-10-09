BEGIN;
SELECT plan(40);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-collections.sql

UPDATE private.collection_workspace_settings SET stage='editing';

-- Authority, stage and conflicts.
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',
  pg_temp.collection_save_command() || '{"expected_version":999}'::jsonb)$$,
  '40001','ADM_CONFLICT','stale save cannot overwrite another admin');
SELECT throws_ok($$SELECT pg_temp.collection_cmd(2,'admin_collection_draft_save',pg_temp.collection_save_command())$$,
  '42501','ADM_DENIED','a viewer cannot save drafts');
SELECT throws_ok($$SELECT pg_temp.collection_cmd(4,'admin_collection_draft_save',pg_temp.collection_save_command())$$,
  '42501','ADM_DENIED','a reviewer cannot save drafts');
UPDATE private.collection_workspace_settings SET stage='inspection';
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',pg_temp.collection_save_command())$$,
  '42501','ADM_DISABLED','inspection stage refuses writes');
UPDATE private.collection_workspace_settings SET stage='editing';
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',
  pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001','{"surprise":true}'))$$,
  '22023','ADM_INVALID','unknown snapshot keys are refused');

-- An editor saves a title change privately.
CREATE TEMP TABLE save1 AS SELECT pg_temp.collection_save_command() c;
CREATE TEMP TABLE result1 AS SELECT pg_temp.collection_cmd(3,'admin_collection_draft_save',(SELECT c FROM save1)) r;
SELECT is((SELECT r#>>'{revision,version}' FROM result1),'2','save appends version 2');
SELECT is((SELECT r->>'noChange' FROM result1),'false','a real change is not a no-change');
SELECT is((SELECT r#>>'{revision,snapshot,title}' FROM result1),'Private title','the draft holds the new title');
SELECT is((SELECT title FROM public.recipe_collections WHERE id='93000000-0000-0000-0000-000000000001'),
  'Synthetic published shelf','the public identity title is unchanged');
SELECT is((SELECT title FROM public.collection_publication_projection WHERE collection_id='93000000-0000-0000-0000-000000000001'),
  'Synthetic published shelf','the public projection is unchanged');
SELECT is((SELECT count(*)::int FROM private.collection_audit WHERE action='collection.save' AND revision_id=
  ((SELECT r#>>'{revision,id}' FROM result1))::uuid),1,'the save is audited once');

-- Replays are idempotent; a reused operation id with a different payload is refused.
SELECT is(pg_temp.collection_cmd(3,'admin_collection_draft_save',(SELECT c FROM save1))#>>'{revision,id}',
  (SELECT r#>>'{revision,id}' FROM result1),'replaying the same operation returns the same revision');
SELECT is((SELECT count(*)::int FROM private.collection_revisions WHERE collection_id='93000000-0000-0000-0000-000000000001'),2,
  'the replay created nothing new');
SELECT throws_ok($$SELECT pg_temp.collection_cmd(3,'admin_collection_draft_save',
  (SELECT c || jsonb_build_object('reason','Different payload') FROM save1))$$,
  '22023','ADM_INVALID','a reused operation id with another payload is refused');

-- No-change save adds no version and no audit row.
CREATE TEMP TABLE nochange AS SELECT pg_temp.collection_cmd(3,'admin_collection_draft_save',
  pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001','{}')) r;
SELECT is((SELECT r->>'noChange' FROM nochange),'true','identical content reports no change');
SELECT is((SELECT count(*)::int FROM private.collection_revisions WHERE collection_id='93000000-0000-0000-0000-000000000001'),2,
  'no-change save adds no revision');
SELECT is((SELECT count(*)::int FROM private.collection_audit WHERE action='collection.save'
  AND collection_id='93000000-0000-0000-0000-000000000001'),28,'no-change save adds no audit row');

-- Purchased members are protected; draft-only additions can be removed.
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',pg_temp.collection_save_command(
  '93000000-0000-0000-0000-000000000001',jsonb_build_object('members',
    (SELECT jsonb_agg(m) FROM jsonb_array_elements(pg_temp.collection_head_snapshot('93000000-0000-0000-0000-000000000001')->'members') m
     WHERE m->>'recipeId'<>'93000000-0000-0000-0000-000000000101'))))$$,
  '42501','ADM_BLOCKED','removing a purchased recipe is refused');
SELECT is(jsonb_array_length(pg_temp.collection_cmd(1,'admin_collection_draft_save',pg_temp.collection_save_command(
  '93000000-0000-0000-0000-000000000001',jsonb_build_object('members',
    (SELECT jsonb_agg(m) FROM jsonb_array_elements(pg_temp.collection_head_snapshot('93000000-0000-0000-0000-000000000001')->'members') m
     WHERE m->>'recipeId'<>'93000000-0000-0000-0000-000000000103'))))#>'{revision,snapshot,members}'),2,
  'a draft-only addition can be removed');

-- Slug is fixed after publication.
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',
  pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001','{"slug":"renamed-shelf"}'))$$,
  '42501','ADM_BLOCKED','a published collection keeps its slug');

-- Reviewed drafts need an explicit reopen.
UPDATE private.collection_draft_heads SET state='submitted' WHERE collection_id='93000000-0000-0000-0000-000000000001';
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',
  pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001','{"tagline":"Reopened"}'))$$,
  '42501','ADM_BLOCKED','a submitted draft is not silently edited');
SELECT is(pg_temp.collection_cmd(1,'admin_collection_draft_save',
  pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001','{"tagline":"Reopened"}')
  || '{"reopen_reviewed":true}'::jsonb)#>>'{revision,state}','draft','an explicit reopen returns it to draft');

-- Starting a second draft is a conflict.
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_draft_start',jsonb_build_object(
  'collection_id','93000000-0000-0000-0000-000000000001','operation_id',gen_random_uuid(),'reason','Second draft'))$$,
  '40001','ADM_CONFLICT','one open draft per collection');

-- Discard keeps history; a new draft starts from the publication.
SELECT is(pg_temp.collection_cmd(1,'admin_collection_draft_control',jsonb_build_object(
  'collection_id','93000000-0000-0000-0000-000000000001','operation_id',gen_random_uuid(),'reason','Discard',
  'action','discard','expected_digest',(SELECT digest FROM private.collection_revisions WHERE id=
    (SELECT revision_id FROM private.collection_draft_heads WHERE collection_id='93000000-0000-0000-0000-000000000001')),
  'reference_id',null))->'revision','null'::jsonb,'discard returns no open revision');
SELECT is((SELECT count(*)::int FROM private.collection_draft_heads WHERE collection_id='93000000-0000-0000-0000-000000000001'),0,
  'the draft is closed');
SELECT is((SELECT count(*)::int FROM private.collection_revisions WHERE collection_id='93000000-0000-0000-0000-000000000001'),4,
  'discarded revisions stay in history');
SELECT is(jsonb_array_length(pg_temp.collection_cmd(1,'admin_collection_draft_start',jsonb_build_object(
  'collection_id','93000000-0000-0000-0000-000000000001','operation_id',gen_random_uuid(),'reason','Fresh draft'))
  #>'{revision,snapshot,members}'),2,'a new draft starts from the published members');

-- Copy an older publication: today's protected recipes are added back.
INSERT INTO private.collection_publications(id,collection_id,snapshot,digest,imported,operation_id,executor_id)
SELECT '93000000-0000-0000-0000-000000000203','93000000-0000-0000-0000-000000000001',
  jsonb_set(p.snapshot,'{members}',jsonb_build_array(p.snapshot#>'{members,0}')),
  private.collection_digest(jsonb_set(p.snapshot,'{members}',jsonb_build_array(p.snapshot#>'{members,0}'))),true,
  '93000000-0000-0000-0000-000000000405','synthetic-import'
FROM private.collection_publications p WHERE p.id='93000000-0000-0000-0000-000000000201';
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_draft_control',jsonb_build_object(
  'collection_id','93000000-0000-0000-0000-000000000001','operation_id',gen_random_uuid(),'reason','Copy',
  'action','copy_publication','expected_digest',(SELECT digest FROM private.collection_publications WHERE id='93000000-0000-0000-0000-000000000201'),
  'reference_id','93000000-0000-0000-0000-000000000203'))$$,'40001','ADM_CONFLICT','copy needs the collection to have no open draft');
DELETE FROM private.collection_draft_heads WHERE collection_id='93000000-0000-0000-0000-000000000001';
CREATE TEMP TABLE copied AS SELECT pg_temp.collection_cmd(1,'admin_collection_draft_control',jsonb_build_object(
  'collection_id','93000000-0000-0000-0000-000000000001','operation_id',gen_random_uuid(),'reason','Copy',
  'action','copy_publication','expected_digest',(SELECT digest FROM private.collection_publications WHERE id='93000000-0000-0000-0000-000000000201'),
  'reference_id','93000000-0000-0000-0000-000000000203')) r;
SELECT is((SELECT jsonb_agg(m->>'recipeId' ORDER BY m->>'recipeId') FROM copied, jsonb_array_elements(r#>'{revision,snapshot,members}') m),
  '["93000000-0000-0000-0000-000000000101","93000000-0000-0000-0000-000000000102"]'::jsonb,
  'copying an older publication keeps today''s protected recipes');
SELECT is((SELECT r#>>'{revision,base,publicationId}' FROM copied),'93000000-0000-0000-0000-000000000201',
  'the copy is based on the current publication');

-- A new publication makes the draft stale until it is rebased onto it.
INSERT INTO private.collection_publications(id,collection_id,snapshot,digest,imported,operation_id,executor_id)
SELECT '93000000-0000-0000-0000-000000000204',collection_id,snapshot,digest,true,'93000000-0000-0000-0000-000000000406','synthetic-import'
FROM private.collection_publications WHERE id='93000000-0000-0000-0000-000000000201';
UPDATE private.collection_active_publications SET publication_id='93000000-0000-0000-0000-000000000204'
 WHERE collection_id='93000000-0000-0000-0000-000000000001';
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',
  pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001','{"tagline":"After publish"}'))$$,
  '40001','ADM_CONFLICT','a draft based on an older publication cannot save');
SELECT is(pg_temp.collection_cmd(1,'admin_collection_draft_control',jsonb_build_object(
  'collection_id','93000000-0000-0000-0000-000000000001','operation_id',gen_random_uuid(),'reason','Rebase',
  'action','rebase','expected_digest',(SELECT digest FROM private.collection_revisions WHERE id=
    (SELECT revision_id FROM private.collection_draft_heads WHERE collection_id='93000000-0000-0000-0000-000000000001')),
  'reference_id','93000000-0000-0000-0000-000000000204'))#>>'{revision,base,publicationId}',
  '93000000-0000-0000-0000-000000000204','rebase moves the draft onto the current publication');
SELECT ok(pg_temp.collection_cmd(1,'admin_collection_draft_save',
  pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001','{"tagline":"After rebase"}')) ? 'revision',
  'after rebase the draft saves again');

-- New private collections: unlisted identity, no publication, unique slug; slug may change until published.
CREATE TEMP TABLE created AS SELECT pg_temp.collection_cmd(3,'admin_collection_create',jsonb_build_object(
  'collection_id','93000000-0000-0000-0000-000000000003','operation_id',gen_random_uuid(),'reason','New collection',
  'snapshot',pg_temp.collection_head_snapshot('93000000-0000-0000-0000-000000000002')
    || '{"collectionId":"93000000-0000-0000-0000-000000000003","slug":"synthetic-new-shelf","title":"New shelf"}'::jsonb)) r;
SELECT is((SELECT r#>>'{revision,version}' FROM created),'1','create returns the first revision');
SELECT is((SELECT listing_state FROM public.recipe_collections WHERE id='93000000-0000-0000-0000-000000000003'),'unlisted',
  'a new collection identity is unlisted');
SELECT is((SELECT count(*)::int FROM private.collection_active_publications WHERE collection_id='93000000-0000-0000-0000-000000000003'),0,
  'a new collection has no publication');
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM public.recipe_collections WHERE id='93000000-0000-0000-0000-000000000003'),0,
  'anonymous readers cannot see the new identity');
RESET ROLE;
SELECT throws_ok($$SELECT pg_temp.collection_cmd(3,'admin_collection_create',jsonb_build_object(
  'collection_id','93000000-0000-0000-0000-000000000004','operation_id',gen_random_uuid(),'reason','Duplicate',
  'snapshot',pg_temp.collection_head_snapshot('93000000-0000-0000-0000-000000000003')
    || '{"collectionId":"93000000-0000-0000-0000-000000000004"}'::jsonb))$$,
  '40001','ADM_CONFLICT','a slug already in use is refused');
SELECT is(pg_temp.collection_cmd(3,'admin_collection_draft_save',pg_temp.collection_save_command(
  '93000000-0000-0000-0000-000000000003','{"slug":"synthetic-renamed-shelf"}'))#>>'{revision,snapshot,slug}',
  'synthetic-renamed-shelf','an unpublished collection can change its slug');
SELECT is((SELECT slug FROM public.recipe_collections WHERE id='93000000-0000-0000-0000-000000000003'),'synthetic-renamed-shelf',
  'the reserved slug follows the draft');

SELECT * FROM finish();
ROLLBACK;
