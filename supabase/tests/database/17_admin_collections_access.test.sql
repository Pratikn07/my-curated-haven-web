BEGIN;
SELECT plan(33);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-collections.sql

-- Denials before any stage is enabled.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal1');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_collection_library('{}'::jsonb)$$,
  '42501','ADM_MFA_REQUIRED','aal1 owner cannot inspect private collections');
RESET ROLE;

SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_collection_library('{}'::jsonb)$$,
  '42501','ADM_DISABLED','collection stage starts disabled even when the console is on');
RESET ROLE;

UPDATE private.collection_workspace_settings SET stage='inspection';

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT public.admin_collection_library('{}'::jsonb)$$,
  '42501',NULL,'anonymous callers cannot execute collection reads');
SELECT throws_ok($$SELECT count(*) FROM private.collection_revisions$$,
  '42501',NULL,'anonymous callers cannot read private drafts');
RESET ROLE;

SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000006','aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_collection_detail('93000000-0000-0000-0000-000000000001')$$,
  '42501','ADM_DENIED','a customer with aal2 is not staff');
RESET ROLE;

-- Every console role can read collections.
CREATE FUNCTION pg_temp.library_for(p_user int, p_query jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE result jsonb;
BEGIN
 PERFORM pg_temp.admin_claims(('92000000-0000-0000-0000-'||lpad(p_user::text,12,'0'))::uuid,'aal2');
 SET LOCAL ROLE authenticated;
 result := public.admin_collection_library(p_query);
 RESET ROLE;
 RETURN result;
END $$;
SELECT is((SELECT count(*)::int FROM generate_series(1,5) n
  WHERE (pg_temp.library_for(n,'{"q":"synthetic-p"}')->>'filteredTotal')::int=2),5,
  'owner, viewer, editor, reviewer and publisher can read the library');

-- Library rows keep published, draft and commerce states independent.
CREATE TEMP TABLE lib AS SELECT jsonb_array_elements(pg_temp.library_for(1,'{"q":"synthetic-p"}')->'rows') r;
SELECT is((SELECT r->>'publishedCount' FROM lib WHERE r->>'slug'='synthetic-published-shelf'),'2','published count is the active publication membership');
SELECT is((SELECT r->>'draftCount' FROM lib WHERE r->>'slug'='synthetic-published-shelf'),'3','draft count is the open draft membership');
SELECT is((SELECT r->>'commerceState' FROM lib WHERE r->>'slug'='synthetic-published-shelf'),'disabled','offer exists with sales disabled');
SELECT is((SELECT r->>'publicationId' FROM lib WHERE r->>'slug'='synthetic-private-draft'),NULL,'a new draft has no publication');
SELECT is((SELECT r->>'publishedCount' FROM lib WHERE r->>'slug'='synthetic-private-draft'),'0','unpublished count is zero, not missing');
SELECT is((SELECT r->>'commerceState' FROM lib WHERE r->>'slug'='synthetic-private-draft'),'no_offer','no offer is reported separately');

-- Filters.
SELECT is((pg_temp.library_for(1,'{"q":"synthetic-p","status":["published"]}')->>'filteredTotal')::int,1,'published filter');
SELECT is((pg_temp.library_for(1,'{"q":"synthetic-p","status":["unlisted"]}')->>'filteredTotal')::int,1,'listing filter');
SELECT is((pg_temp.library_for(1,'{"q":"synthetic-p","stage":["2-4y"]}')->>'filteredTotal')::int,0,'6-12 month collections do not match 2-4 years');
SELECT is((pg_temp.library_for(1,'{"q":"synthetic-p","stage":["6-12m"]}')->>'filteredTotal')::int,2,'stage overlap matches');
SELECT throws_ok($$SELECT pg_temp.library_for(1,'{"page":0}')$$,'22023','ADM_INVALID','page zero is rejected');

-- Detail.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000002','aal2');
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE d1 AS SELECT public.admin_collection_detail('93000000-0000-0000-0000-000000000001') d;
CREATE TEMP TABLE d2 AS SELECT public.admin_collection_detail('93000000-0000-0000-0000-000000000002') d;
SELECT throws_ok($$SELECT public.admin_collection_detail('93000000-0000-0000-0000-000000000999')$$,
  'P0002','ADM_NOT_FOUND','unknown collection is not found');
RESET ROLE;
SELECT is((SELECT jsonb_array_length(d#>'{published,snapshot,members}') FROM d1),2,'viewer sees the published snapshot');
SELECT is((SELECT d#>>'{working,state}' FROM d1),'draft','viewer sees the open draft state');
SELECT is((SELECT d#>>'{impact,value,eligibleBuyerCount}' FROM d1),'1','one active buyer is counted');
SELECT is((SELECT d#>>'{impact,ok}' FROM d2),'true','no buyers is a known zero, not unavailable');
SELECT is((SELECT d#>>'{impact,value,eligibleBuyerCount}' FROM d2),'0','new collection has zero buyers');
SELECT is((SELECT d#>'{impact,value,protectedRecipeIds}' FROM d1),
  '["93000000-0000-0000-0000-000000000101","93000000-0000-0000-0000-000000000102"]'::jsonb,
  'purchased release members are protected');
SELECT is((SELECT jsonb_array_length(d->'history') FROM d1),25,'history is bounded to 25 events');

-- History paging continues from the cursor.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
SELECT is(jsonb_array_length(public.admin_collection_history('93000000-0000-0000-0000-000000000001',
  public.admin_collection_history('93000000-0000-0000-0000-000000000001',NULL)->>'nextCursor')->'events'),2,
  'second history page holds the remaining events');
RESET ROLE;

-- Revoked staff with a stale aal2 session lose access; switches are independent.
UPDATE private.admin_memberships SET active=false,revoked_by='92000000-0000-0000-0000-000000000001',revoked_at=now()
 WHERE user_id='92000000-0000-0000-0000-000000000002';
SELECT throws_ok($$SELECT pg_temp.library_for(2,'{}')$$,'42501','ADM_DENIED','revoked staff with stale claims are denied');
UPDATE private.admin_console_settings SET stage='disabled';
SELECT throws_ok($$SELECT pg_temp.library_for(1,'{}')$$,'42501','ADM_DISABLED','console stage still gates collections');
UPDATE private.admin_console_settings SET stage='publication';

-- Public projection exposes listed published fields only.
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM public.collection_publication_projection WHERE slug LIKE 'synthetic-%'),1,
  'anonymous readers see the listed publication');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM information_schema.columns WHERE table_schema='public'
  AND table_name='collection_publication_projection' AND column_name ~ 'draft|revision|digest|approv|working'),0,
  'projection has no draft or approval columns');

-- History rows are immutable; series volumes are unique among current publications.
SELECT throws_ok($$UPDATE private.collection_publications SET digest=repeat('0',64)
  WHERE id='93000000-0000-0000-0000-000000000201'$$,'42501','ADM_IMMUTABLE','publications cannot be edited');
SELECT throws_ok($$DELETE FROM private.collection_revisions WHERE id='93000000-0000-0000-0000-000000000302'$$,
  '42501','ADM_IMMUTABLE','revisions cannot be deleted');
INSERT INTO private.collection_publications(id,collection_id,snapshot,digest,imported,operation_id,executor_id)
SELECT '93000000-0000-0000-0000-000000000202','93000000-0000-0000-0000-000000000002',r.snapshot,r.digest,true,
  '93000000-0000-0000-0000-000000000404','synthetic-import'
FROM private.collection_revisions r WHERE r.id='93000000-0000-0000-0000-000000000302';
SELECT throws_ok($$INSERT INTO private.collection_active_publications(collection_id,publication_id,series_key,series_volume)
  VALUES('93000000-0000-0000-0000-000000000002','93000000-0000-0000-0000-000000000202','breakfast',7)$$,
  '23505','duplicate key value violates unique constraint "collection_active_series_volume"',
  'a second current publication cannot take the same series volume');

SELECT * FROM finish();
ROLLBACK;
