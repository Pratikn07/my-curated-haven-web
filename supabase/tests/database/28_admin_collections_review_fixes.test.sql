BEGIN;
SELECT plan(15);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-collections.sql

UPDATE private.collection_workspace_settings SET stage='publication';
-- Customer 6 bought release 11 through a legacy source; that buyer group has no recorded decision yet.
INSERT INTO private.access_sources(user_id,release_id,source_kind,source_id)
VALUES('92000000-0000-0000-0000-000000000006','93000000-0000-0000-0000-000000000011','native_legacy','syn-legacy-6');
SELECT pg_temp.collection_make_ready();

-- Buyer access is decided only by someone who also holds review authority.
SELECT pg_temp.collection_cmd(3,'admin_collection_submit',pg_temp.collection_submit_command());
SELECT pg_temp.collection_cmd(4,'admin_collection_review',pg_temp.collection_review_command());
SELECT throws_ok($$SELECT pg_temp.collection_cmd(5,'admin_collection_publish',pg_temp.collection_publish_command(false,
  '93000000-0000-0000-0000-000000000001',
  '[{"release_id":"93000000-0000-0000-0000-000000000011","source_kind":"native_legacy","policy":"additions-v1"}]'::jsonb))$$,
  '42501','ADM_BLOCKED','a publisher without review authority cannot decide buyer access');
SELECT is((SELECT count(*)::int FROM private.collection_access_policies WHERE release_id='93000000-0000-0000-0000-000000000011'),0,
  'and nothing is recorded');
CREATE TEMP TABLE pub1 AS SELECT pg_temp.collection_cmd(1,'admin_collection_publish',pg_temp.collection_publish_command(true,
  '93000000-0000-0000-0000-000000000001',
  '[{"release_id":"93000000-0000-0000-0000-000000000011","source_kind":"native_legacy","policy":"additions-v1"}]'::jsonb)) r;
SELECT is((SELECT r->>'noChange' FROM pub1),'false','the owner decides and publishes the approved revision');
SELECT is((SELECT count(*)::int FROM private.collection_review_decisions WHERE collection_id='93000000-0000-0000-0000-000000000001'),1,
  'on the reviewer''s existing approval');
CREATE TEMP TABLE rel2 AS SELECT (r->>'releaseId')::uuid id FROM pub1;

-- Recipes the earlier buyer now receives as additions are protected.
SELECT ok(EXISTS(SELECT 1 FROM private.collection_protected_members('93000000-0000-0000-0000-000000000001')
  WHERE recipe_id='93000000-0000-0000-0000-000000000103'),'a recipe delivered to earlier buyers as an addition is protected');
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_start',jsonb_build_object('collection_id','93000000-0000-0000-0000-000000000001',
  'operation_id',gen_random_uuid(),'reason','Try removing the addition'));
SELECT throws_ok($$SELECT pg_temp.collection_cmd(3,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001',
  jsonb_build_object('members',(SELECT jsonb_agg(m) FROM jsonb_array_elements(pg_temp.collection_head_snapshot('93000000-0000-0000-0000-000000000001')->'members') m
   WHERE m->>'recipeId'<>'93000000-0000-0000-0000-000000000103'))))$$,'42501','ADM_BLOCKED','so a later draft cannot remove it');

-- A no-change publication records no buyer decision.
INSERT INTO private.access_sources(user_id,release_id,source_kind,source_id)
SELECT '92000000-0000-0000-0000-000000000006', id, 'support_grant', 'syn-grant-6' FROM rel2;
SELECT is(jsonb_array_length(private.collection_unmapped_access('93000000-0000-0000-0000-000000000001')),1,
  'a new buyer group is undecided');
CREATE TEMP TABLE pub2 AS SELECT pg_temp.collection_cmd(1,'admin_collection_publish',pg_temp.collection_publish_command(true,
  '93000000-0000-0000-0000-000000000001',
  (SELECT jsonb_build_array(jsonb_build_object('release_id',id,'source_kind','support_grant','policy','additions-v1')) FROM rel2))) r;
SELECT is((SELECT r->>'noChange' FROM pub2),'true','publishing what is already live changes nothing');
SELECT is(jsonb_array_length(private.collection_unmapped_access('93000000-0000-0000-0000-000000000001')),1,
  'and records no buyer decision');

-- A collection that went empty (coming soon) seals its last release and moves its offer when recipes return.
INSERT INTO public.collection_releases(id,collection_id,version,state) VALUES
 ('93000000-0000-0000-0000-000000000012','93000000-0000-0000-0000-000000000002',1,'published');
INSERT INTO public.collection_recipes(release_id,recipe_id,position) VALUES
 ('93000000-0000-0000-0000-000000000012','93000000-0000-0000-0000-000000000101',1);
INSERT INTO private.commercial_offers(id,release_id,provider_account_id,provider_mode,provider_product_id,
 provider_price_id,currency,base_minor_amount,sale_enabled) VALUES
 ('93000000-0000-0000-0000-000000000022','93000000-0000-0000-0000-000000000012','acct_synthetic_collections',
  'test','prod_synthetic_private','price_synthetic_private','usd',1500,false);
SELECT pg_temp.collection_make_ready('93000000-0000-0000-0000-000000000002');
CREATE TEMP TABLE pub3 AS SELECT pg_temp.collection_cmd(1,'admin_collection_publish',
  pg_temp.collection_publish_command(true,'93000000-0000-0000-0000-000000000002')) r;
SELECT is((SELECT r->>'releaseId' FROM pub3),NULL,'an empty coming-soon publication has no release');
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_start',jsonb_build_object('collection_id','93000000-0000-0000-0000-000000000002',
  'operation_id',gen_random_uuid(),'reason','Recipes return'));
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000002',
  jsonb_build_object('availability','open','members',pg_temp.collection_snapshot('93000000-0000-0000-0000-000000000002',
    'synthetic-private-draft','Synthetic private draft','unlisted','open',
    ARRAY['93000000-0000-0000-0000-000000000101','93000000-0000-0000-0000-000000000102']::uuid[])->'members')));
SELECT pg_temp.collection_make_ready('93000000-0000-0000-0000-000000000002');
CREATE TEMP TABLE pub4 AS SELECT pg_temp.collection_cmd(1,'admin_collection_publish',
  pg_temp.collection_publish_command(true,'93000000-0000-0000-0000-000000000002')) r;
SELECT is((SELECT state FROM public.collection_releases WHERE id='93000000-0000-0000-0000-000000000012'),'sealed',
  'the last published release is sealed when recipes return');
SELECT is((SELECT release_id::text FROM private.commercial_offers WHERE id='93000000-0000-0000-0000-000000000022'),
  (SELECT r->>'releaseId' FROM pub4),'and its offer moves to the new release');

-- Only an open, unretired database collection is for sale.
UPDATE private.commercial_offers SET sale_enabled=true WHERE id='93000000-0000-0000-0000-000000000022';
SELECT is(private.collection_sellable('93000000-0000-0000-0000-000000000002')->>'offerId','93000000-0000-0000-0000-000000000022',
  'an open collection sells its offer');
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_start',jsonb_build_object('collection_id','93000000-0000-0000-0000-000000000002',
  'operation_id',gen_random_uuid(),'reason','Pause'));
SELECT pg_temp.collection_make_ready('93000000-0000-0000-0000-000000000002','{"availability":"coming-soon"}');
SELECT pg_temp.collection_cmd(1,'admin_collection_publish',pg_temp.collection_publish_command(true,'93000000-0000-0000-0000-000000000002'));
SELECT is(private.collection_sellable('93000000-0000-0000-0000-000000000002'),NULL,'a coming-soon collection is not for sale');
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_start',jsonb_build_object('collection_id','93000000-0000-0000-0000-000000000002',
  'operation_id',gen_random_uuid(),'reason','Retire'));
SELECT pg_temp.collection_make_ready('93000000-0000-0000-0000-000000000002','{"availability":"open","listingState":"retired"}');
SELECT pg_temp.collection_cmd(1,'admin_collection_publish',pg_temp.collection_publish_command(true,'93000000-0000-0000-0000-000000000002'));
SELECT is(private.collection_sellable('93000000-0000-0000-0000-000000000002'),NULL,'a retired collection is not for sale');

SELECT * FROM finish();
ROLLBACK;
