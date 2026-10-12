-- Test-only synthetic support fixtures, always used inside a rollback transaction after admin-console.sql.
-- Phase 3 tasks add their orders, payments, sources and cases here. IDs use the f3000000-0000-4000-8000- prefix
-- and emails end in @synthetic.test; nothing here may name a real customer, account or provider object.
-- Staff: ...0a1 support viewer, ...0a2 support operator.
INSERT INTO auth.users(id,email,role,aud,email_confirmed_at) VALUES
 ('f3000000-0000-4000-8000-0000000000a1','support-viewer@synthetic.test','authenticated','authenticated',now()),
 ('f3000000-0000-4000-8000-0000000000a2','support-operator@synthetic.test','authenticated','authenticated',now());
DO $$ BEGIN
 IF to_regclass('private.support_workspace_settings') IS NOT NULL THEN
  INSERT INTO private.admin_memberships(user_id,role,granted_by,reason) VALUES
   ('f3000000-0000-4000-8000-0000000000a1','support_viewer','92000000-0000-0000-0000-000000000001','synthetic fixture'),
   ('f3000000-0000-4000-8000-0000000000a2','support_operator','92000000-0000-0000-0000-000000000001','synthetic fixture');
 END IF;
END $$;

-- Run p_sql as synthetic user p_user with assurance p_aal and return its single jsonb result.
CREATE FUNCTION pg_temp.support_as(p_user uuid, p_aal text, p_sql text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE result jsonb;
BEGIN
 PERFORM pg_temp.admin_claims(p_user, p_aal);
 SET LOCAL ROLE authenticated;
 EXECUTE p_sql INTO result;
 RESET ROLE;
 RETURN result;
END $$;

-- Buyers. ...002 and ...00b differ only by a dot; ...00d is unconfirmed; ...00e and ...00f share an identity email;
-- ...00c is the principal of a closed account (no Auth row).
INSERT INTO auth.users(id,email,role,aud,email_confirmed_at) VALUES
 ('f3000000-0000-4000-8000-000000000002','first.last+buyer@synthetic.test','authenticated','authenticated',now()),
 ('f3000000-0000-4000-8000-00000000000b','firstlast+buyer@synthetic.test','authenticated','authenticated',now()),
 ('f3000000-0000-4000-8000-00000000000d','unconfirmed-buyer@synthetic.test','authenticated','authenticated',NULL),
 ('f3000000-0000-4000-8000-00000000000e','shared-a@synthetic.test','authenticated','authenticated',now()),
 ('f3000000-0000-4000-8000-00000000000f','shared-b@synthetic.test','authenticated','authenticated',now());
INSERT INTO auth.identities(id,user_id,provider_id,provider,identity_data) VALUES
 (gen_random_uuid(),'f3000000-0000-4000-8000-00000000000e','support-shared-a','test-a','{"email":"shared-buyer@synthetic.test"}'),
 (gen_random_uuid(),'f3000000-0000-4000-8000-00000000000f','support-shared-b','test-b','{"email":"shared-buyer@synthetic.test"}');

-- One collection with release A (five reviewed recipes), a test offer and a live offer.
INSERT INTO public.recipe_catalog(id,slug,title,public_summary,preview_image_path,total_minutes,publication_state)
SELECT ('f3000000-0000-4000-8000-000000000'||(100+n)::text)::uuid, 'support-recipe-'||n, 'Support recipe '||n,
 'Synthetic', 'recipe-previews/support-'||n||'.webp', 10, 'published' FROM generate_series(1,5) n;
INSERT INTO public.recipe_bodies(recipe_id,yield,allergen_review_state,allergens)
SELECT ('f3000000-0000-4000-8000-000000000'||(100+n)::text)::uuid, '2 portions', 'reviewed_no_allergens', '{}'
FROM generate_series(1,5) n;
INSERT INTO public.recipe_collections(id,slug,title,public_summary,listing_state) VALUES
 ('f3000000-0000-4000-8000-000000000003','synthetic-support-shelf','Synthetic support shelf','Synthetic','listed');
INSERT INTO public.collection_releases(id,collection_id,version,state) VALUES
 ('f3000000-0000-4000-8000-000000000004','f3000000-0000-4000-8000-000000000003',1,'published');
INSERT INTO public.collection_recipes(release_id,recipe_id,position)
SELECT 'f3000000-0000-4000-8000-000000000004', ('f3000000-0000-4000-8000-000000000'||(100+n)::text)::uuid, n
FROM generate_series(1,5) n;
INSERT INTO private.release_manifests(release_id,member_recipe_ids,manifest_checksum,approved_by,approved_at)
SELECT 'f3000000-0000-4000-8000-000000000004', array_agg(('f3000000-0000-4000-8000-000000000'||(100+n)::text)::uuid ORDER BY n),
 repeat('b',64), 'synthetic fixture', now() FROM generate_series(1,5) n;
INSERT INTO private.commercial_offers(id,release_id,provider_account_id,provider_mode,provider_product_id,provider_price_id,
 currency,base_minor_amount,sale_enabled,manifest_hash) VALUES
 ('f3000000-0000-4000-8000-000000000021','f3000000-0000-4000-8000-000000000004','acct_support_test','test',
  'prod_support','price_support','usd',1500,false,repeat('b',64)),
 ('f3000000-0000-4000-8000-000000000022','f3000000-0000-4000-8000-000000000004','acct_support_live','live',
  'prod_support_live','price_support_live','usd',1500,false,repeat('b',64));

-- Orders: ...001 a Phase 2 order (paid, one partial refund, one dispute inquiry); ...011 an older order whose
-- snapshot lacks the policy and manifest fields; ...012 a live-mode order; ...013 an order of the closed account.
INSERT INTO private.purchase_orders(id,support_reference,owner_principal,user_id,offer_id,release_id,snapshot,attempt_state,
 session_id,idempotency_key,version) VALUES
 ('f3000000-0000-4000-8000-000000000001','MCH-1A2B3C','f3000000-0000-4000-8000-000000000002','f3000000-0000-4000-8000-000000000002',
  'f3000000-0000-4000-8000-000000000021','f3000000-0000-4000-8000-000000000004',
  jsonb_build_object('offer_id','f3000000-0000-4000-8000-000000000021','release_id','f3000000-0000-4000-8000-000000000004',
   'price_id','price_support','price_minor',1500,'currency','usd','provider_account_id','acct_support_test','provider_mode','test',
   'terms_version','v1','collection_id','f3000000-0000-4000-8000-000000000003','publication_id',null,'product_id','prod_support',
   'tax_mode','exclusive','quantity',1,'refund_policy_version','v1','access_policy_version','v1',
   'member_recipe_ids',(SELECT jsonb_agg(('f3000000-0000-4000-8000-000000000'||(100+n)::text) ORDER BY n) FROM generate_series(1,5) n),
   'manifest_hash',repeat('b',64),'source_digest',repeat('c',64),'frozen_at','2026-10-01T09:59:00Z'),
  'closed','cs_test_support','support-fixture-1',3),
 ('f3000000-0000-4000-8000-000000000011','MCH-K9','f3000000-0000-4000-8000-000000000002','f3000000-0000-4000-8000-000000000002',
  'f3000000-0000-4000-8000-000000000021','f3000000-0000-4000-8000-000000000004',
  jsonb_build_object('offer_id','f3000000-0000-4000-8000-000000000021','release_id','f3000000-0000-4000-8000-000000000004',
   'price_id','price_support','price_minor',1500,'currency','usd','provider_account_id','acct_support_test','provider_mode','test',
   'terms_version','v1'),
  'open','cs_test_legacy','support-fixture-2',1),
 ('f3000000-0000-4000-8000-000000000012','MCH-L1VE','f3000000-0000-4000-8000-000000000002','f3000000-0000-4000-8000-000000000002',
  'f3000000-0000-4000-8000-000000000022','f3000000-0000-4000-8000-000000000004',
  jsonb_build_object('offer_id','f3000000-0000-4000-8000-000000000022','release_id','f3000000-0000-4000-8000-000000000004',
   'price_id','price_support_live','price_minor',1500,'currency','usd','provider_account_id','acct_support_live',
   'provider_mode','live','terms_version','v1','collection_id','f3000000-0000-4000-8000-000000000003',
   'refund_policy_version','v1','access_policy_version','v1','manifest_hash',repeat('b',64)),
  'closed','cs_live_support','support-fixture-3',2),
 ('f3000000-0000-4000-8000-000000000013','MCH-C10SED','f3000000-0000-4000-8000-00000000000c',NULL,
  'f3000000-0000-4000-8000-000000000021','f3000000-0000-4000-8000-000000000004',
  jsonb_build_object('offer_id','f3000000-0000-4000-8000-000000000021','release_id','f3000000-0000-4000-8000-000000000004',
   'price_id','price_support','price_minor',1500,'currency','usd','provider_account_id','acct_support_test','provider_mode','test',
   'terms_version','v1'),
  'closed','cs_test_closed','support-fixture-4',2);
INSERT INTO private.provider_payments(id,order_id,provider_account_id,provider_mode,payment_intent_id,charge_id,status,
 captured_amount,currency,paid_at,verified_at) VALUES
 ('f3000000-0000-4000-8000-000000000031','f3000000-0000-4000-8000-000000000001','acct_support_test','test','pi_support','ch_support',
  'succeeded',1500,'usd','2026-10-01T10:00:00Z','2026-10-01T10:00:05Z'),
 ('f3000000-0000-4000-8000-000000000032','f3000000-0000-4000-8000-000000000012','acct_support_live','live','pi_support','ch_support_live',
  'succeeded',1500,'usd','2026-10-01T11:00:00Z','2026-10-01T11:00:05Z');
INSERT INTO private.payment_refunds(id,provider_refund_id,order_id,payment_id,amount,currency,status,occurred_at,verified_at) VALUES
 ('f3000000-0000-4000-8000-000000000041','re_support_1','f3000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000031',100,'usd','succeeded','2026-10-02T10:00:00Z','2026-10-02T10:00:05Z');
INSERT INTO private.payment_disputes(id,provider_dispute_id,order_id,payment_id,amount,currency,status,access_effect) VALUES
 ('f3000000-0000-4000-8000-000000000051','du_support_1','f3000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000031',1500,'usd','warning_needs_response','none');
