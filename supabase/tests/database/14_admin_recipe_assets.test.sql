BEGIN;
SELECT no_plan();
\ir ../../test-fixtures/admin-console.sql

-- Catalog-referenced images: one backed by a real storage object, one dangling.
INSERT INTO public.recipe_catalog(id, slug, title, public_summary, preview_image_path)
VALUES
  ('91000000-0000-0000-0000-000000000041', 'admin-asset-live', 'Live Image', 'Synthetic', 'recipe-previews/synth-asset-live.webp'),
  ('91000000-0000-0000-0000-000000000042', 'admin-asset-gone', 'Gone Image', 'Synthetic', 'recipe-previews/synth-asset-gone.webp');
INSERT INTO public.recipe_bodies(recipe_id, ingredients, instructions, yield, allergen_review_state)
SELECT id, '[]', '[]', '1 serving', 'reviewed_no_allergens'
FROM public.recipe_catalog WHERE slug LIKE 'admin-asset-%';
INSERT INTO storage.objects(id, bucket_id, name, version, metadata)
VALUES (gen_random_uuid(), 'recipe-previews', 'synth-asset-live.webp', 'v1', '{}');

SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;

-- Listing exposes only catalog references with live identity, never a bucket dump.
SELECT is(
  (SELECT count(*)::int FROM jsonb_array_elements(public.admin_recipe_assets())
   WHERE value->>'path' LIKE 'recipe-previews/synth-asset-%'), 2, 'both references listed');
SELECT is(
  (SELECT (value->>'available')::boolean FROM jsonb_array_elements(public.admin_recipe_assets()) AS e(value)
   WHERE value->>'path' = 'recipe-previews/synth-asset-live.webp'), true, 'live object available');
SELECT is(
  (SELECT (value->>'available')::boolean FROM jsonb_array_elements(public.admin_recipe_assets()) AS e(value)
   WHERE value->>'path' = 'recipe-previews/synth-asset-gone.webp'), false, 'missing object unavailable');
SELECT is(
  (SELECT count(*)::int FROM jsonb_array_elements(public.admin_recipe_assets())
   WHERE value->>'bucket' <> 'recipe-previews'), 0, 'single trusted bucket');
RESET ROLE;

-- Anonymous callers cannot enumerate assets.
SELECT ok(NOT has_function_privilege('anon', 'public.admin_recipe_assets()', 'EXECUTE'), 'anon assets denied');

-- aal1 cannot list assets.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal1');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_recipe_assets()$$, '42501', 'ADM_MFA_REQUIRED', 'aal1 assets denied');
RESET ROLE;

-- Availability evidence follows the working revision: fresh match passes,
-- stale or mismatched evidence is unknown, fresh negative evidence fails.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE asset_rev AS
  SELECT public.admin_draft_start('91000000-0000-0000-0000-000000000041', gen_random_uuid()) AS rev;
RESET ROLE;
SELECT private.admin_record_asset_check(
  (SELECT (rev->>'id')::uuid FROM asset_rev),
  (SELECT rev->>'digest' FROM asset_rev),
  (SELECT id FROM storage.objects WHERE bucket_id = 'recipe-previews' AND name = 'synth-asset-live.webp'),
  'v1', true, now());
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT value->>'state' FROM jsonb_array_elements(
     public.admin_recipe_detail('91000000-0000-0000-0000-000000000041')->'readiness'->'checks') AS e(value)
   WHERE value->>'code' = 'image-availability'), 'pass', 'fresh matching check passes');
RESET ROLE;
UPDATE private.recipe_asset_checks SET checked_at = now() - interval '61 seconds';
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT value->>'state' FROM jsonb_array_elements(
     public.admin_recipe_detail('91000000-0000-0000-0000-000000000041')->'readiness'->'checks') AS e(value)
   WHERE value->>'code' = 'image-availability'), 'unknown', 'stale evidence is unknown');
RESET ROLE;
DELETE FROM private.recipe_asset_checks WHERE revision_id = (SELECT (rev->>'id')::uuid FROM asset_rev);
SELECT private.admin_record_asset_check(
  (SELECT (rev->>'id')::uuid FROM asset_rev),
  'deadbeef', NULL, NULL, false, now());
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT value->>'state' FROM jsonb_array_elements(
     public.admin_recipe_detail('91000000-0000-0000-0000-000000000041')->'readiness'->'checks') AS e(value)
   WHERE value->>'code' = 'image-availability'), 'unknown', 'mismatched digest is unknown');
RESET ROLE;
DELETE FROM private.recipe_asset_checks WHERE revision_id = (SELECT (rev->>'id')::uuid FROM asset_rev);
SELECT private.admin_record_asset_check(
  (SELECT (rev->>'id')::uuid FROM asset_rev),
  (SELECT rev->>'digest' FROM asset_rev),
  NULL, NULL, false, now());
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT value->>'state' FROM jsonb_array_elements(
     public.admin_recipe_detail('91000000-0000-0000-0000-000000000041')->'readiness'->'checks') AS e(value)
   WHERE value->>'code' = 'image-availability'), 'fail', 'fresh negative evidence fails');
RESET ROLE;

SELECT ok(NOT has_function_privilege('authenticated', 'private.admin_record_asset_check(uuid,text,uuid,text,boolean,timestamptz)', 'EXECUTE'), 'no direct check writes');

SELECT * FROM finish();
ROLLBACK;
