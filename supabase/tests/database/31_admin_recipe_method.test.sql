BEGIN;
SELECT no_plan();
\ir ../../test-fixtures/admin-console.sql

-- The method layout's content (recipe_bodies.method) travels through the admin snapshot, publication and
-- correction. method-1 starts with a method; method-2 has none.
CREATE FUNCTION pg_temp.rid(p_n int) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT ('98000000-0000-0000-0000-'||lpad(p_n::text,12,'0'))::uuid
$$;
INSERT INTO public.recipe_catalog(id, slug, title, public_summary, preview_image_path)
SELECT pg_temp.rid(n), 'method-'||n, 'Method fixture '||n, 'Synthetic', 'recipe-previews/method-'||n||'.webp'
FROM generate_series(1,2) n;
INSERT INTO public.recipe_bodies(recipe_id, ingredients, instructions, yield, allergen_review_state, allergens, method)
SELECT pg_temp.rid(n), '[{"item":"Oats"}]', '[{"step":1,"text":"Cook"},{"step":2,"text":"Serve"}]', '2 servings',
  'reviewed_listed', '{oats}', CASE WHEN n = 1 THEN '{"shortName":"M1"}'::jsonb END
FROM generate_series(1,2) n;
INSERT INTO storage.objects(id, bucket_id, name, version, metadata)
SELECT gen_random_uuid(), 'recipe-previews', 'method-'||n||'.webp', 'v1', '{}' FROM generate_series(1,2) n;
INSERT INTO private.admin_campaign_snapshots(deployment_revision, configuration, configuration_hash)
VALUES ('method-rev', '{"campaigns":[]}', 'm');
UPDATE private.admin_console_settings SET campaign_revision = 'method-rev' WHERE singleton;

-- Start a draft from the live recipe, set (or remove, with NULL) body.method, submit, approve and check the image.
-- Returns the body the draft started from.
CREATE FUNCTION pg_temp.approve_method(p_n int, p_method jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE rid uuid := pg_temp.rid(p_n); head private.recipe_drafts; cur jsonb; started jsonb; snap jsonb; obj uuid;
BEGIN
  PERFORM public.admin_draft_start(rid, gen_random_uuid());
  SELECT * INTO head FROM private.recipe_drafts WHERE recipe_id = rid AND workflow_schema = 1
    AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  cur := private.admin_revision_json(head.current_revision_id);
  started := cur->'snapshot'->'body';
  snap := CASE WHEN p_method IS NULL THEN (cur->'snapshot') #- '{body,method}'
    ELSE jsonb_set(cur->'snapshot', '{body,method}', p_method) END;
  PERFORM public.admin_draft_save(jsonb_build_object('operation_id', gen_random_uuid(), 'recipe_id', rid,
    'reason', 'synthetic method change', 'expected_version', head.working_version, 'expected_digest', cur->>'digest',
    'base', jsonb_build_object('content_version', head.base_content_version, 'active_hash', head.base_active_hash),
    'snapshot', snap, 'reopen_reviewed', true));
  SELECT * INTO head FROM private.recipe_drafts WHERE id = head.id;
  cur := private.admin_revision_json(head.current_revision_id);
  PERFORM public.admin_revision_submit(jsonb_build_object('operation_id', gen_random_uuid(), 'recipe_id', rid,
    'reason', 'synthetic submit', 'revision_id', head.current_revision_id, 'expected_version', head.working_version,
    'expected_digest', cur->>'digest'));
  PERFORM public.admin_revision_review(jsonb_build_object('operation_id', gen_random_uuid(), 'recipe_id', rid,
    'reason', 'synthetic approve', 'revision_id', head.current_revision_id, 'expected_version', head.working_version,
    'expected_digest', cur->>'digest',
    'submission_id', (SELECT current_submission_id FROM private.recipe_drafts WHERE id = head.id),
    'decision', 'approve', 'resolved_issue_ids', '[]'::jsonb));
  SELECT o.id INTO obj FROM storage.objects o WHERE o.bucket_id = 'recipe-previews' AND o.name = 'method-'||p_n||'.webp';
  PERFORM private.admin_record_asset_check(head.current_revision_id, cur->>'digest', 'recipe-previews',
    'method-'||p_n||'.webp', obj, 'v1', true, now());
  RETURN started;
END $$;

-- A publish command for the recipe's current head, optionally as a same-recipe correction.
CREATE FUNCTION pg_temp.method_cmd(p_n int, p_correction boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE rid uuid := pg_temp.rid(p_n); head private.recipe_drafts; cur jsonb;
BEGIN
  SELECT * INTO head FROM private.recipe_drafts WHERE recipe_id = rid AND workflow_schema = 1
    AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected','published')
    ORDER BY CASE WHEN lifecycle = 'published' THEN 1 ELSE 0 END LIMIT 1;
  cur := private.admin_revision_json(head.current_revision_id);
  RETURN jsonb_build_object('operation_id', gen_random_uuid(), 'recipe_id', rid, 'reason', 'synthetic method publish',
    'revision_id', head.current_revision_id, 'expected_version', head.working_version, 'expected_digest', cur->>'digest',
    'base', jsonb_build_object('content_version', head.base_content_version, 'active_hash', head.base_active_hash),
    'impact_token', public.admin_recipe_impact(rid)->>'impactToken')
    || CASE WHEN p_correction THEN '{"correction_kind":"same_recipe","acknowledge_global_impact":true}'::jsonb
       ELSE '{}'::jsonb END;
END $$;

CREATE FUNCTION pg_temp.method_of(p_n int) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT method FROM public.recipe_bodies WHERE recipe_id = pg_temp.rid(p_n)
$$;

-- The column holds an object or nothing.
SELECT throws_ok($$UPDATE public.recipe_bodies SET method = '"steps"' WHERE recipe_id = pg_temp.rid(2)$$, '23514', NULL,
  'method must be a JSON object');
SELECT throws_ok($$UPDATE public.recipe_bodies SET method = '[]' WHERE recipe_id = pg_temp.rid(2)$$, '23514', NULL,
  'a JSON array is refused too');

-- Snapshots: a body without a method keeps exactly the keys it had, so its active hash and open drafts stay current.
SELECT is((SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(private.admin_snapshot(pg_temp.rid(2))->'body') k),
  ARRAY['allergenReviewState','allergens','ingredients','instructions','reviewedNotes','storageNotes','yield','yieldStructured'],
  'a body without a method snapshots the same keys as before');
SELECT is(private.admin_snapshot(pg_temp.rid(1))->'body'->'method', '{"shortName":"M1"}'::jsonb,
  'a body with a method carries it in the snapshot');
SELECT lives_ok($$SELECT private.admin_validate_snapshot(private.admin_snapshot(pg_temp.rid(1)))$$,
  'the validator accepts body.method');
SELECT throws_ok($$SELECT private.admin_validate_snapshot(jsonb_set(private.admin_snapshot(pg_temp.rid(1)), '{body,method}', '"x"'))$$,
  '22023', 'ADM_INVALID', 'the validator refuses a method that is not an object');

SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;

-- First publication: method-1's draft starts from the live method, changes it, and publication writes the change.
SELECT is(pg_temp.approve_method(1, '{"shortName":"M2"}')->'method', '{"shortName":"M1"}'::jsonb,
  'a new draft starts with the live method');
SELECT is(public.admin_revision_publish(pg_temp.method_cmd(1, false))->>'publication', 'published', 'method-1 publishes');
SELECT is(pg_temp.method_of(1), '{"shortName":"M2"}'::jsonb, 'publication writes the approved method');

-- A draft can add a method to a body that had none.
SELECT pg_temp.approve_method(2, '{"shortName":"M3"}');
SELECT lives_ok($$SELECT public.admin_revision_publish(pg_temp.method_cmd(2, false))$$, 'method-2 publishes');
SELECT is(pg_temp.method_of(2), '{"shortName":"M3"}'::jsonb, 'publication adds a method');

-- Correction of a published recipe carries the method too, and the archive keeps the previous one.
SELECT pg_temp.approve_method(1, '{"shortName":"M4"}');
SELECT lives_ok($$SELECT public.admin_recipe_correct(pg_temp.method_cmd(1, true))$$, 'the correction is accepted');
SELECT is(pg_temp.method_of(1), '{"shortName":"M4"}'::jsonb, 'a correction writes the approved method');
RESET ROLE;
SELECT is((SELECT body->'method' FROM private.recipe_active_archives WHERE recipe_id = pg_temp.rid(1) AND kind = 'correction'),
  '{"shortName":"M2"}'::jsonb, 'the correction archive keeps the previous method');
SELECT is((SELECT snapshot->'body'->'method' FROM private.recipe_active_archives WHERE recipe_id = pg_temp.rid(1) AND kind = 'correction'),
  '{"shortName":"M2"}'::jsonb, 'the archived snapshot keeps it as well');

-- Removing the method from a draft brings back the classic layout when it is published.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT pg_temp.approve_method(2, NULL);
SELECT lives_ok($$SELECT public.admin_recipe_correct(pg_temp.method_cmd(2, true))$$, 'a correction without a method is accepted');
SELECT is(pg_temp.method_of(2), NULL::jsonb, 'a draft without a method clears it');
RESET ROLE;

-- The method lives on the body, so the "Read authorized recipe bodies" policy keeps it from anyone not entitled.
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id = pg_temp.rid(1)), 0,
  'a visitor cannot read the method of a recipe that is neither free nor bought');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
