BEGIN;
SELECT plan(27);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-collections.sql

-- Collection 1 sells release 11 through offer 21. Guests are random principals that are not accounts.
UPDATE private.commercial_offers SET sale_enabled=true WHERE id='93000000-0000-0000-0000-000000000021';
INSERT INTO auth.users(id,email,role,aud,email_confirmed_at) VALUES
 ('95000000-0000-0000-0000-000000000001','payfirst.buyer@synthetic.test','authenticated','authenticated',now()),
 ('95000000-0000-0000-0000-000000000002','payfirst.other@synthetic.test','authenticated','authenticated',now()),
 ('95000000-0000-0000-0000-000000000003','payfirst.unconfirmed@synthetic.test','authenticated','authenticated',NULL);

-- Reservation
SELECT throws_ok($$SELECT private.reserve_guest_collection_order('95000000-0000-0000-0000-000000000001',
  '93000000-0000-0000-0000-000000000001',pg_temp.collection_checkout_expectation(),'synthetic-guest-account')$$,
  '22023','CHECKOUT_INVALID','an account id can never be used as a guest principal');
SELECT is(private.reserve_guest_collection_order('96000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000001',
  pg_temp.collection_checkout_expectation() || jsonb_build_object('manifestHash',repeat('0',64)),'synthetic-guest-stale')->>'state',
  'stale','a guest cannot be charged for a stale page');

CREATE TEMP TABLE g1 AS SELECT private.reserve_guest_collection_order('96000000-0000-0000-0000-000000000001',
  '93000000-0000-0000-0000-000000000001',pg_temp.collection_checkout_expectation(),'synthetic-guest-1') r;
SELECT is((SELECT r->>'state' FROM g1),'reserved','a guest reserves an order');
SELECT is((SELECT r#>>'{order,userId}' FROM g1),NULL,'the guest order has no account');
SELECT is((SELECT r#>>'{order,snapshot,price_minor}' FROM g1),'1500','the price is frozen for the guest');
SELECT is((SELECT r#>>'{order,snapshot,checkout_kind}' FROM g1),'guest','the snapshot says it was a guest checkout');
SELECT is((SELECT (r#>'{order,snapshot}') - 'checkout_kind' - 'frozen_at' FROM g1),
  (SELECT (private.reserve_collection_order('92000000-0000-0000-0000-000000000007','93000000-0000-0000-0000-000000000001',
    pg_temp.collection_checkout_expectation(),'synthetic-account-compare')#>'{order,snapshot}') - 'frozen_at'),
  'a guest snapshot freezes the same promise as an account snapshot');
SELECT is(private.reserve_guest_collection_order('96000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000001',
  pg_temp.collection_checkout_expectation(),'synthetic-guest-1b')#>>'{order,id}',(SELECT r#>>'{order,id}' FROM g1),
  'the same guest reuses their open attempt');
SELECT isnt(private.reserve_guest_collection_order('96000000-0000-0000-0000-000000000002','93000000-0000-0000-0000-000000000001',
  pg_temp.collection_checkout_expectation(),'synthetic-guest-2')#>>'{order,id}',(SELECT r#>>'{order,id}' FROM g1),
  'another guest gets their own order');

-- Payment: recorded as for any order, without access, and the Stripe email is kept once.
SELECT is(private.record_payment_and_grant_access((SELECT (r#>>'{order,id}')::uuid FROM g1),'acct_synthetic_collections','test',
  'pi_synthetic_guest_1',NULL,1500,'usd',now())->>'entitlement_state',NULL,'a guest payment grants no access by itself');
SELECT is((SELECT attempt_state FROM private.purchase_orders WHERE id=(SELECT (r#>>'{order,id}')::uuid FROM g1)),'closed',
  'the paid guest order closes');
SELECT is(private.record_guest_buyer_email((SELECT (r#>>'{order,id}')::uuid FROM g1),'not an email'),false,'a malformed email is refused');
SELECT is(private.record_guest_buyer_email((SELECT (r#>>'{order,id}')::uuid FROM g1),'  PayFirst.Buyer@Synthetic.TEST '),true,
  'the Stripe email is recorded');
SELECT is((SELECT buyer_email FROM private.purchase_orders WHERE id=(SELECT (r#>>'{order,id}')::uuid FROM g1)),
  'payfirst.buyer@synthetic.test','it is stored trimmed and lowercase');
SELECT is(private.record_guest_buyer_email((SELECT (r#>>'{order,id}')::uuid FROM g1),'payfirst.other@synthetic.test'),false,
  'the recorded email cannot be replaced');

-- Claim: only a confirmed account with the same email, once.
SELECT is(private.claim_guest_orders('95000000-0000-0000-0000-000000000002')->>'claimed','0','another confirmed email claims nothing');
CREATE TEMP TABLE g4 AS SELECT private.reserve_guest_collection_order('96000000-0000-0000-0000-000000000004',
  '93000000-0000-0000-0000-000000000001',pg_temp.collection_checkout_expectation(),'synthetic-guest-4') r;
SELECT private.record_payment_and_grant_access((SELECT (r#>>'{order,id}')::uuid FROM g4),'acct_synthetic_collections','test',
  'pi_synthetic_guest_4',NULL,1500,'usd',now());
SELECT private.record_guest_buyer_email((SELECT (r#>>'{order,id}')::uuid FROM g4),'payfirst.unconfirmed@synthetic.test');
SELECT is(private.claim_guest_orders('95000000-0000-0000-0000-000000000003')->>'claimed','0',
  'an account whose email is not confirmed claims nothing');
SELECT is(private.claim_guest_orders('95000000-0000-0000-0000-000000000001')->>'claimed','1','the confirmed buyer claims the paid order');
SELECT is((SELECT user_id FROM private.purchase_orders WHERE id=(SELECT (r#>>'{order,id}')::uuid FROM g1)),
  '95000000-0000-0000-0000-000000000001'::uuid,'the order now belongs to the account');
SELECT ok((SELECT claimed_at IS NOT NULL FROM private.purchase_orders WHERE id=(SELECT (r#>>'{order,id}')::uuid FROM g1)),
  'the claim time is recorded');
SELECT ok(EXISTS(SELECT 1 FROM public.access_entitlements WHERE user_id='95000000-0000-0000-0000-000000000001'
  AND release_id='93000000-0000-0000-0000-000000000011' AND state='active'),'the claim grants access to the release');
SELECT is(private.claim_guest_orders('95000000-0000-0000-0000-000000000001')->>'claimed','0','claiming again changes nothing');

-- An unpaid guest order with the same email is never claimed.
UPDATE private.purchase_orders SET buyer_email='payfirst.buyer@synthetic.test'
 WHERE owner_principal='96000000-0000-0000-0000-000000000002' AND user_id IS NULL;
SELECT is(private.claim_guest_orders('95000000-0000-0000-0000-000000000001')->>'claimed','0','an unpaid guest order is not claimed');

-- A fully refunded guest order is attached without access, as the payment writer would record it.
CREATE TEMP TABLE g3 AS SELECT private.reserve_guest_collection_order('96000000-0000-0000-0000-000000000003',
  '93000000-0000-0000-0000-000000000001',pg_temp.collection_checkout_expectation(),'synthetic-guest-3') r;
SELECT lives_ok($$SELECT private.record_payment_and_grant_access((SELECT (r#>>'{order,id}')::uuid FROM g3),'acct_synthetic_collections',
  'test','pi_synthetic_guest_3',NULL,1500,'usd',now())$$,'a second guest payment is recorded');
SELECT private.record_refund_and_recompute_access((SELECT (r#>>'{order,id}')::uuid FROM g3),'re_synthetic_guest_3',
  (SELECT id FROM private.provider_payments WHERE payment_intent_id='pi_synthetic_guest_3'),1500,'usd','succeeded','requested_by_customer',now());
SELECT private.record_guest_buyer_email((SELECT (r#>>'{order,id}')::uuid FROM g3),'payfirst.other@synthetic.test');
SELECT is(private.claim_guest_orders('95000000-0000-0000-0000-000000000002')->>'claimed','1','the refunded order is attached to its buyer');
SELECT ok(NOT EXISTS(SELECT 1 FROM public.access_entitlements WHERE user_id='95000000-0000-0000-0000-000000000002' AND state='active'),
  'but a fully refunded purchase grants no access');

-- Browsers cannot reserve or claim for themselves.
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT private.claim_guest_orders('95000000-0000-0000-0000-000000000001')$$,'42501',NULL,'browser roles cannot claim');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
