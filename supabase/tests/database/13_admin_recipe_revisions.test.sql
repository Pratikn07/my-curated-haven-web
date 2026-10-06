BEGIN;
SELECT no_plan();
\ir ../../test-fixtures/admin-console.sql

-- One recipe with two legacy drafts (one malformed), one recipe without a body.
INSERT INTO public.recipe_catalog(id, slug, title, public_summary, preview_image_path, preview_image_alt, preview_image_description)
VALUES
  ('91000000-0000-0000-0000-000000000031', 'admin-rev-legacy', 'Legacy Title', 'Synthetic', 'recipe-previews/fixture.webp', 'Legacy alt', 'Legacy description'),
  ('91000000-0000-0000-0000-000000000032', 'admin-rev-nobody', 'No Body', 'Synthetic', 'recipe-previews/fixture.webp', NULL, NULL);
INSERT INTO public.recipe_bodies(recipe_id, ingredients, instructions, yield, allergen_review_state)
VALUES ('91000000-0000-0000-0000-000000000031',
  '[{"item":"Oats","preparation":{"soak":true}}]',
  '[{"step":1,"text":"Cook","legacyHint":"gentle"}]',
  '2 portions', 'reviewed_listed');
INSERT INTO private.recipe_drafts(id, recipe_id, proposed_content, reviewer_status)
VALUES
  ('92000000-0000-0000-0000-000000000031', '91000000-0000-0000-0000-000000000031', '{"title":"legacy proposal"}', 'draft'),
  ('92000000-0000-0000-0000-000000000032', '91000000-0000-0000-0000-000000000031', '"not-an-object{{{Ful"', 'draft');

-- Revisions table is append-only: inserts work, updates do not.
SELECT lives_ok(
  $$INSERT INTO private.recipe_revisions(draft_id,recipe_id,version,snapshot,digest,base_active_hash,actor_id) VALUES('92000000-0000-0000-0000-000000000031','91000000-0000-0000-0000-000000000031',1,'{}','x','y','92000000-0000-0000-0000-000000000001')$$,
  'revision insert allowed');
SELECT throws_ok(
  $$UPDATE private.recipe_revisions SET digest='z' WHERE draft_id='92000000-0000-0000-0000-000000000031'$$,
  '42501', 'ADM_IMMUTABLE', 'revisions reject rewrite');

-- Legacy drafts survive with NULL workflow schema; no console review inferred.
SELECT is((SELECT count(*)::int FROM private.recipe_drafts WHERE recipe_id='91000000-0000-0000-0000-000000000031' AND workflow_schema IS NULL), 2, 'legacy drafts preserved');
SELECT is((SELECT proposed_content FROM private.recipe_drafts WHERE id='92000000-0000-0000-0000-000000000032')::text, '"not-an-object{{{Ful"', 'malformed legacy untouched');

-- Snapshot preserves unknown structured properties and image metadata.
SELECT is((private.admin_snapshot('91000000-0000-0000-0000-000000000031')->'body'->'ingredients'->0->'preparation'->>'soak'), 'true', 'unknown ingredient props preserved');
SELECT is((private.admin_snapshot('91000000-0000-0000-0000-000000000031')->'image'->>'alt'), 'Legacy alt', 'image alt persists');
SELECT is((private.admin_snapshot('91000000-0000-0000-0000-000000000031')->'image'->>'description'), 'Legacy description', 'image description persists');
SELECT is((private.admin_snapshot('91000000-0000-0000-0000-000000000032')->'body'), 'null', 'absent body is null');

-- Digest binds content: title change alters it, key reorder does not (JSONB).
SELECT ok(
  private.admin_snapshot_digest(private.admin_snapshot('91000000-0000-0000-0000-000000000031'))
  <> private.admin_snapshot_digest(
    (private.admin_snapshot('91000000-0000-0000-0000-000000000031') || '{"catalog":{"title":"Changed"}}'::jsonb)),
  'title change binds digest');
SELECT is(
  private.admin_snapshot_digest('{"a":1,"b":2}'::jsonb),
  private.admin_snapshot_digest('{"b":2,"a":1}'::jsonb),
  'key order does not affect digest');

-- Active hash is sha256 hex over publication state, version and snapshot.
SELECT ok(
  private.admin_active_hash('91000000-0000-0000-0000-000000000031') IS NOT NULL
  AND length(private.admin_active_hash('91000000-0000-0000-0000-000000000031')) = 64,
  'active hash is sha256 hex');

SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;

-- Persisted image metadata flows through the permissioned detail read.
SELECT is(
  (public.admin_recipe_detail('91000000-0000-0000-0000-000000000031')->'active'->'image'->>'alt'),
  'Legacy alt', 'detail carries persisted alt');

-- Revisions table is append-only even for privileged writers.
RESET ROLE;
SELECT ok(NOT has_table_privilege('authenticated','private.recipe_revisions','INSERT'), 'no direct revision writes');

SELECT * FROM finish();
ROLLBACK;
