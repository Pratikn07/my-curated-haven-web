BEGIN;
SELECT plan(38);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-collections.sql

UPDATE private.collection_workspace_settings SET stage='publication';
-- Customer 6 bought release 11 through a legacy source; that buyer group has no recorded decision yet.
INSERT INTO private.access_sources(user_id,release_id,source_kind,source_id)
VALUES('92000000-0000-0000-0000-000000000006','93000000-0000-0000-0000-000000000011','native_legacy','syn-legacy-6');
SELECT pg_temp.collection_make_ready();
UPDATE private.commercial_offers SET sale_enabled=true WHERE id='93000000-0000-0000-0000-000000000021';
CREATE TEMP TABLE terms_before AS SELECT private.collection_offer_terms_digest(o) d FROM private.commercial_offers o
 WHERE id='93000000-0000-0000-0000-000000000021';

-- Authority.
SELECT throws_ok($$SELECT pg_temp.collection_cmd(5,'admin_collection_publish',pg_temp.collection_publish_command(true))$$,
  '42501','ADM_DENIED','a publisher cannot approve and publish in one step');
SELECT throws_ok($$SELECT pg_temp.collection_cmd(3,'admin_collection_publish',pg_temp.collection_publish_command(true))$$,
  '42501','ADM_DENIED','an editor cannot publish');
UPDATE private.collection_workspace_settings SET stage='editing';
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_publish',pg_temp.collection_publish_command(true))$$,
  '42501','ADM_DISABLED','publication needs the publication stage');
UPDATE private.collection_workspace_settings SET stage='publication';
SELECT throws_ok($$SELECT pg_temp.collection_cmd(5,'admin_collection_publish',pg_temp.collection_publish_command(false))$$,
  'PT409','ADM_CONFLICT','a publisher needs an existing approval of this revision');

-- Undecided buyer groups block; the decision is part of the approved command.
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_publish',pg_temp.collection_publish_command(true))$$,
  '42501','ADM_BLOCKED','existing buyers need an explicit additions decision');
SELECT is(jsonb_array_length(private.collection_unmapped_access('93000000-0000-0000-0000-000000000001')),1,
  'one buyer group is undecided');
CREATE TEMP TABLE cmd1 AS SELECT pg_temp.collection_publish_command(true,'93000000-0000-0000-0000-000000000001',
  '[{"release_id":"93000000-0000-0000-0000-000000000011","source_kind":"native_legacy","policy":"additions-v1"}]'::jsonb) c;
CREATE TEMP TABLE pub1 AS SELECT pg_temp.collection_cmd(1,'admin_collection_publish',(SELECT c FROM cmd1)) r;
SELECT is((SELECT r->>'noChange' FROM pub1),'false','the owner approves and publishes');
SELECT is((SELECT r->>'refreshState' FROM pub1),'pending','public refresh is reported separately');
SELECT is(pg_temp.collection_cmd(1,'admin_collection_publish',(SELECT c FROM cmd1))->>'publicationId',
  (SELECT r->>'publicationId' FROM pub1),'same operation returns the same committed publication');
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_publish',(SELECT c || '{"reason":"Other"}'::jsonb FROM cmd1))$$,
  '22023','ADM_INVALID','the same operation with a different payload is refused');
SELECT is((SELECT policy FROM private.collection_access_policies WHERE release_id='93000000-0000-0000-0000-000000000011'
  AND source_kind='native_legacy'),'additions-v1','the buyer decision is recorded');

-- The membership changed (3 recipes vs 2): a new release, the old one sealed, the offer moved with unchanged terms.
CREATE TEMP TABLE p1 AS SELECT * FROM private.collection_publications WHERE id=(SELECT (r->>'publicationId')::uuid FROM pub1);
SELECT ok((SELECT NOT imported AND decision_id IS NOT NULL FROM p1),'the publication records the human decision');
SELECT is((SELECT count(*)::int FROM public.collection_recipes WHERE release_id=(SELECT release_id FROM p1)),3,
  'the new release holds the three recipes');
SELECT is((SELECT state FROM public.collection_releases WHERE id='93000000-0000-0000-0000-000000000011'),'sealed',
  'the superseded release is sealed for its buyers');
SELECT is((SELECT release_id FROM private.commercial_offers WHERE id='93000000-0000-0000-0000-000000000021'),(SELECT release_id FROM p1),
  'the offer now sells the new release');
SELECT is((SELECT private.collection_offer_terms_digest(o) FROM private.commercial_offers o WHERE id='93000000-0000-0000-0000-000000000021'),
  (SELECT d FROM terms_before),'with the same price, account, terms and sale switch');
SELECT is((SELECT policy FROM private.collection_access_policies WHERE release_id=(SELECT release_id FROM p1)
  AND source_kind='stripe_purchase'),'additions-v1','buyers of the new release will receive later additions');
SELECT is((SELECT published_count FROM public.collection_publication_projection WHERE collection_id='93000000-0000-0000-0000-000000000001'),3,
  'the public projection shows the new contents');
SELECT is((SELECT source_mode FROM private.collection_sources WHERE collection_id='93000000-0000-0000-0000-000000000001'),'database',
  'the collection now reads from the database');
SELECT is((SELECT count(*)::int FROM private.collection_draft_heads WHERE collection_id='93000000-0000-0000-0000-000000000001'),0,
  'the draft closes');
SELECT is(private.collection_revision_json((SELECT revision_id FROM p1))->>'state','published','the revision reads as published');
SELECT is((SELECT count(*)::int FROM private.collection_review_decisions WHERE collection_id='93000000-0000-0000-0000-000000000001'),1,
  'one approval was recorded');
SELECT is(private.recipe_access_release('92000000-0000-0000-0000-000000000006','93000000-0000-0000-0000-000000000103'),
  (SELECT release_id FROM p1),'the original buyer now receives the added recipe');

-- History is protected.
SELECT throws_ok($$DELETE FROM public.collection_recipes WHERE release_id=(SELECT release_id FROM p1)$$,
  '42501','ADM_IMMUTABLE','published members cannot be changed outside publication');
SELECT throws_ok($$UPDATE private.release_manifests SET manifest_checksum='x' WHERE release_id=(SELECT release_id FROM p1)$$,
  '42501','ADM_IMMUTABLE','manifests are immutable');

-- Reorder only: still a new release.
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_start',jsonb_build_object('collection_id','93000000-0000-0000-0000-000000000001',
  'operation_id',gen_random_uuid(),'reason','Reorder'));
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001',
  jsonb_build_object('members',(SELECT jsonb_agg(m ORDER BY o DESC) FROM jsonb_array_elements(
    pg_temp.collection_head_snapshot('93000000-0000-0000-0000-000000000001')->'members') WITH ORDINALITY x(m,o)))));
CREATE TEMP TABLE pub2 AS SELECT pg_temp.collection_cmd(1,'admin_collection_publish',pg_temp.collection_publish_command(true)) r;
SELECT isnt((SELECT r->>'releaseId' FROM pub2),(SELECT release_id::text FROM p1),'a reorder creates a new release');

-- Wording only: the release is reused.
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_start',jsonb_build_object('collection_id','93000000-0000-0000-0000-000000000001',
  'operation_id',gen_random_uuid(),'reason','Words'));
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001',
  '{"tagline":"New words only"}'::jsonb));
CREATE TEMP TABLE pub3 AS SELECT pg_temp.collection_cmd(1,'admin_collection_publish',pg_temp.collection_publish_command(true)) r;
SELECT is((SELECT r->>'releaseId' FROM pub3),(SELECT r->>'releaseId' FROM pub2),'a wording-only update keeps the release');
SELECT is((SELECT tagline FROM public.collection_publication_projection WHERE collection_id='93000000-0000-0000-0000-000000000001'),
  'New words only','and the projection shows the new words');
SELECT is((SELECT public_summary FROM public.recipe_collections WHERE id='93000000-0000-0000-0000-000000000001'),'New words only',
  'the identity summary follows the publication');

-- Separated roles: reviewer approves, publisher publishes the unchanged approved revision.
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_start',jsonb_build_object('collection_id','93000000-0000-0000-0000-000000000001',
  'operation_id',gen_random_uuid(),'reason','Story'));
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001',
  '{"story":"Separated roles"}'::jsonb));
SELECT pg_temp.collection_cmd(3,'admin_collection_submit',pg_temp.collection_submit_command());
SELECT pg_temp.collection_cmd(4,'admin_collection_review',pg_temp.collection_review_command());
-- Evidence changes after approval: the approval no longer matches.
UPDATE public.recipe_bodies SET content_version=content_version+1 WHERE recipe_id='93000000-0000-0000-0000-000000000101';
SELECT throws_ok($$SELECT pg_temp.collection_cmd(5,'admin_collection_publish',pg_temp.collection_publish_command(false))$$,
  '42501','ADM_BLOCKED','a recipe change after approval blocks publication');
UPDATE public.recipe_bodies SET content_version=content_version-1 WHERE recipe_id='93000000-0000-0000-0000-000000000101';
CREATE TEMP TABLE pub4 AS SELECT pg_temp.collection_cmd(5,'admin_collection_publish',pg_temp.collection_publish_command(false)) r;
SELECT is((SELECT story FROM public.collection_publication_projection WHERE collection_id='93000000-0000-0000-0000-000000000001'),
  'Separated roles','a publisher publishes the approved revision');
SELECT is((SELECT count(*)::int FROM private.collection_review_decisions WHERE submission_id=(SELECT submission_id FROM private.collection_review_decisions
  ORDER BY decided_at DESC LIMIT 1)),1,'without adding a second decision');
UPDATE private.admin_memberships SET active=false, revoked_by='92000000-0000-0000-0000-000000000001', revoked_at=now()
 WHERE user_id='92000000-0000-0000-0000-000000000005';
SELECT throws_ok($$SELECT pg_temp.collection_cmd(5,'admin_collection_publish',pg_temp.collection_publish_command(false))$$,
  '42501','ADM_DENIED','a revoked publisher cannot retry');

-- An empty coming-soon collection publishes without a sellable release.
SELECT pg_temp.collection_make_ready('93000000-0000-0000-0000-000000000002');
CREATE TEMP TABLE pub5 AS SELECT pg_temp.collection_cmd(1,'admin_collection_publish',
  pg_temp.collection_publish_command(true,'93000000-0000-0000-0000-000000000002')) r;
SELECT is((SELECT r->>'releaseId' FROM pub5),NULL,'an empty collection publishes with no release');
SELECT is((SELECT availability FROM public.collection_publication_projection WHERE collection_id='93000000-0000-0000-0000-000000000002'),
  'coming-soon','and appears as coming soon');

-- A series collision rolls back completely.
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_start',jsonb_build_object('collection_id','93000000-0000-0000-0000-000000000002',
  'operation_id',gen_random_uuid(),'reason','Series'));
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000002',
  '{"series":{"key":"breakfast","volume":7}}'::jsonb));
CREATE TEMP TABLE before_collision AS SELECT (SELECT count(*) FROM private.collection_publications) p, (SELECT count(*) FROM public.collection_releases) r;
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_publish',pg_temp.collection_publish_command(true,'93000000-0000-0000-0000-000000000002'))$$,
  '42501','ADM_BLOCKED','a used series volume blocks publication');
SELECT ok((SELECT p=(SELECT count(*) FROM private.collection_publications) AND r=(SELECT count(*) FROM public.collection_releases)
  FROM before_collision),'nothing was written');

-- A protected recipe cannot be dropped at publication time either.
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_start',jsonb_build_object('collection_id','93000000-0000-0000-0000-000000000001',
  'operation_id',gen_random_uuid(),'reason','Try removal'));
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001',
  jsonb_build_object('members',(SELECT jsonb_agg(m) FROM jsonb_array_elements(pg_temp.collection_head_snapshot('93000000-0000-0000-0000-000000000001')->'members') m
   WHERE m->>'recipeId'<>'93000000-0000-0000-0000-000000000101'))))$$,'42501','ADM_BLOCKED','a purchased recipe stays');

SELECT * FROM finish();
ROLLBACK;
