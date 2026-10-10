BEGIN;
SELECT plan(23);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

CREATE TEMP TABLE staff AS SELECT 'f3000000-0000-4000-8000-0000000000a2'::uuid op, 'f3000000-0000-4000-8000-0000000000a1'::uuid viewer,
 '92000000-0000-0000-0000-000000000001'::uuid owner;
CREATE FUNCTION pg_temp.call(p_user uuid, p_sql text) RETURNS jsonb LANGUAGE sql AS $$ SELECT pg_temp.support_as(p_user, 'aal2', p_sql) $$;
-- Orders ...7NN for customers ...8NN, each paid with an eligible, projected purchase source.
CREATE FUNCTION pg_temp.new_order(p_n int) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid := ('f3000000-0000-4000-8000-0000000007' || lpad(p_n::text, 2, '0'))::uuid;
 v_user uuid := ('f3000000-0000-4000-8000-0000000008' || lpad(p_n::text, 2, '0'))::uuid;
BEGIN
 INSERT INTO auth.users(id, email, role, aud, email_confirmed_at) VALUES (v_user, 'check-' || p_n || '@synthetic.test', 'authenticated',
  'authenticated', now());
 INSERT INTO private.purchase_orders(id, support_reference, owner_principal, user_id, offer_id, release_id, snapshot, attempt_state,
  session_id, idempotency_key, version)
 SELECT v_id, 'MCH-C' || p_n, v_user, v_user, offer_id, release_id, snapshot, 'closed', 'cs_test_check_' || p_n, 'check-' || p_n, 1
 FROM private.purchase_orders WHERE id = 'f3000000-0000-4000-8000-000000000001';
 INSERT INTO private.provider_payments(order_id, provider_account_id, provider_mode, payment_intent_id, charge_id, status,
  captured_amount, currency, paid_at)
 VALUES (v_id, 'acct_support_test', 'test', 'pi_check_' || p_n, 'ch_check_' || p_n, 'succeeded', 1500, 'usd', '2026-10-01T10:00:00Z');
 INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, valid_from)
 VALUES (v_user, 'f3000000-0000-4000-8000-000000000004', 'stripe_purchase', v_id::text, true, '2026-10-01T10:00:00Z');
 PERFORM private.project_user_entitlement(v_user, 'f3000000-0000-4000-8000-000000000004');
 RETURN v_id;
END $$;
CREATE FUNCTION pg_temp.u(p_n int) RETURNS uuid LANGUAGE sql AS $$ SELECT ('f3000000-0000-4000-8000-0000000008' || lpad(p_n::text, 2, '0'))::uuid $$;
CREATE FUNCTION pg_temp.o(p_n int) RETURNS uuid LANGUAGE sql AS $$ SELECT ('f3000000-0000-4000-8000-0000000007' || lpad(p_n::text, 2, '0'))::uuid $$;
CREATE FUNCTION pg_temp.facts(p_n int, p_refund_status text DEFAULT NULL) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('accountId','acct_support_test','mode','test','sessionId','cs_test_check_' || p_n,'paymentIntentId','pi_check_' || p_n,
   'chargeId','ch_check_' || p_n,'capturedMinor',1500,'currency','usd','paymentState','paid','paidAt','2026-10-01T10:00:00Z',
   'refunds',CASE WHEN p_refund_status IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('id','re_check_' || p_n,
     'paymentIntentId','pi_check_' || p_n,'chargeId','ch_check_' || p_n,'amountMinor',1500,'currency','usd','status',p_refund_status,
     'occurredAt','2026-10-02T10:00:00Z')) END,'disputes','[]'::jsonb)
$$;
CREATE FUNCTION pg_temp.record(p_job uuid, p_facts jsonb) RETURNS uuid LANGUAGE sql AS $$
 SELECT (private.commerce_observation_record(p_job, (private.commerce_verification_claim(p_job)->>'fence')::bigint, p_facts, true, '[]',
  'test')->>'observationId')::uuid
$$;
-- A webhook answer applied by the system, as Stripe would report it now.
CREATE FUNCTION pg_temp.webhook(p_n int, p_refund_status text) RETURNS jsonb LANGUAGE sql AS $$
 SELECT private.commerce_reconcile_system(pg_temp.record(private.commerce_verification_request(pg_temp.o(p_n), 'webhook'),
  pg_temp.facts(p_n, p_refund_status)), gen_random_uuid(), NULL)
$$;
-- What the signed-in customer can open, through the same public reader their pages use.
CREATE FUNCTION pg_temp.reads(p_user uuid, p_recipe text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
 PERFORM pg_temp.admin_claims(p_user, 'aal1');
 v := public.recipe_effective_access(('f3000000-0000-4000-8000-000000000' || p_recipe)::uuid)->>'type';
 PERFORM set_config('request.jwt.claims', '', true);
 RETURN v;
END $$;
SELECT private.commerce_verifier_register(session_user::text, 'Test verifier', '92000000-0000-0000-0000-000000000001');
INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
VALUES ('v1', 'v1', '{"id":"synthetic","approved":true,"version":"synthetic-v1","pendingRefund":"retain","partialRefund":"retain",
  "fullRefund":"ineligible","inquiry":"retain","formalOpen":"hold","formalLost":"ineligible","duration":"indefinite","fixedSeconds":null}',
  '92000000-0000-0000-0000-000000000001', 'Synthetic test mapping');
UPDATE private.support_workspace_settings SET stage = 'repair';

-- A repair of order ...001 (paid, no source) is prepared, approved, applied, then post-checked.
CREATE TEMP TABLE r AS SELECT pg_temp.call((SELECT op FROM staff), format('SELECT public.admin_support_prepare(%L, %L, ''reconcile_order'', ''Missing access'', %L)',
  'f3000000-0000-4000-8000-000000000001', pg_temp.record((pg_temp.call((SELECT op FROM staff), format('SELECT public.admin_support_diagnose_begin(%L, %L)',
   'f3000000-0000-4000-8000-000000000001', gen_random_uuid()))->>'jobId')::uuid,
   (SELECT jsonb_build_object('accountId','acct_support_test','mode','test','sessionId','cs_test_support','paymentIntentId','pi_support',
     'chargeId','ch_support','capturedMinor',1500,'currency','usd','paymentState','paid','paidAt','2026-10-01T10:00:00Z',
     'refunds',jsonb_build_array(jsonb_build_object('id','re_support_1','paymentIntentId','pi_support','chargeId','ch_support',
       'amountMinor',100,'currency','usd','status','succeeded','occurredAt','2026-10-02T10:00:00Z')),
     'disputes',jsonb_build_array(jsonb_build_object('id','du_support_1','paymentIntentId','pi_support','chargeId','ch_support',
       'amountMinor',1500,'currency','usd','status','warning_needs_response','classification','inquiry','deadline',NULL))))),
  gen_random_uuid())) p, gen_random_uuid() op;
SELECT pg_temp.call((SELECT owner FROM staff), format('SELECT public.admin_support_approve(%L, %L, %L)', (SELECT p->>'id' FROM r),
  (SELECT p->>'digest' FROM r), gen_random_uuid()));
CREATE TEMP TABLE r_begin AS SELECT pg_temp.call((SELECT op FROM staff), format('SELECT public.admin_support_execute_begin(%L)',
  jsonb_build_object('operationId', (SELECT op FROM r), 'proposalId', (SELECT p->>'id' FROM r), 'expectedDigest', (SELECT p->>'digest' FROM r),
   'caseId', NULL))) b;
SELECT is(pg_temp.call((SELECT op FROM staff), format('SELECT public.admin_support_postcheck(%L)', (SELECT op FROM r)))->>'state', 'checking',
  'nothing is confirmed before the repair commits');
CREATE TEMP TABLE r_receipt AS SELECT pg_temp.call((SELECT op FROM staff), format('SELECT public.admin_support_execute(%L, %L)', (SELECT op FROM r),
  pg_temp.record((SELECT (b->>'jobId')::uuid FROM r_begin), (SELECT facts FROM private.commerce_provider_observations
   WHERE id = (SELECT (p->>'observationId')::uuid FROM r))))) x;
SELECT is((SELECT x->>'verification' FROM r_receipt), 'pending', 'a fresh receipt awaits its post-check');
SELECT throws_ok(format('SELECT pg_temp.call((SELECT viewer FROM staff), %L)', format('SELECT public.admin_support_postcheck(%L)', (SELECT op FROM r))),
  'P0002', 'ADM_NOT_FOUND', 'other staff cannot post-check someone else''s repair');
SELECT is(pg_temp.call((SELECT op FROM staff), format('SELECT public.admin_support_postcheck(%L)', (SELECT op FROM r)))->>'verification',
  'verified', 'the customer''s current access matches the receipt');
SELECT is(pg_temp.call((SELECT op FROM staff), format('SELECT public.admin_support_operation(%L)', (SELECT op FROM r))),
  (SELECT x || '{"verification":"verified"}' FROM r_receipt), 'the receipt now reads as verified');
SELECT is(pg_temp.call((SELECT op FROM staff), format('SELECT public.admin_support_execute(%L, %L)', (SELECT op FROM r), gen_random_uuid()))->>'verification',
  'verified', 'and a repeated commit returns the same, verified receipt');

-- Later, something removes the access: the post-check stays pending and opens one follow-up case, not a repair.
UPDATE private.access_sources SET is_eligible = false, ineligibility_reason = 'manual_hold'
WHERE source_kind = 'stripe_purchase' AND source_id = 'f3000000-0000-4000-8000-000000000001';
SELECT private.project_user_entitlement('f3000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000004');
CREATE TEMP TABLE counts AS SELECT (SELECT count(*) FROM private.support_proposals) proposals, (SELECT count(*) FROM private.support_operations) ops;
SELECT is(pg_temp.call((SELECT op FROM staff), format('SELECT public.admin_support_postcheck(%L)', (SELECT op FROM r)))->>'verification',
  'pending', 'a mismatch keeps the receipt pending');
SELECT is((SELECT jsonb_build_array(c.category, c.state) FROM private.support_cases c JOIN private.support_postchecks p ON p.follow_up_case_id = c.id
  WHERE p.operation_id = (SELECT op FROM r)), '["missing_access", "open"]'::jsonb, 'and opens a follow-up case');
SELECT pg_temp.call((SELECT op FROM staff), format('SELECT public.admin_support_postcheck(%L)', (SELECT op FROM r)));
SELECT is((SELECT count(DISTINCT follow_up_case_id)::int FROM private.support_postchecks WHERE operation_id = (SELECT op FROM r)), 1,
  'checking again reuses the same case');
SELECT ok((SELECT proposals = (SELECT count(*) FROM private.support_proposals) AND ops = (SELECT count(*) FROM private.support_operations) FROM counts),
  'no new repair is prepared or started by a post-check');
SELECT throws_ok($$UPDATE private.support_postchecks SET matched = true$$, '42501', 'ADM_IMMUTABLE', 'post-check results cannot be edited');

-- Notifications: diagnosis and projection never notify; a fulfilment notifies once, only with delivery approved.
SELECT is(ARRAY[private.commerce_notification_effect('diagnosis', false, true), private.commerce_notification_effect('projection', false, true),
  private.commerce_notification_effect('fulfilment', false, true), private.commerce_notification_effect('fulfilment', true, true),
  private.commerce_notification_effect('fulfilment', false, false)], ARRAY['none', 'none', 'purchase_confirmation', 'none', 'none'],
  'the notification rule matches its TypeScript twin');
SELECT is((SELECT purchase_confirmation_delivery FROM private.commerce_settings), false, 'delivery stays off until a sender is verified');
SELECT is((SELECT r.x->'effects'->0->>'notification' FROM r_receipt r), 'none', 'so a repair claims no confirmation');

-- The customer's own reads change as soon as access does: release B (with three additions) is delivered, and
-- purchases of release A receive additions; app purchases of A do not.
INSERT INTO public.recipe_catalog(id,slug,title,public_summary,preview_image_path,total_minutes,publication_state)
SELECT ('f3000000-0000-4000-8000-000000000'||(100+n)::text)::uuid, 'support-recipe-'||n, 'Support recipe '||n,
 'Synthetic', 'recipe-previews/support-'||n||'.webp', 10, 'published' FROM generate_series(6,8) n;
INSERT INTO public.recipe_bodies(recipe_id,yield,allergen_review_state,allergens)
SELECT ('f3000000-0000-4000-8000-000000000'||(100+n)::text)::uuid, '2 portions', 'reviewed_no_allergens', '{}' FROM generate_series(6,8) n;
INSERT INTO public.collection_releases(id,collection_id,version,state) VALUES
 ('f3000000-0000-4000-8000-000000000005','f3000000-0000-4000-8000-000000000003',2,'published');
INSERT INTO public.collection_recipes(release_id,recipe_id,position)
SELECT 'f3000000-0000-4000-8000-000000000005', ('f3000000-0000-4000-8000-000000000'||(100+n)::text)::uuid, n FROM generate_series(1,8) n;
UPDATE public.collection_releases SET state='sealed', sealed_at=now() WHERE id='f3000000-0000-4000-8000-000000000004';
INSERT INTO private.collection_publications(id,collection_id,release_id,snapshot,digest,imported,operation_id,executor_id) VALUES
 ('f3000000-0000-4000-8000-000000000061','f3000000-0000-4000-8000-000000000003','f3000000-0000-4000-8000-000000000005',
  '{"collectionId":"f3000000-0000-4000-8000-000000000003"}', repeat('d',64), true, gen_random_uuid(), 'synthetic fixture');
INSERT INTO private.collection_active_publications(collection_id,publication_id) VALUES
 ('f3000000-0000-4000-8000-000000000003','f3000000-0000-4000-8000-000000000061');
INSERT INTO private.collection_access_policies(release_id,source_kind,policy,approved_by,approval_reason) VALUES
 ('f3000000-0000-4000-8000-000000000004','stripe_purchase','additions-v1','92000000-0000-0000-0000-000000000001','synthetic'),
 ('f3000000-0000-4000-8000-000000000004','native_legacy','original-only','92000000-0000-0000-0000-000000000001','synthetic');
SELECT pg_temp.new_order(1);
SELECT pg_temp.new_order(2);
INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, valid_from)
VALUES (pg_temp.u(2), 'f3000000-0000-4000-8000-000000000004', 'native_legacy', 'app-receipt-check-2', true, '2026-09-01T10:00:00Z');
SELECT is(ARRAY[pg_temp.reads(pg_temp.u(1), '101'), pg_temp.reads(pg_temp.u(1), '106')], ARRAY['entitled', 'entitled'],
  'a web buyer reads the original recipes and the additions');

SELECT pg_temp.webhook(1, 'succeeded');
SELECT is(ARRAY[pg_temp.reads(pg_temp.u(1), '101'), pg_temp.reads(pg_temp.u(1), '106')], ARRAY['denied', 'denied'],
  'after a full refund the original recipes and the inherited additions close at once');
SELECT is(jsonb_array_length(private.user_collection_library(pg_temp.u(1))), 0, 'and the library no longer lists the collection');
SELECT is(public.recipe_effective_access('f3000000-0000-4000-8000-000000000101')->>'type', 'denied', 'a signed-out read is denied');

SELECT pg_temp.webhook(2, 'succeeded');
SELECT is(ARRAY[pg_temp.reads(pg_temp.u(2), '101'), pg_temp.reads(pg_temp.u(2), '106')], ARRAY['entitled', 'denied'],
  'an app purchase keeps the originals but not the web purchase''s additions');
SELECT is((SELECT is_eligible FROM private.access_sources WHERE source_id = 'app-receipt-check-2'), true, 'the app purchase itself is untouched');

SELECT pg_temp.webhook(1, 'failed');
SELECT is(ARRAY[pg_temp.reads(pg_temp.u(1), '101'), pg_temp.reads(pg_temp.u(1), '106')], ARRAY['entitled', 'entitled'],
  'when the refund fails, access and additions return at once, with no stale denial');
SELECT is(jsonb_array_length(private.user_collection_library(pg_temp.u(1))), 1, 'and the library lists the collection again');
SELECT is((SELECT jsonb_array_length(l->'recipes') FROM jsonb_array_elements(private.user_collection_library(pg_temp.u(1))) l), 8,
  'with all eight delivered recipes');

SELECT * FROM finish();
ROLLBACK;
