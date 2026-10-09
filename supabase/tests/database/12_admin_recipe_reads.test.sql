BEGIN;
SELECT no_plan();
\ir ../../test-fixtures/admin-console.sql

-- 27 recipes: literal-search edge cases, pagination, missing data, Unicode.
INSERT INTO public.recipe_catalog(id, slug, title, public_summary, preview_image_path, total_minutes, publication_state)
SELECT ('91000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'admin-read-' || n,
  CASE
    WHEN n = 1 THEN '100% Soup'
    WHEN n = 2 THEN 'under_score broth'
    WHEN n = 3 THEN 'Crème brûlée Déssert'
    WHEN n = 4 THEN 'No Body Recipe'
    WHEN n = 5 THEN 'No Image Recipe'
    ELSE 'Synthetic Recipe ' || n
  END,
  'Synthetic summary', CASE WHEN n = 5 THEN '' ELSE 'recipe-previews/fixture.webp' END,
  10 + n,
  CASE WHEN n % 3 = 0 THEN 'published' WHEN n % 7 = 0 THEN 'withdrawn' ELSE 'draft' END
FROM generate_series(1, 27) n;

INSERT INTO public.recipe_bodies(recipe_id, ingredients, instructions, yield, allergen_review_state)
SELECT ('91000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '[{"item":"Synthetic"}]', '[{"step":1,"text":"Synthetic"}]',
  n || ' servings', CASE WHEN n % 2 = 0 THEN 'reviewed_no_allergens' ELSE 'unknown' END
FROM generate_series(1, 27) n WHERE n <> 4;

INSERT INTO private.recipe_reviews(recipe_id, content_version, reviewer_kind, reviewer, verdict, open_blockers)
SELECT ('91000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, 1, 'human', 'synthetic', 'approve', 0
FROM generate_series(1, 27) n WHERE n % 2 = 0;

INSERT INTO public.recipe_collections(id, slug, title, public_summary) VALUES
  ('92000000-0000-0000-0000-000000000021', 'test-collection', 'Test Collection', 'Synthetic');
INSERT INTO public.collection_releases(id, collection_id, version, state) VALUES
  ('93000000-0000-0000-0000-000000000021', '92000000-0000-0000-0000-000000000021', 1, 'published');
DELETE FROM public.free_recipe_slots;
INSERT INTO public.collection_recipes(release_id, recipe_id, position) VALUES
  ('93000000-0000-0000-0000-000000000021', '91000000-0000-0000-0000-000000000002', 1),
  ('93000000-0000-0000-0000-000000000021', '91000000-0000-0000-0000-000000000006', 2);
INSERT INTO public.free_recipe_slots(slot, recipe_id) VALUES
  (1, '91000000-0000-0000-0000-000000000002');

-- Live offer + unresolved live attempt + captured payment on release 21.
INSERT INTO private.commercial_offers(id, release_id, provider_account_id, provider_mode, provider_product_id, provider_price_id, currency, base_minor_amount, sale_enabled)
VALUES ('94000000-0000-0000-0000-000000000021', '93000000-0000-0000-0000-000000000021', 'acct_live', 'live', 'prod_1', 'price_1', 'USD', 500, true);
INSERT INTO private.commercial_offers(id, release_id, provider_account_id, provider_mode, provider_product_id, provider_price_id, currency, base_minor_amount, sale_enabled)
VALUES ('94000000-0000-0000-0000-000000000022', '93000000-0000-0000-0000-000000000021', 'acct_test', 'test', 'prod_t', 'price_t', 'USD', 500, true);
INSERT INTO private.purchase_orders(id, support_reference, owner_principal, offer_id, release_id, attempt_state, idempotency_key)
VALUES ('95000000-0000-0000-0000-000000000021', 'SUP-21', '92000000-0000-0000-0000-000000000001',
  '94000000-0000-0000-0000-000000000021', '93000000-0000-0000-0000-000000000021', 'open', 'idem-live-open-21');
INSERT INTO private.provider_payments(order_id, provider_account_id, provider_mode, payment_intent_id, status, captured_amount, currency, paid_at)
VALUES ('95000000-0000-0000-0000-000000000021', 'acct_live', 'live', 'pi_21', 'succeeded', 500, 'USD', now());
INSERT INTO private.purchase_orders(id, support_reference, owner_principal, offer_id, release_id, attempt_state, idempotency_key)
VALUES ('95000000-0000-0000-0000-000000000022', 'SUP-22', '92000000-0000-0000-0000-000000000001',
  '94000000-0000-0000-0000-000000000022', '93000000-0000-0000-0000-000000000021', 'open', 'idem-test-open-22');

SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;

-- List: literal %, _, Unicode are literal substrings, not wildcards.
SELECT is((public.admin_recipe_list('{"q":"100% Soup","view":"all","page":1}'::jsonb)->>'filteredTotal'), '1', 'literal percent search');
SELECT is((public.admin_recipe_list('{"q":"under_score","view":"all","page":1}'::jsonb)->>'filteredTotal'), '1', 'literal underscore search');
SELECT is((public.admin_recipe_list('{"q":"Crème","view":"all","page":1}'::jsonb)->>'filteredTotal'), '1', 'unicode search');
SELECT is((public.admin_recipe_list('{"q":"91000000-0000-0000-0000-000000000001","view":"all","page":1}'::jsonb)->>'filteredTotal'), '1', 'complete UUID search');
SELECT is((public.admin_recipe_list('{"q":"admin-read-1","view":"all","page":1}'::jsonb)->'rows'->0->>'slug'), 'admin-read-1', 'slug search');

-- Pagination: 25 + remainder, deterministic order.
SELECT is((public.admin_recipe_list('{"q":"admin-read-","view":"all","page":1}'::jsonb)->'rows'->25), NULL, 'page 1 has 25 rows');
SELECT is((public.admin_recipe_list('{"q":"admin-read-","view":"all","page":1}'::jsonb)->>'filteredTotal'), '27', 'filtered total counts matches');
SELECT ok((public.admin_recipe_list('{"q":"admin-read-","view":"all","page":2}'::jsonb)->'rows'->0) IS NOT NULL, 'page 2 has remainder');

-- Filters AND across, summaries whole-catalog.
SELECT ok((public.admin_recipe_list('{"view":"published","page":1}'::jsonb)->>'filteredTotal')::int > 0, 'published view non-empty');
SELECT is(
  (public.admin_recipe_list('{"view":"all","page":1}'::jsonb)->'summary'->>'all')::int >=
  (public.admin_recipe_list('{"view":"all","page":1}'::jsonb)->>'filteredTotal')::int,
  true, 'summary covers whole catalog');
SELECT ok((public.admin_recipe_list('{"view":"attention","page":1}'::jsonb)->>'filteredTotal')::int > 0, 'attention view non-empty');

-- Invalid inputs are INVALID, never empty success.
SELECT throws_ok($$SELECT public.admin_recipe_list('{"view":"nope","page":1}'::jsonb)$$, '22023', 'ADM_INVALID', 'unknown view rejected');
SELECT throws_ok($$SELECT public.admin_recipe_list('{"view":"all","page":-1}'::jsonb)$$, '22023', 'ADM_INVALID', 'invalid page rejected');
SELECT throws_ok($$SELECT public.admin_recipe_detail('00000000-0000-0000-0000-000000000000')$$, '22023', 'ADM_INVALID', 'missing recipe rejected');

-- Detail: missing body/image, legacy provenance, usage truth.
SELECT is((public.admin_recipe_detail('91000000-0000-0000-0000-000000000004')->'active'->'body'), 'null', 'missing body is null');
SELECT is((public.admin_recipe_detail('91000000-0000-0000-0000-000000000005')->'active'->'image'->>'path'), '', 'missing image path preserved');
SELECT is((public.admin_recipe_detail('91000000-0000-0000-0000-000000000002')->'readiness'->>'review'), 'approved', 'legacy review provenance');
SELECT is((public.admin_recipe_detail('91000000-0000-0000-0000-000000000002')->'usage'->'value'->'freeSlots'->>0), '1', 'free slot joined');
SELECT ok((public.admin_recipe_detail('91000000-0000-0000-0000-000000000002')->'usage'->'value'->'releases'->0->>'liveOffer')::boolean, 'live offer flagged');
SELECT ok((public.admin_recipe_detail('91000000-0000-0000-0000-000000000002')->'usage'->'value'->'releases'->0->>'pendingLiveAttempt')::boolean, 'live attempt flagged');
SELECT ok((public.admin_recipe_detail('91000000-0000-0000-0000-000000000002')->'usage'->'value'->'releases'->0->>'historicalLivePayment')::boolean, 'captured payment flagged');
SELECT ok((public.admin_recipe_detail('91000000-0000-0000-0000-000000000002')->'usage'->'value'->'releases'->0->>'testActivity')::boolean, 'test activity separate');

-- History: empty initially, cursor-bounded.
SELECT is(jsonb_array_length(public.admin_recipe_history('91000000-0000-0000-0000-000000000002', NULL, 25)->'events'), 0, 'no audit yet');
RESET ROLE;

-- Denied paths: aal1, non-member, anon.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal1');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_recipe_list('{"view":"all","page":1}'::jsonb)$$, '42501', 'ADM_MFA_REQUIRED', 'aal1 list denied');
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000006', 'aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_recipe_list('{"view":"all","page":1}'::jsonb)$$, '42501', 'ADM_DENIED', 'non-member denied');
RESET ROLE;
SELECT ok(NOT has_function_privilege('anon', 'public.admin_recipe_list(jsonb)', 'EXECUTE'), 'anon list denied');

SELECT * FROM finish();
ROLLBACK;
