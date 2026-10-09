BEGIN;
SELECT plan(24);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-collections.sql

-- Collection 1 sells release 11 through offer 21 (enabled for these tests). Customer 6 already owns it.
UPDATE private.commercial_offers SET sale_enabled=true WHERE id='93000000-0000-0000-0000-000000000021';

SELECT is(private.reserve_collection_order('92000000-0000-0000-0000-000000000007','93000000-0000-0000-0000-000000000001',
  pg_temp.collection_checkout_expectation() || jsonb_build_object('manifestHash',repeat('0',64)),
  'synthetic-stale-reservation')->>'state','stale','stale product cannot be charged');
SELECT is(private.reserve_collection_order('92000000-0000-0000-0000-000000000007','93000000-0000-0000-0000-000000000001',
  pg_temp.collection_checkout_expectation() || jsonb_build_object('manifestHash',repeat('0',64)),
  'synthetic-stale-reservation-2')->'expected',pg_temp.collection_checkout_expectation(),
  'a stale reply carries the current expectation so the page can refresh');
SELECT is(private.reserve_collection_order('92000000-0000-0000-0000-000000000007','93000000-0000-0000-0000-000000000001',
  NULL,'synthetic-missing-expectation')->>'state','stale','a missing expectation is refused');
SELECT is(private.reserve_collection_order('92000000-0000-0000-0000-000000000006','93000000-0000-0000-0000-000000000001',
  pg_temp.collection_checkout_expectation(),'synthetic-owned')->>'state','owned','an existing buyer is not charged again');

-- A matching reservation freezes the whole promise.
CREATE TEMP TABLE r1 AS SELECT private.reserve_collection_order('92000000-0000-0000-0000-000000000007',
  '93000000-0000-0000-0000-000000000001',pg_temp.collection_checkout_expectation(),'synthetic-reservation-1') r;
SELECT is((SELECT r->>'state' FROM r1),'reserved','a current expectation reserves an order');
SELECT is((SELECT r#>>'{order,snapshot,price_minor}' FROM r1),'1500','the price is frozen');
SELECT is((SELECT r#>'{order,snapshot,member_recipe_ids}' FROM r1),
  '["93000000-0000-0000-0000-000000000101","93000000-0000-0000-0000-000000000102"]'::jsonb,'the member list is frozen in order');
SELECT ok((SELECT (r#>'{order,snapshot}') ?& ARRAY['provider_account_id','provider_mode','currency','terms_version','refund_policy_version',
  'access_policy_version','tax_mode','quantity','product_id','manifest_hash','source_digest','collection_id'] FROM r1),
  'account, mode, terms, policies and digests are frozen');
SELECT is((SELECT r#>>'{order,attemptState}' FROM r1),'creating','the order waits for its provider session');

-- The same buyer reuses that attempt, even from a stale page, and its snapshot never changes.
SELECT is(private.reserve_collection_order('92000000-0000-0000-0000-000000000007','93000000-0000-0000-0000-000000000001',
  pg_temp.collection_checkout_expectation() || jsonb_build_object('offerId',gen_random_uuid()),'synthetic-reservation-2')#>>'{order,id}',
  (SELECT r#>>'{order,id}' FROM r1),'an open attempt is reused instead of opening a second checkout');
SELECT is((SELECT count(*)::int FROM private.purchase_orders WHERE user_id='92000000-0000-0000-0000-000000000007'),1,
  'only one order exists for that buyer');

-- A successor release goes on sale; the older pending attempt is reused with its original snapshot.
INSERT INTO public.collection_releases(id,collection_id,version,state) VALUES
 ('93000000-0000-0000-0000-000000000013','93000000-0000-0000-0000-000000000001',2,'published');
INSERT INTO public.collection_recipes(release_id,recipe_id,position) VALUES
 ('93000000-0000-0000-0000-000000000013','93000000-0000-0000-0000-000000000101',1),
 ('93000000-0000-0000-0000-000000000013','93000000-0000-0000-0000-000000000102',2),
 ('93000000-0000-0000-0000-000000000013','93000000-0000-0000-0000-000000000103',3);
INSERT INTO private.collection_publications(id,collection_id,release_id,snapshot,digest,imported,operation_id,executor_id)
SELECT '93000000-0000-0000-0000-000000000205',collection_id,'93000000-0000-0000-0000-000000000013',snapshot,digest,true,
  '93000000-0000-0000-0000-000000000407','synthetic-successor'
FROM private.collection_publications WHERE id='93000000-0000-0000-0000-000000000201';
UPDATE private.collection_active_publications SET publication_id='93000000-0000-0000-0000-000000000205'
 WHERE collection_id='93000000-0000-0000-0000-000000000001';
SELECT is(pg_temp.collection_checkout_expectation(),NULL,'a database collection never falls back to an older release''s offer');

-- Offer advancement: only the release binding and manifest move, and only if the terms are unchanged.
SELECT throws_ok($$SELECT private.collection_advance_offer('93000000-0000-0000-0000-000000000021',
  '93000000-0000-0000-0000-000000000013','m',repeat('0',64))$$,'PT409','ADM_CONFLICT','changed terms block advancement');
SELECT throws_ok($$SELECT private.collection_advance_offer('93000000-0000-0000-0000-000000000021',
  '93000000-0000-0000-0000-000000000099','m',(SELECT private.collection_offer_terms_digest(o) FROM private.commercial_offers o
   WHERE id='93000000-0000-0000-0000-000000000021'))$$,'22023','ADM_INVALID','an offer cannot move to another collection');
CREATE TEMP TABLE terms_before AS SELECT private.collection_offer_terms_digest(o) d FROM private.commercial_offers o
 WHERE id='93000000-0000-0000-0000-000000000021';
SELECT lives_ok($$SELECT private.collection_advance_offer('93000000-0000-0000-0000-000000000021',
  '93000000-0000-0000-0000-000000000013','advanced-manifest',(SELECT d FROM terms_before))$$,'unchanged terms advance');
SELECT is((SELECT private.collection_offer_terms_digest(o) FROM private.commercial_offers o WHERE id='93000000-0000-0000-0000-000000000021'),
  (SELECT d FROM terms_before),'advancement leaves price, account, terms and sale switch unchanged');
SELECT is(pg_temp.collection_checkout_expectation()->>'releaseId','93000000-0000-0000-0000-000000000013',
  'the successor release is now on sale');
SELECT is(private.reserve_collection_order('92000000-0000-0000-0000-000000000007','93000000-0000-0000-0000-000000000001',
  pg_temp.collection_checkout_expectation(),'synthetic-reservation-3')#>>'{order,releaseId}',
  '93000000-0000-0000-0000-000000000011','the pending attempt for the older release is reused');
SELECT is((SELECT jsonb_array_length(snapshot->'member_recipe_ids') FROM private.purchase_orders
  WHERE user_id='92000000-0000-0000-0000-000000000007'),2,'and keeps the members it was reserved with');

-- A delayed payment for that older order settles against its frozen terms.
SELECT is(private.record_payment_and_grant_access((SELECT (r#>>'{order,id}')::uuid FROM r1),'acct_synthetic_collections','test',
  'pi_synthetic_delayed',NULL,1500,'usd',now()) IS NOT NULL,true,'the delayed payment is recorded');
SELECT is((SELECT attempt_state FROM private.purchase_orders WHERE id=(SELECT (r#>>'{order,id}')::uuid FROM r1)),'closed',
  'the order closes on its original terms');
SELECT ok(EXISTS(SELECT 1 FROM public.access_entitlements WHERE user_id='92000000-0000-0000-0000-000000000007'
  AND release_id='93000000-0000-0000-0000-000000000011' AND state='active'),'access is granted for the release that was bought');

-- Two unresolved attempts across releases need review, never a silent pick.
INSERT INTO private.purchase_orders(support_reference,owner_principal,user_id,offer_id,release_id,snapshot,attempt_state,idempotency_key) VALUES
 ('SYN-A1','92000000-0000-0000-0000-000000000005','92000000-0000-0000-0000-000000000005','93000000-0000-0000-0000-000000000021',
  '93000000-0000-0000-0000-000000000011','{}','open','syn-a1'),
 ('SYN-A2','92000000-0000-0000-0000-000000000005','92000000-0000-0000-0000-000000000005','93000000-0000-0000-0000-000000000021',
  '93000000-0000-0000-0000-000000000013','{}','open','syn-a2');
SELECT is(private.reserve_collection_order('92000000-0000-0000-0000-000000000005','93000000-0000-0000-0000-000000000001',
  pg_temp.collection_checkout_expectation(),'synthetic-review')->>'state','review_required','two open attempts need review');

-- Customers cannot call the reservation themselves.
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT private.reserve_collection_order('92000000-0000-0000-0000-000000000007',
  '93000000-0000-0000-0000-000000000001','{}'::jsonb,'synthetic-direct')$$,'42501',NULL,'browser roles cannot reserve directly');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
