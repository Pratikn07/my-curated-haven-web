BEGIN;
SELECT plan(29);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-collections.sql

-- Original release 11 (recipes 101, 102), held by customer 6 through a legacy access source.
-- Successor release 13 adds recipe 103; unrelated collection 2 holds recipe 104.
UPDATE public.recipe_catalog SET publication_state='published'
 WHERE id IN ('93000000-0000-0000-0000-000000000101','93000000-0000-0000-0000-000000000102','93000000-0000-0000-0000-000000000103');
INSERT INTO public.recipe_catalog(id,slug,title,public_summary,preview_image_path,publication_state)
VALUES('93000000-0000-0000-0000-000000000104','synthetic-collection-recipe-4','Synthetic collection recipe 4','Synthetic',
 'recipe-previews/synthetic-4.webp','draft');
INSERT INTO public.recipe_bodies(recipe_id,yield,allergen_review_state,allergens)
VALUES('93000000-0000-0000-0000-000000000104','2 portions','reviewed_no_allergens','{}');
UPDATE public.recipe_catalog SET publication_state='published' WHERE id='93000000-0000-0000-0000-000000000104';
INSERT INTO private.access_sources(user_id,release_id,source_kind,source_id)
VALUES('92000000-0000-0000-0000-000000000006','93000000-0000-0000-0000-000000000011','native_legacy','syn-legacy-6');
INSERT INTO public.collection_releases(id,collection_id,version,state) VALUES
 ('93000000-0000-0000-0000-000000000013','93000000-0000-0000-0000-000000000001',2,'published'),
 ('93000000-0000-0000-0000-000000000012','93000000-0000-0000-0000-000000000002',1,'published');
INSERT INTO public.collection_recipes(release_id,recipe_id,position) VALUES
 ('93000000-0000-0000-0000-000000000013','93000000-0000-0000-0000-000000000101',1),
 ('93000000-0000-0000-0000-000000000013','93000000-0000-0000-0000-000000000102',2),
 ('93000000-0000-0000-0000-000000000013','93000000-0000-0000-0000-000000000103',3),
 ('93000000-0000-0000-0000-000000000012','93000000-0000-0000-0000-000000000104',1);
INSERT INTO private.collection_publications(id,collection_id,release_id,snapshot,digest,imported,operation_id,executor_id)
SELECT '93000000-0000-0000-0000-000000000205',collection_id,'93000000-0000-0000-0000-000000000013',snapshot,digest,true,
  '93000000-0000-0000-0000-000000000407','synthetic-successor'
FROM private.collection_publications WHERE id='93000000-0000-0000-0000-000000000201';
UPDATE private.collection_active_publications SET publication_id='93000000-0000-0000-0000-000000000205'
 WHERE collection_id='93000000-0000-0000-0000-000000000001';
INSERT INTO storage.objects(bucket_id,name,metadata) VALUES
 ('recipe-protected','93000000-0000-0000-0000-000000000101/original.pdf','{}'::jsonb),
 ('recipe-protected','93000000-0000-0000-0000-000000000103/addition.pdf','{}'::jsonb);

CREATE TEMP TABLE counts AS SELECT (SELECT count(*) FROM public.access_entitlements) e,
 (SELECT count(*) FROM private.access_sources) s, (SELECT count(*) FROM private.purchase_orders) o;
GRANT SELECT ON counts TO authenticated;

CREATE FUNCTION pg_temp.access_as(p_user int, p_recipe text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE result text;
BEGIN
 PERFORM pg_temp.admin_claims(('92000000-0000-0000-0000-'||lpad(p_user::text,12,'0'))::uuid,'aal1');
 SET LOCAL ROLE authenticated;
 result := public.recipe_effective_access(('93000000-0000-0000-0000-0000000001'||p_recipe)::uuid)->>'type';
 RESET ROLE;
 RETURN result;
END $$;
CREATE FUNCTION pg_temp.bodies_as(p_user int, p_recipe text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE result int;
BEGIN
 PERFORM pg_temp.admin_claims(('92000000-0000-0000-0000-'||lpad(p_user::text,12,'0'))::uuid,'aal1');
 SET LOCAL ROLE authenticated;
 SELECT count(*) INTO result FROM public.recipe_bodies WHERE recipe_id=('93000000-0000-0000-0000-0000000001'||p_recipe)::uuid;
 RESET ROLE;
 RETURN result;
END $$;

-- No approved policy: original only, pending reconciliation.
SELECT is(pg_temp.access_as(6,'01'),'entitled','the buyer reads their original recipe');
SELECT is(pg_temp.access_as(6,'03'),'denied','without an approved policy the addition is not delivered');

-- Approved additions-v1 for this origin release and source kind.
INSERT INTO private.collection_access_policies(release_id,source_kind,policy,approved_by,approval_reason)
VALUES('93000000-0000-0000-0000-000000000011','native_legacy','additions-v1','92000000-0000-0000-0000-000000000001','Synthetic policy');
SELECT is(pg_temp.access_as(6,'03'),'entitled','original buyer can read a published addition');
SELECT is(pg_temp.access_as(6,'04'),'denied','another collection is not included');
SELECT is(pg_temp.bodies_as(6,'03'),1,'the addition''s body is readable through RLS');
SELECT is(pg_temp.bodies_as(6,'04'),0,'the other collection''s body is not');
SELECT is(pg_temp.bodies_as(7,'03'),0,'a different customer cannot read the addition');
SELECT pg_temp.admin_claims(NULL,'aal1');
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id='93000000-0000-0000-0000-000000000103'),0,
  'anonymous visitors cannot read the addition');
RESET ROLE;

-- Protected files follow the same resolver.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000006','aal1');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='recipe-protected' AND name LIKE '93000000-%'),2,
  'the buyer can read original and added protected files');
SELECT is((public.collection_effective_access('93000000-0000-0000-0000-000000000001')->>'policy'),'additions-v1',
  'the collection reports the additions policy');
SELECT is(jsonb_array_length(public.collection_effective_access('93000000-0000-0000-0000-000000000001')->'recipeIds'),3,
  'and delivers all three current recipes');
SELECT is((public.collection_effective_access('93000000-0000-0000-0000-000000000001')->>'deliveredReleaseId'),
  '93000000-0000-0000-0000-000000000013','through the current release');
SELECT throws_ok($$SELECT private.recipe_access_release('92000000-0000-0000-0000-000000000006','93000000-0000-0000-0000-000000000103')$$,
  '42501',NULL,'customers cannot call the private resolver with any user id');
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000007','aal1');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='recipe-protected' AND name LIKE '93000000-%'),0,
  'a non-buyer cannot read the protected files');
RESET ROLE;

-- Trusted server reads: one library entry per collection with the delivered recipes, and collection-wide ownership.
SELECT is(jsonb_array_length(private.user_collection_library('92000000-0000-0000-0000-000000000006')),1,
  'the library has one entry per owned collection');
SELECT is(private.user_collection_library('92000000-0000-0000-0000-000000000006')#>>'{0,recipes,2,slug}',
  'synthetic-collection-recipe-3','and lists the added recipe in delivered order');
SELECT is(private.collection_customer_state('92000000-0000-0000-0000-000000000006','93000000-0000-0000-0000-000000000001')->>'ownership',
  'owned','a buyer of the original release owns the collection on its newest release');
SELECT is(private.collection_customer_state('92000000-0000-0000-0000-000000000007','93000000-0000-0000-0000-000000000001')->>'ownership',
  'not_owned','a non-buyer does not');

-- Delivery writes nothing.
SELECT ok((SELECT e=(SELECT count(*) FROM public.access_entitlements) AND s=(SELECT count(*) FROM private.access_sources)
  AND o=(SELECT count(*) FROM private.purchase_orders) FROM counts),'no entitlement, source or order rows are created');

-- Withdrawn recipe and unpublished successor.
UPDATE public.recipe_catalog SET publication_state='draft' WHERE id='93000000-0000-0000-0000-000000000103';
SELECT is(pg_temp.access_as(6,'03'),'denied','a withdrawn recipe is not delivered');
UPDATE public.recipe_catalog SET publication_state='published' WHERE id='93000000-0000-0000-0000-000000000103';
UPDATE private.collection_active_publications SET publication_id='93000000-0000-0000-0000-000000000201'
 WHERE collection_id='93000000-0000-0000-0000-000000000001';
SELECT is(pg_temp.access_as(6,'03'),'denied','a successor that is not the current publication is not delivered');
UPDATE private.collection_active_publications SET publication_id='93000000-0000-0000-0000-000000000205'
 WHERE collection_id='93000000-0000-0000-0000-000000000001';

-- Source validity.
UPDATE private.access_sources SET expires_at=now()-interval '1 day', valid_from=now()-interval '2 days' WHERE source_id='syn-legacy-6';
SELECT is(pg_temp.access_as(6,'03'),'denied','an expired source no longer brings additions');
SELECT is(pg_temp.access_as(6,'01'),'entitled','the original purchase is still readable through its entitlement');
INSERT INTO private.access_sources(user_id,release_id,source_kind,source_id)
VALUES('92000000-0000-0000-0000-000000000006','93000000-0000-0000-0000-000000000011','support_grant','syn-support-6');
INSERT INTO private.collection_access_policies(release_id,source_kind,policy,approved_by,approval_reason)
VALUES('93000000-0000-0000-0000-000000000011','support_grant','additions-v1','92000000-0000-0000-0000-000000000001','Synthetic policy');
SELECT is(pg_temp.access_as(6,'03'),'entitled','a second surviving source keeps the additions');
UPDATE private.access_sources SET valid_from=now()+interval '1 day' WHERE source_id='syn-support-6';
SELECT is(pg_temp.access_as(6,'03'),'denied','a future-dated source does not count yet');
UPDATE private.access_sources SET valid_from=now()-interval '1 day' WHERE source_id='syn-support-6';
UPDATE public.access_entitlements SET state='revoked', revoked_at=now()
 WHERE user_id='92000000-0000-0000-0000-000000000006' AND release_id='93000000-0000-0000-0000-000000000011';
SELECT is(pg_temp.access_as(6,'01'),'denied','a revoked entitlement removes the original recipes');
SELECT is(pg_temp.access_as(6,'03'),'denied','and the additions');
UPDATE public.access_entitlements SET state='active', revoked_at=NULL
 WHERE user_id='92000000-0000-0000-0000-000000000006' AND release_id='93000000-0000-0000-0000-000000000011';

-- Buyers keep reading a collection after it is unlisted; visitors do not see it.
UPDATE public.collection_publication_projection SET listing_state='unlisted' WHERE collection_id='93000000-0000-0000-0000-000000000001';
SELECT pg_temp.admin_claims(NULL,'aal1');
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM public.collection_publication_projection WHERE collection_id='93000000-0000-0000-0000-000000000001'),0,
  'an unlisted collection is hidden from visitors');
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000006','aal1');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.collection_publication_projection WHERE collection_id='93000000-0000-0000-0000-000000000001'),1,
  'its buyer still sees it');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
