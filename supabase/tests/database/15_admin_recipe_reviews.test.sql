BEGIN;
SELECT no_plan();
\ir ../../test-fixtures/admin-console.sql

-- Recipes: valid, bodyless, bad steps, unknown label, legacy-only.
INSERT INTO public.recipe_catalog(id, slug, title, public_summary, preview_image_path)
SELECT ('91000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'admin-review-' || n, 'Review Fixture ' || n, 'Synthetic', 'recipe-previews/fixture.webp'
FROM generate_series(51, 55) n;
INSERT INTO public.recipe_bodies(recipe_id, ingredients, instructions, yield, allergen_review_state, allergens)
VALUES
  ('91000000-0000-0000-0000-000000000051', '[{"item":"Oats"}]',
    '[{"step":1,"text":"Cook"},{"step":2,"text":"Serve"}]', '2 servings', 'reviewed_listed', '{oats}'),
  ('91000000-0000-0000-0000-000000000053', '[{"item":"Oats"}]',
    '[{"step":1,"text":"Cook"},{"step":1,"text":"Again"}]', '2 servings', 'reviewed_listed', '{oats}'),
  ('91000000-0000-0000-0000-000000000055', '[{"item":"Oats"}]',
    '[{"step":1,"text":"Cook"}]', '1 serving', 'unknown', NULL);
UPDATE public.recipe_catalog SET meal_labels = '{Brunch}'
  WHERE id = '91000000-0000-0000-0000-000000000054';
INSERT INTO public.recipe_bodies(recipe_id, ingredients, instructions, yield, allergen_review_state)
VALUES ('91000000-0000-0000-0000-000000000054', '[{"item":"Oats"}]',
  '[{"step":1,"text":"Cook"}]', '1 serving', 'reviewed_listed');
-- Legacy verdict for the untouched recipe; console review must stay unreviewed.
INSERT INTO private.recipe_reviews(recipe_id, content_version, reviewer_kind, reviewer, verdict, open_blockers)
VALUES ('91000000-0000-0000-0000-000000000055', 1, 'ai', 'synthetic', 'approve_with_changes', 0);

CREATE OR REPLACE FUNCTION pg_temp.review_head(p_recipe uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE head private.recipe_drafts; cur jsonb;
BEGIN
  SELECT * INTO head FROM private.recipe_drafts
    WHERE recipe_id = p_recipe AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  IF head.id IS NULL THEN RAISE EXCEPTION 'no head'; END IF;
  cur := private.admin_revision_json(head.current_revision_id);
  RETURN jsonb_build_object('draft_id', head.id, 'revision_id', head.current_revision_id,
    'version', head.working_version, 'digest', cur->>'digest', 'lifecycle', head.lifecycle,
    'submission_id', head.current_submission_id);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.submit_cmd(p_recipe uuid, p_op uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE h jsonb;
BEGIN
  h := pg_temp.review_head(p_recipe);
  RETURN jsonb_build_object('operation_id', p_op, 'recipe_id', p_recipe, 'reason', 'synthetic submit',
    'revision_id', h->>'revision_id', 'expected_version', (h->>'version')::int,
    'expected_digest', h->>'digest');
END $$;

CREATE OR REPLACE FUNCTION pg_temp.approve_cmd(p_recipe uuid, p_op uuid, p_resolved uuid[] DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE h jsonb;
BEGIN
  h := pg_temp.review_head(p_recipe);
  RETURN jsonb_build_object('operation_id', p_op, 'recipe_id', p_recipe, 'reason', 'synthetic review',
    'revision_id', h->>'revision_id', 'expected_version', (h->>'version')::int,
    'expected_digest', h->>'digest', 'submission_id', h->>'submission_id',
    'decision', 'approve',
    'resolved_issue_ids', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM unnest(p_resolved) x));
END $$;

CREATE OR REPLACE FUNCTION pg_temp.exact_command(p_recipe uuid, p_op uuid, p_reopen boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE h jsonb;
BEGIN
  h := pg_temp.review_head(p_recipe);
  RETURN jsonb_build_object('operation_id', p_op, 'recipe_id', p_recipe, 'reason', 'synthetic test',
    'expected_version', (h->>'version')::int, 'expected_digest', h->>'digest',
    'base', (SELECT jsonb_build_object('content_version', base_content_version, 'active_hash', base_active_hash)
             FROM private.recipe_drafts
             WHERE recipe_id = p_recipe AND workflow_schema = 1
               AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected')),
    'snapshot', (SELECT snapshot FROM private.recipe_revisions
                 WHERE id = (h->>'revision_id')::uuid),
    'reopen_reviewed', p_reopen);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.review_lifecycle(p_recipe uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s text;
BEGIN
  SELECT lifecycle INTO s FROM private.recipe_drafts
    WHERE recipe_id = p_recipe AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  RETURN s;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.open_blocker_ids(p_recipe uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE head private.recipe_drafts; cur jsonb;
BEGIN
  SELECT * INTO head FROM private.recipe_drafts
    WHERE recipe_id = p_recipe AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  cur := private.admin_revision_json(head.current_revision_id);
  RETURN (SELECT coalesce(jsonb_agg(i.id), '[]'::jsonb) FROM private.recipe_revision_issues i
    WHERE i.revision_id = head.current_revision_id AND i.severity = 'blocker'
      AND NOT EXISTS (SELECT 1 FROM private.recipe_issue_resolutions r WHERE r.issue_id = i.id));
END $$;

CREATE OR REPLACE FUNCTION pg_temp.review_submission(p_recipe uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s uuid;
BEGIN
  SELECT current_submission_id INTO s FROM private.recipe_drafts
    WHERE recipe_id = p_recipe AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  RETURN s;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.stale_review_command() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE h jsonb;
BEGIN
  h := pg_temp.review_head('91000000-0000-0000-0000-000000000051');
  RETURN jsonb_build_object('operation_id', gen_random_uuid(),
    'recipe_id', '91000000-0000-0000-0000-000000000051', 'reason', 'stale',
    'revision_id', h->>'revision_id', 'expected_version', ((h->>'version')::int - 1),
    'expected_digest', 'deadbeef', 'submission_id', h->>'submission_id',
    'decision', 'approve', 'resolved_issue_ids', '[]'::jsonb);
END $$;

SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;

-- Owner grants reviewer and editor memberships.
SELECT lives_ok($q$SELECT public.admin_staff_assign('92000000-0000-0000-0000-000000000004',
  ARRAY['reviewer'], 'synthetic reviewer', '93000000-0000-0000-0000-000000000111')$q$, 'reviewer assigned');
SELECT lives_ok($q$SELECT public.admin_staff_assign('92000000-0000-0000-0000-000000000003',
  ARRAY['editor'], 'synthetic editor', '93000000-0000-0000-0000-000000000112')$q$, 'editor assigned');

-- Incomplete and invalid snapshots cannot submit.
SELECT lives_ok($q$SELECT public.admin_draft_start('91000000-0000-0000-0000-000000000052',
  '93000000-0000-0000-0000-000000000113')$q$, 'bodyless draft starts');
SELECT throws_ok($q$SELECT public.admin_revision_submit(pg_temp.submit_cmd(
  '91000000-0000-0000-0000-000000000052', '93000000-0000-0000-0000-000000000114'))$q$,
  '22023', 'ADM_INVALID', 'bodyless cannot submit');
SELECT lives_ok($q$SELECT public.admin_draft_start('91000000-0000-0000-0000-000000000053',
  '93000000-0000-0000-0000-000000000115')$q$, 'bad-step draft starts');
SELECT throws_ok($q$SELECT public.admin_revision_submit(pg_temp.submit_cmd(
  '91000000-0000-0000-0000-000000000053', '93000000-0000-0000-0000-000000000116'))$q$,
  '22023', 'ADM_INVALID', 'duplicate steps cannot submit');
SELECT lives_ok($q$SELECT public.admin_draft_start('91000000-0000-0000-0000-000000000054',
  '93000000-0000-0000-0000-000000000117')$q$, 'unknown-label draft starts');
SELECT throws_ok($q$SELECT public.admin_revision_submit(pg_temp.submit_cmd(
  '91000000-0000-0000-0000-000000000054', '93000000-0000-0000-0000-000000000118'))$q$,
  '22023', 'ADM_INVALID', 'unknown labels cannot submit');

-- Valid submit with stale identity conflicts.
SELECT lives_ok($q$SELECT public.admin_draft_start('91000000-0000-0000-0000-000000000051',
  '93000000-0000-0000-0000-000000000119')$q$, 'review draft starts');
SELECT throws_ok($q$SELECT public.admin_revision_submit(jsonb_set(pg_temp.submit_cmd(
  '91000000-0000-0000-0000-000000000051', '93000000-0000-0000-0000-000000000120'),
  '{expected_version}', '0'))$q$,
  'PT409', 'ADM_CONFLICT', 'stale version cannot submit');
SELECT lives_ok($q$SELECT public.admin_revision_submit(pg_temp.submit_cmd(
  '91000000-0000-0000-0000-000000000051', '93000000-0000-0000-0000-000000000121'))$q$, 'valid submit');
SELECT is(
  (public.admin_recipe_detail('91000000-0000-0000-0000-000000000051')->'readiness'->>'review'),
  'submitted', 'readiness shows submitted');
SELECT is(
  (public.admin_recipe_detail('91000000-0000-0000-0000-000000000051')->'readiness'->>'awaitingReview'),
  'true', 'awaiting review flagged');
RESET ROLE;

-- Reviewer records a blocker and a suggestion; approval with an open blocker fails.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000004', 'aal2');
SET LOCAL ROLE authenticated;
SELECT ok(
  (public.admin_revision_issue(jsonb_build_object('operation_id', '93000000-0000-0000-0000-000000000122',
    'recipe_id', '91000000-0000-0000-0000-000000000051', 'reason', 'x',
    'revision_id', (pg_temp.review_head('91000000-0000-0000-0000-000000000051')->>'revision_id'),
    'expected_digest', (pg_temp.review_head('91000000-0000-0000-0000-000000000051')->>'digest'),
    'code', 'image-suitability', 'field', 'image', 'severity', 'blocker',
    'explanation', 'Depicts a different dish'))->>'issueId') IS NOT NULL,
  'blocker recorded');
SELECT lives_ok($q$SELECT public.admin_revision_issue(jsonb_build_object('operation_id', '93000000-0000-0000-0000-000000000123',
  'recipe_id', '91000000-0000-0000-0000-000000000051', 'reason', 'x',
  'revision_id', (pg_temp.review_head('91000000-0000-0000-0000-000000000051')->>'revision_id'),
  'expected_digest', (pg_temp.review_head('91000000-0000-0000-0000-000000000051')->>'digest'),
  'code', 'wording', 'field', 'title', 'severity', 'suggestion',
  'explanation', 'Consider a shorter title'))$q$, 'suggestion recorded');
SELECT throws_ok($q$SELECT public.admin_revision_review(
  pg_temp.approve_cmd('91000000-0000-0000-0000-000000000051', '93000000-0000-0000-0000-000000000124'))$q$,
  '42501', 'ADM_BLOCKED', 'open blocker stops approval');
RESET ROLE;

-- Owner self-review with explicit human resolution approves the exact digest.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is(
  (public.admin_revision_review(jsonb_build_object('operation_id', '93000000-0000-0000-0000-000000000125',
    'recipe_id', '91000000-0000-0000-0000-000000000051', 'reason', 'Checked content and image',
    'revision_id', (pg_temp.review_head('91000000-0000-0000-0000-000000000051')->>'revision_id'),
    'expected_version', ((pg_temp.review_head('91000000-0000-0000-0000-000000000051')->>'version')::int),
    'expected_digest', (pg_temp.review_head('91000000-0000-0000-0000-000000000051')->>'digest'),
    'submission_id', (pg_temp.review_head('91000000-0000-0000-0000-000000000051')->>'submission_id'),
    'decision', 'approve',
    'resolved_issue_ids', pg_temp.open_blocker_ids('91000000-0000-0000-0000-000000000051'))) ->> 'digest'),
  (pg_temp.review_head('91000000-0000-0000-0000-000000000051')->>'digest'),
  'approval preserves exact digest');
SELECT is(
  (public.admin_recipe_detail('91000000-0000-0000-0000-000000000051')->'readiness'->>'review'),
  'approved', 'readiness shows approved');
SELECT ok(
  (public.admin_recipe_detail('91000000-0000-0000-0000-000000000051')->'readiness'->>'readyToPublish')::boolean,
  'zero-blocker exact approval qualifies when other sources pass');

-- No-op after approval preserves version and eligibility.
SELECT is(
  (public.admin_draft_save(pg_temp.exact_command(
    '91000000-0000-0000-0000-000000000051', '93000000-0000-0000-0000-000000000126')) ->> 'noChange')::boolean,
  true, 'post-approval no-op preserves approval');
RESET ROLE;

-- Stale review identity conflicts; a second decision on one submission conflicts.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000004', 'aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_revision_review(pg_temp.stale_review_command())$$,
  'PT409', 'ADM_CONFLICT', 'decision is bound to current submitted snapshot');
SELECT throws_ok($q$SELECT public.admin_revision_review(
  pg_temp.approve_cmd('91000000-0000-0000-0000-000000000051', '93000000-0000-0000-0000-000000000127'))$q$,
  'PT409', 'ADM_CONFLICT', 'one decision per submission');
RESET ROLE;

-- Editor cannot review; reviewer cannot edit.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000003', 'aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($q$SELECT public.admin_revision_review(
  pg_temp.approve_cmd('91000000-0000-0000-0000-000000000051', '93000000-0000-0000-0000-000000000128'))$q$,
  '42501', 'ADM_DENIED', 'editor cannot review');
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000004', 'aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($q$SELECT public.admin_draft_save(
  pg_temp.exact_command('91000000-0000-0000-0000-000000000051', '93000000-0000-0000-0000-000000000129'))$q$,
  '42501', 'ADM_DENIED', 'reviewer cannot edit');
RESET ROLE;

-- Changed content invalidates approval; resubmission opens a new submission.
CREATE TEMP TABLE prior_submission AS
  SELECT current_submission_id AS id FROM private.recipe_drafts
  WHERE recipe_id = '91000000-0000-0000-0000-000000000051' AND workflow_schema = 1;
GRANT SELECT ON prior_submission TO authenticated;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT lives_ok($q$SELECT public.admin_draft_save(jsonb_set(pg_temp.exact_command(
  '91000000-0000-0000-0000-000000000051', '93000000-0000-0000-0000-000000000130', true),
  '{snapshot,catalog,title}', '"Changed Title"'))$q$, 'reopened change saves');
SELECT is(pg_temp.review_lifecycle('91000000-0000-0000-0000-000000000051'), 'draft', 'change resets lifecycle');
SELECT is(
  (public.admin_recipe_detail('91000000-0000-0000-0000-000000000051')->'readiness'->>'review'),
  'unreviewed', 'changed content invalidates approval');
SELECT lives_ok($q$SELECT public.admin_revision_submit(pg_temp.submit_cmd(
  '91000000-0000-0000-0000-000000000051', '93000000-0000-0000-0000-000000000131'))$q$, 'resubmit after change');
SELECT ok(pg_temp.review_submission('91000000-0000-0000-0000-000000000051') IS DISTINCT FROM
  (SELECT id FROM prior_submission), 'resubmission opens a new submission');

-- Legacy approve_with_changes creates no console workflow state.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is(
  (public.admin_recipe_detail('91000000-0000-0000-0000-000000000055')->'working'),
  'null', 'legacy verdict creates no working revision');
RESET ROLE;

SELECT ok(NOT has_function_privilege('anon', 'public.admin_revision_submit(jsonb)', 'EXECUTE'), 'anon submit denied');
SELECT ok(NOT has_function_privilege('authenticated', 'private.admin_snapshot_submittable(jsonb)', 'EXECUTE'), 'no direct validator');

SELECT * FROM finish();
ROLLBACK;
