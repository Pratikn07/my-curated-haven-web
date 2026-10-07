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

-- Draft operations (Task 7): synthetic approved head and command builders run as
-- postgres; the operation calls below run as the claimed admin session.
CREATE OR REPLACE FUNCTION pg_temp.ensure_approved_head() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE did uuid; rid uuid; snap jsonb; dgst text; ahash text; ver int;
BEGIN
  SELECT id INTO did FROM private.recipe_drafts
    WHERE recipe_id = '91000000-0000-0000-0000-000000000031' AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  IF did IS NOT NULL THEN RETURN did; END IF;
  snap := private.admin_snapshot('91000000-0000-0000-0000-000000000031');
  dgst := private.admin_snapshot_digest(snap);
  ahash := private.admin_active_hash('91000000-0000-0000-0000-000000000031');
  SELECT content_version INTO ver FROM public.recipe_bodies WHERE recipe_id = '91000000-0000-0000-0000-000000000031';
  INSERT INTO private.recipe_drafts(recipe_id, workflow_schema, lifecycle, base_content_version,
    base_active_hash, working_version, created_by, updated_by)
  VALUES ('91000000-0000-0000-0000-000000000031', 1, 'approved', ver, ahash, 1,
    '92000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001')
  RETURNING id INTO did;
  INSERT INTO private.recipe_revisions(draft_id, recipe_id, version, snapshot, digest,
    base_content_version, base_active_hash, actor_id)
  VALUES (did, '91000000-0000-0000-0000-000000000031', 1, snap, dgst, ver, ahash,
    '92000000-0000-0000-0000-000000000001')
  RETURNING id INTO rid;
  UPDATE private.recipe_drafts SET current_revision_id = rid WHERE id = did;
  RETURN did;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.approved_head_id() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE did uuid;
BEGIN
  SELECT id INTO did FROM private.recipe_drafts
    WHERE recipe_id = '91000000-0000-0000-0000-000000000031' AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  IF did IS NULL THEN RAISE EXCEPTION 'approved head missing; call ensure first'; END IF;
  RETURN did;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.revision_count() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c int;
BEGIN
  SELECT count(*)::int INTO c FROM private.recipe_revisions WHERE draft_id = pg_temp.approved_head_id();
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.before_revision_count() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c int;
BEGIN
  SELECT count(*)::int INTO c FROM private.recipe_revisions WHERE draft_id = pg_temp.approved_head_id();
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.head_snapshot() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE head private.recipe_drafts;
BEGIN
  SELECT * INTO head FROM private.recipe_drafts WHERE id = pg_temp.approved_head_id();
  RETURN jsonb_build_object(
    'working_version', head.working_version,
    'digest', (private.admin_revision_json(head.current_revision_id)->>'digest'),
    'snapshot', private.admin_revision_json(head.current_revision_id)->'snapshot',
    'base_content_version', head.base_content_version,
    'base_active_hash', head.base_active_hash);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.head_lifecycle() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s text;
BEGIN
  SELECT lifecycle INTO s FROM private.recipe_drafts WHERE id = pg_temp.approved_head_id();
  RETURN s;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.head_current_revision() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r uuid;
BEGIN
  SELECT current_revision_id INTO r FROM private.recipe_drafts WHERE id = pg_temp.approved_head_id();
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.head_command(p_recipe uuid, p_title text, p_op uuid,
  p_reopen boolean DEFAULT false, p_version int DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE head private.recipe_drafts; cur jsonb; snap jsonb;
BEGIN
  SELECT * INTO head FROM private.recipe_drafts
    WHERE recipe_id = p_recipe AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  IF head.id IS NULL THEN RAISE EXCEPTION 'no head for %', p_recipe; END IF;
  cur := private.admin_revision_json(head.current_revision_id);
  snap := (cur->'snapshot') || jsonb_build_object('catalog',
    ((cur->'snapshot'->'catalog') || jsonb_build_object('title', p_title)));
  RETURN jsonb_build_object('operation_id', p_op, 'recipe_id', p_recipe, 'reason', 'synthetic test',
    'expected_version', coalesce(p_version, head.working_version),
    'expected_digest', cur->>'digest',
    'base', jsonb_build_object('content_version', head.base_content_version, 'active_hash', head.base_active_hash),
    'snapshot', snap, 'reopen_reviewed', p_reopen);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.no_change_command(p_op uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE head private.recipe_drafts; cur jsonb;
BEGIN
  SELECT * INTO head FROM private.recipe_drafts WHERE id = pg_temp.approved_head_id();
  cur := private.admin_revision_json(head.current_revision_id);
  RETURN jsonb_build_object('operation_id', p_op,
    'recipe_id', '91000000-0000-0000-0000-000000000031', 'reason', 'synthetic test',
    'expected_version', head.working_version, 'expected_digest', cur->>'digest',
    'base', jsonb_build_object('content_version', head.base_content_version, 'active_hash', head.base_active_hash),
    'snapshot', cur->'snapshot', 'reopen_reviewed', false);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.forbidden_command(p_op uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE cmd jsonb;
BEGIN
  cmd := pg_temp.no_change_command(p_op);
  RETURN jsonb_set(cmd, '{snapshot,control}', '{"forged": true}'::jsonb);
END $$;

SELECT pg_temp.ensure_approved_head();
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;

-- Start racing creates one head; starting an existing head returns it.
SELECT is(
  (public.admin_draft_start('91000000-0000-0000-0000-000000000032', gen_random_uuid())->>'draftId'),
  (public.admin_draft_start('91000000-0000-0000-0000-000000000032', gen_random_uuid())->>'draftId'),
  'two starts share one head');
SELECT is(
  (public.admin_draft_start('91000000-0000-0000-0000-000000000032', gen_random_uuid())->>'id'),
  (public.admin_draft_start('91000000-0000-0000-0000-000000000032', gen_random_uuid())->>'id'),
  'repeat start alters no revision');

-- Incomplete safe draft (null body) can save.
SELECT lives_ok($q$SELECT public.admin_draft_save(
  pg_temp.head_command('91000000-0000-0000-0000-000000000032', 'Null body edit', gen_random_uuid()))$q$,
  'null-body save succeeds');

-- Forbidden control keys and identity mismatch are rejected.
SELECT throws_ok($q$SELECT public.admin_draft_save(pg_temp.forbidden_command(gen_random_uuid()))$q$,
  '22023', 'ADM_INVALID', 'control keys rejected');
SELECT throws_ok($q$SELECT public.admin_draft_save(
  jsonb_set(pg_temp.no_change_command(gen_random_uuid()), '{snapshot,recipeId}',
    '"91000000-0000-0000-0000-000000000032"'))$q$,
  '22023', 'ADM_INVALID', 'target identity enforced');

-- Stale version conflicts without changing content.
SELECT is(
  pg_temp.revision_count(),
  pg_temp.before_revision_count()::int, 'pre-conflict baseline');
SELECT throws_ok($q$SELECT public.admin_draft_save(
  pg_temp.head_command('91000000-0000-0000-0000-000000000031', 'Stale edit', gen_random_uuid(), false, 0))$q$,
  '40001', 'ADM_CONFLICT', 'stale version conflicts');
SELECT is(pg_temp.revision_count(),
  pg_temp.before_revision_count()::int, 'conflict adds no snapshot');

-- Same operation and payload replays one outcome; same ID with a different
-- payload is rejected.
CREATE TEMP TABLE replay_cmd AS SELECT pg_temp.head_command(
  '91000000-0000-0000-0000-000000000032', 'Replay title', '93000000-0000-0000-0000-000000000101') AS cmd;
SELECT is(
  (public.admin_draft_save((SELECT cmd FROM replay_cmd))->>'version')::int,
  (public.admin_draft_save((SELECT cmd FROM replay_cmd))->>'version')::int,
  'identical retry returns one outcome');
SELECT throws_ok($q$SELECT public.admin_draft_save(
  pg_temp.head_command('91000000-0000-0000-0000-000000000032', 'Other title', '93000000-0000-0000-0000-000000000101'))$q$,
  '22023', 'ADM_INVALID', 'different retry payload rejected');

-- No-change save on approved content preserves version, count and lifecycle.
SELECT is(
  (public.admin_draft_save(pg_temp.no_change_command('93000000-0000-0000-0000-000000000102'))->>'noChange')::boolean,
  true, 'no-change receipt flagged');
SELECT is(pg_temp.revision_count(),
  pg_temp.before_revision_count()::int, 'no-change adds no snapshot');
SELECT is(pg_temp.head_lifecycle(), 'approved', 'no-change preserves review eligibility');

-- Changing approved content without acknowledgement is blocked; with it, the
-- head reopens as a draft.
SELECT throws_ok($q$SELECT public.admin_draft_save(
  pg_temp.head_command('91000000-0000-0000-0000-000000000031', 'Silent change', gen_random_uuid()))$q$,
  '42501', 'ADM_BLOCKED', 'approved change needs reopen');
SELECT lives_ok($q$SELECT public.admin_draft_save(
  pg_temp.head_command('91000000-0000-0000-0000-000000000031', 'Reopened change', gen_random_uuid(), true))$q$,
  'reopened save succeeds');
SELECT is(pg_temp.head_lifecycle(), 'draft', 'reopen resets lifecycle');

-- Revision reads check their recipe target.
SELECT ok(
  (public.admin_recipe_revision('91000000-0000-0000-0000-000000000031',
    pg_temp.head_current_revision())->>'recipeId')
  = '91000000-0000-0000-0000-000000000031', 'revision read matches target');
SELECT throws_ok($q$SELECT public.admin_recipe_revision('91000000-0000-0000-0000-000000000032',
  pg_temp.head_current_revision())$q$,
  '22023', 'ADM_INVALID', 'revision target enforced');

-- A revoked editor cannot retrieve a prior receipt or write again.
SELECT lives_ok($q$SELECT public.admin_staff_assign('92000000-0000-0000-0000-000000000006',
  ARRAY['editor'], 'synthetic editor', '93000000-0000-0000-0000-000000000103')$q$, 'editor assigned');
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000006', 'aal2');
SET LOCAL ROLE authenticated;
SELECT lives_ok($q$SELECT public.admin_draft_start('91000000-0000-0000-0000-000000000032',
  '93000000-0000-0000-0000-000000000104')$q$, 'editor starts draft');
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT lives_ok($q$SELECT public.admin_staff_revoke('92000000-0000-0000-0000-000000000006',
  'synthetic revoke', gen_random_uuid())$q$, 'editor revoked');
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000006', 'aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($q$SELECT public.admin_draft_start('91000000-0000-0000-0000-000000000032',
  '93000000-0000-0000-0000-000000000104')$q$,
  '42501', 'ADM_DENIED', 'revoked replay denied');
RESET ROLE;

-- Out-of-band active change conflicts despite an unchanged body version.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
RESET ROLE;
UPDATE public.recipe_catalog SET title = 'Out of band' WHERE id = '91000000-0000-0000-0000-000000000032';
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($q$SELECT public.admin_draft_save(
  pg_temp.head_command('91000000-0000-0000-0000-000000000032', 'After band change', gen_random_uuid()))$q$,
  '40001', 'ADM_CONFLICT', 'out-of-band change conflicts');
RESET ROLE;

SELECT ok(NOT has_table_privilege('authenticated','private.recipe_revisions','INSERT'), 'no direct revision writes');

SELECT * FROM finish();
ROLLBACK;
