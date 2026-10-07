-- Admin review: frozen submissions, immutable issues/decisions bound to the exact
-- candidate digest. A changed save clears submission eligibility (see the
-- updated save/rebase below); resubmission always opens a new submission.

CREATE TABLE IF NOT EXISTS private.recipe_review_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES private.recipe_revisions(id) ON DELETE RESTRICT,
  digest text NOT NULL,
  version integer NOT NULL,
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private.recipe_review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES private.recipe_review_submissions(id) ON DELETE RESTRICT,
  revision_id uuid NOT NULL REFERENCES private.recipe_revisions(id) ON DELETE RESTRICT,
  digest text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approve','changes_requested','reject')),
  reviewer uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 1000),
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private.recipe_revision_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES private.recipe_revisions(id) ON DELETE RESTRICT,
  digest text NOT NULL,
  code text NOT NULL CHECK (length(trim(code)) BETWEEN 1 AND 120),
  field text CHECK (field IS NULL OR length(trim(field)) BETWEEN 1 AND 120),
  severity text NOT NULL CHECK (severity IN ('blocker','suggestion')),
  origin text NOT NULL CHECK (origin IN ('validation','human','source')),
  explanation text NOT NULL CHECK (length(trim(explanation)) BETWEEN 1 AND 1000),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private.recipe_issue_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL UNIQUE REFERENCES private.recipe_revision_issues(id) ON DELETE RESTRICT,
  resolver uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 1000),
  resolved_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.recipe_drafts ADD COLUMN IF NOT EXISTS current_submission_id uuid;
ALTER TABLE private.recipe_reviews
  ADD COLUMN IF NOT EXISTS admin_revision_id uuid REFERENCES private.recipe_revisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_digest text;

ALTER TABLE private.recipe_review_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.recipe_review_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.recipe_revision_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.recipe_issue_resolutions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.recipe_review_submissions, private.recipe_review_decisions,
  private.recipe_revision_issues, private.recipe_issue_resolutions FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.recipe_review_submissions, private.recipe_review_decisions,
  private.recipe_revision_issues, private.recipe_issue_resolutions TO service_role;

DROP TRIGGER IF EXISTS review_submission_immutable ON private.recipe_review_submissions;
CREATE TRIGGER review_submission_immutable BEFORE UPDATE OR DELETE ON private.recipe_review_submissions
  FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
DROP TRIGGER IF EXISTS review_decision_immutable ON private.recipe_review_decisions;
CREATE TRIGGER review_decision_immutable BEFORE UPDATE OR DELETE ON private.recipe_review_decisions
  FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
DROP TRIGGER IF EXISTS revision_issue_immutable ON private.recipe_revision_issues;
CREATE TRIGGER revision_issue_immutable BEFORE UPDATE OR DELETE ON private.recipe_revision_issues
  FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
DROP TRIGGER IF EXISTS issue_resolution_immutable ON private.recipe_issue_resolutions;
CREATE TRIGGER issue_resolution_immutable BEFORE UPDATE OR DELETE ON private.recipe_issue_resolutions
  FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();

-- Shared structural checks reused by submit, status and (later) publish.
CREATE OR REPLACE FUNCTION private.admin_snapshot_submittable(p_snapshot jsonb) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  body jsonb;
  steps jsonb;
  step_numbers int[];
BEGIN
  PERFORM private.admin_validate_snapshot(p_snapshot);
  body := p_snapshot->'body';
  IF body IS NULL OR body = 'null'::jsonb THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF jsonb_typeof(body->'ingredients') <> 'array' OR jsonb_array_length(body->'ingredients') = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(body->'ingredients') e
    WHERE jsonb_typeof(e) <> 'object' OR nullif(trim(e->>'item'), '') IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  steps := body->'instructions';
  IF jsonb_typeof(steps) <> 'array' OR jsonb_array_length(steps) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT array_agg((e->>'step')::int ORDER BY (e->>'step')::int) INTO step_numbers
  FROM jsonb_array_elements(steps) e;
  IF step_numbers IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  FOR i IN 1..array_length(step_numbers, 1) LOOP
    IF step_numbers[i] <> i THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
    END IF;
  END LOOP;
  IF nullif(trim(p_snapshot->'body'->>'yield'), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(
      coalesce(p_snapshot->'catalog'->'mealLabels', '[]'::jsonb)) m
    WHERE m NOT IN ('Breakfast','Lunch','Dinner','Snack')) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(
      coalesce(p_snapshot->'catalog'->'dietLabels', '[]'::jsonb)) d
    WHERE d NOT IN ('Vegetarian','Dairy-Free','Nut-Free','Gluten-Free','Soy-Free')) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION private.admin_unresolved_blockers(p_revision_id uuid, p_digest text) RETURNS int
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT count(*)::int FROM private.recipe_revision_issues i
  WHERE i.revision_id = p_revision_id AND i.digest = p_digest AND i.severity = 'blocker'
    AND NOT EXISTS (SELECT 1 FROM private.recipe_issue_resolutions r WHERE r.issue_id = i.id);
$$;

-- A changed save clears submission eligibility; resubmission opens a new one.
CREATE OR REPLACE FUNCTION public.admin_draft_save(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid;
  cmd_recipe uuid;
  op_id uuid;
  reason text;
  head private.recipe_drafts;
  current jsonb;
  candidate jsonb;
  digest text;
  receipt jsonb;
  new_rev_id uuid;
  pub text;
BEGIN
  actor := private.admin_assert('recipe.edit', 'editing');
  BEGIN
    cmd_recipe := (p_command->>'recipe_id')::uuid;
    op_id := (p_command->>'operation_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END;
  reason := p_command->>'reason';
  candidate := p_command->'snapshot';
  IF cmd_recipe IS NULL OR op_id IS NULL OR candidate IS NULL
    OR length(trim(coalesce(reason, ''))) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  PERFORM 1 FROM public.recipe_catalog WHERE id = cmd_recipe FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT * INTO head FROM private.recipe_drafts
    WHERE recipe_id = cmd_recipe AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected')
    FOR UPDATE;
  IF head.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  receipt := private.admin_begin_operation(actor, op_id, 'draft.save', cmd_recipe,
    jsonb_build_object('recipe_id', cmd_recipe, 'reason', reason,
      'expected_version', p_command->'expected_version', 'expected_digest', p_command->>'expected_digest',
      'base', p_command->'base', 'snapshot', candidate,
      'reopen_reviewed', coalesce((p_command->>'reopen_reviewed')::boolean, false)));
  IF receipt IS NOT NULL THEN
    PERFORM private.admin_assert('recipe.edit', 'editing');
    RETURN receipt;
  END IF;
  current := private.admin_revision_json(head.current_revision_id);
  IF (p_command->>'expected_version')::int IS DISTINCT FROM head.working_version
    OR (p_command->>'expected_digest') IS DISTINCT FROM (current->>'digest')
    OR private.admin_active_hash(cmd_recipe) IS DISTINCT FROM head.base_active_hash
    OR (p_command->'base'->>'active_hash') IS DISTINCT FROM head.base_active_hash THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ADM_CONFLICT';
  END IF;
  IF candidate->>'recipeId' IS DISTINCT FROM cmd_recipe::text
    OR candidate->>'slug' IS DISTINCT FROM (SELECT slug FROM public.recipe_catalog WHERE id = cmd_recipe) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  PERFORM private.admin_validate_snapshot(candidate);
  digest := private.admin_snapshot_digest(candidate);
  IF digest = (current->>'digest') THEN
    RETURN private.admin_no_change_receipt(actor, op_id, head.id);
  END IF;
  IF head.lifecycle IN ('submitted','approved')
    AND coalesce((p_command->>'reopen_reviewed')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  INSERT INTO private.recipe_revisions(draft_id, recipe_id, version, snapshot, digest,
    base_content_version, base_active_hash, actor_id)
  VALUES (head.id, cmd_recipe, head.working_version + 1, candidate, digest,
    head.base_content_version, head.base_active_hash, actor)
  RETURNING id INTO new_rev_id;
  UPDATE private.recipe_drafts
  SET working_version = head.working_version + 1, current_revision_id = new_rev_id,
    updated_by = actor, current_submission_id = NULL,
    lifecycle = CASE WHEN head.lifecycle IN ('submitted','approved') THEN 'draft' ELSE lifecycle END
  WHERE id = head.id;
  SELECT publication_state INTO pub FROM public.recipe_catalog WHERE id = cmd_recipe;
  INSERT INTO private.admin_audit(actor_id, action, recipe_id, revision_id, digest, request_id, reason, result)
  VALUES (actor, 'draft.save', cmd_recipe, new_rev_id, digest, op_id, reason, 'success');
  receipt := jsonb_build_object('operationId', op_id, 'recipeId', cmd_recipe,
    'revisionId', new_rev_id, 'version', head.working_version + 1, 'digest', digest,
    'noChange', false, 'committedAt', now(), 'publication', pub);
  PERFORM private.admin_finish_operation(actor, op_id, receipt);
  RETURN receipt;
END $$;

CREATE OR REPLACE FUNCTION public.admin_revision_submit(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid;
  cmd_recipe uuid;
  op_id uuid;
  reason text;
  rev_id uuid;
  head private.recipe_drafts;
  current jsonb;
  candidate jsonb;
  receipt jsonb;
  sub_id uuid;
BEGIN
  actor := private.admin_assert('recipe.edit', 'editing');
  BEGIN
    cmd_recipe := (p_command->>'recipe_id')::uuid;
    op_id := (p_command->>'operation_id')::uuid;
    rev_id := (p_command->>'revision_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END;
  reason := p_command->>'reason';
  IF cmd_recipe IS NULL OR op_id IS NULL OR rev_id IS NULL
    OR length(trim(coalesce(reason, ''))) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  PERFORM 1 FROM public.recipe_catalog WHERE id = cmd_recipe FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT * INTO head FROM private.recipe_drafts
    WHERE recipe_id = cmd_recipe AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected')
    FOR UPDATE;
  IF head.id IS NULL OR head.current_revision_id IS DISTINCT FROM rev_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF head.lifecycle NOT IN ('draft','changes_requested','rejected') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  receipt := private.admin_begin_operation(actor, op_id, 'revision.submit', cmd_recipe,
    jsonb_build_object('recipe_id', cmd_recipe, 'reason', reason, 'revision_id', rev_id,
      'expected_version', p_command->'expected_version', 'expected_digest', p_command->>'expected_digest'));
  IF receipt IS NOT NULL THEN
    PERFORM private.admin_assert('recipe.edit', 'editing');
    RETURN receipt;
  END IF;
  current := private.admin_revision_json(head.current_revision_id);
  IF (p_command->>'expected_version')::int IS DISTINCT FROM head.working_version
    OR (p_command->>'expected_digest') IS DISTINCT FROM (current->>'digest') THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ADM_CONFLICT';
  END IF;
  candidate := current->'snapshot';
  PERFORM private.admin_snapshot_submittable(candidate);
  INSERT INTO private.recipe_review_submissions(revision_id, digest, version, submitted_by)
  VALUES (rev_id, current->>'digest', head.working_version, actor)
  RETURNING id INTO sub_id;
  UPDATE private.recipe_drafts
  SET lifecycle = 'submitted', current_submission_id = sub_id, updated_by = actor
  WHERE id = head.id;
  INSERT INTO private.admin_audit(actor_id, action, recipe_id, revision_id, digest, request_id, reason, result)
  VALUES (actor, 'revision.submit', cmd_recipe, rev_id, current->>'digest', op_id, reason, 'success');
  receipt := private.admin_revision_json(head.current_revision_id);
  PERFORM private.admin_finish_operation(actor, op_id, receipt);
  RETURN receipt;
END $$;

CREATE OR REPLACE FUNCTION public.admin_revision_issue(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid;
  cmd_recipe uuid;
  op_id uuid;
  rev_id uuid;
  head private.recipe_drafts;
  current jsonb;
  issue_id uuid;
BEGIN
  actor := private.admin_assert('recipe.review', 'editing');
  BEGIN
    cmd_recipe := (p_command->>'recipe_id')::uuid;
    op_id := (p_command->>'operation_id')::uuid;
    rev_id := (p_command->>'revision_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END;
  IF cmd_recipe IS NULL OR op_id IS NULL OR rev_id IS NULL
    OR length(trim(coalesce(p_command->>'code', ''))) NOT BETWEEN 1 AND 120
    OR (p_command->>'field' IS NOT NULL AND length(trim(p_command->>'field')) NOT BETWEEN 1 AND 120)
    OR (p_command->>'severity') NOT IN ('blocker','suggestion')
    OR length(trim(coalesce(p_command->>'explanation', ''))) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  PERFORM 1 FROM public.recipe_catalog WHERE id = cmd_recipe FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT * INTO head FROM private.recipe_drafts
    WHERE recipe_id = cmd_recipe AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected')
    FOR UPDATE;
  IF head.id IS NULL OR head.current_revision_id IS DISTINCT FROM rev_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  current := private.admin_revision_json(head.current_revision_id);
  IF (p_command->>'expected_digest') IS DISTINCT FROM (current->>'digest') THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ADM_CONFLICT';
  END IF;
  INSERT INTO private.recipe_revision_issues(revision_id, digest, code, field, severity, origin, explanation, created_by)
  VALUES (rev_id, current->>'digest', trim(p_command->>'code'),
    NULLIF(trim(p_command->>'field'), ''), p_command->>'severity', 'human',
    trim(p_command->>'explanation'), actor)
  RETURNING id INTO issue_id;
  INSERT INTO private.admin_audit(actor_id, action, recipe_id, revision_id, digest, request_id, reason, result)
  VALUES (actor, 'revision.issue', cmd_recipe, rev_id, current->>'digest', op_id,
    trim(p_command->>'code'), 'success');
  RETURN jsonb_build_object('issueId', issue_id);
END $$;

CREATE OR REPLACE FUNCTION public.admin_revision_review(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid;
  cmd_recipe uuid;
  op_id uuid;
  rev_id uuid;
  sub_id uuid;
  head private.recipe_drafts;
  current jsonb;
  decision text;
  reason text;
  resolved uuid[];
  issue record;
  receipt jsonb;
  pub text;
BEGIN
  actor := private.admin_assert('recipe.review', 'editing');
  BEGIN
    cmd_recipe := (p_command->>'recipe_id')::uuid;
    op_id := (p_command->>'operation_id')::uuid;
    rev_id := (p_command->>'revision_id')::uuid;
    sub_id := (p_command->>'submission_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END;
  decision := p_command->>'decision';
  reason := p_command->>'reason';
  IF cmd_recipe IS NULL OR op_id IS NULL OR rev_id IS NULL OR sub_id IS NULL
    OR decision NOT IN ('approve','changes_requested','reject')
    OR length(trim(coalesce(reason, ''))) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  BEGIN
    SELECT array_agg((x::text)::uuid) INTO resolved
    FROM jsonb_array_elements_text(coalesce(p_command->'resolved_issue_ids', '[]'::jsonb)) x;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END;
  PERFORM 1 FROM public.recipe_catalog WHERE id = cmd_recipe FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT * INTO head FROM private.recipe_drafts
    WHERE recipe_id = cmd_recipe AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected')
    FOR UPDATE;
  IF head.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  receipt := private.admin_begin_operation(actor, op_id, 'revision.review', cmd_recipe,
    jsonb_build_object('recipe_id', cmd_recipe, 'reason', reason, 'revision_id', rev_id,
      'expected_version', p_command->'expected_version', 'expected_digest', p_command->>'expected_digest',
      'submission_id', sub_id, 'decision', decision, 'resolved_issue_ids', coalesce(p_command->'resolved_issue_ids', '[]'::jsonb)));
  IF receipt IS NOT NULL THEN
    PERFORM private.admin_assert('recipe.review', 'editing');
    RETURN receipt;
  END IF;
  current := private.admin_revision_json(head.current_revision_id);
  IF head.lifecycle <> 'submitted'
    OR head.current_submission_id IS DISTINCT FROM sub_id
    OR head.current_revision_id IS DISTINCT FROM rev_id
    OR (p_command->>'expected_version')::int IS DISTINCT FROM head.working_version
    OR (p_command->>'expected_digest') IS DISTINCT FROM (current->>'digest') THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ADM_CONFLICT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.recipe_review_submissions
    WHERE id = sub_id AND revision_id = rev_id AND digest = (current->>'digest')) THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ADM_CONFLICT';
  END IF;
  IF EXISTS (SELECT 1 FROM private.recipe_review_decisions WHERE submission_id = sub_id) THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ADM_CONFLICT';
  END IF;
  FOR issue IN SELECT * FROM private.recipe_revision_issues
    WHERE revision_id = rev_id AND digest = (current->>'digest')
      AND severity = 'blocker'
      AND NOT EXISTS (SELECT 1 FROM private.recipe_issue_resolutions r WHERE r.issue_id = id)
  LOOP
    IF issue.id = ANY (coalesce(resolved, '{}')) THEN
      IF issue.origin IN ('validation','source') THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
      END IF;
      INSERT INTO private.recipe_issue_resolutions(issue_id, resolver, reason)
      VALUES (issue.id, actor, reason);
    ELSIF decision = 'approve' THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
    END IF;
  END LOOP;
  IF decision = 'approve' THEN
    IF (current->'snapshot'->'body'->>'allergenReviewState') = 'unknown'
      OR (current->'snapshot'->'body') IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
    END IF;
  END IF;
  INSERT INTO private.recipe_review_decisions(submission_id, revision_id, digest, decision, reviewer, reason)
  VALUES (sub_id, rev_id, current->>'digest', decision, actor, reason);
  UPDATE private.recipe_drafts
  SET lifecycle = CASE decision WHEN 'approve' THEN 'approved'
      WHEN 'changes_requested' THEN 'changes_requested' ELSE 'rejected' END,
    updated_by = actor
  WHERE id = head.id;
  SELECT publication_state INTO pub FROM public.recipe_catalog WHERE id = cmd_recipe;
  INSERT INTO private.admin_audit(actor_id, action, recipe_id, revision_id, digest, request_id, reason, result)
  VALUES (actor, 'revision.review', cmd_recipe, rev_id, current->>'digest', op_id, decision || ': ' || reason, 'success');
  receipt := jsonb_build_object('operationId', op_id, 'recipeId', cmd_recipe,
    'revisionId', rev_id, 'version', head.working_version, 'digest', current->>'digest',
    'noChange', false, 'committedAt', now(), 'publication', pub);
  PERFORM private.admin_finish_operation(actor, op_id, receipt);
  RETURN receipt;
END $$;

REVOKE ALL ON FUNCTION private.admin_snapshot_submittable(jsonb), private.admin_unresolved_blockers(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_revision_submit(jsonb), public.admin_revision_issue(jsonb),
  public.admin_revision_review(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revision_submit(jsonb), public.admin_revision_issue(jsonb),
  public.admin_revision_review(jsonb) TO authenticated;

-- Readiness learns the console workflow: the open head's lifecycle maps to the
-- review state, awaiting review reflects a live submission, and a current
-- exact approval qualifies alongside legacy evidence.
CREATE OR REPLACE FUNCTION private.admin_recipe_status(p_recipe_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  snap jsonb;
  pub text;
  has_body boolean;
  has_image boolean;
  legacy_ok boolean;
  review_state text;
  checks jsonb := '[]'::jsonb;
  needs_attention boolean;
  ready boolean;
  needs_verify boolean := false;
  head_id uuid;
  head_rev uuid;
  head_digest text;
  head_lifecycle text;
  head_sub uuid;
  latest jsonb;
  fresh boolean;
  approved_now boolean := false;
  open_blockers int;
BEGIN
  SELECT c.publication_state INTO pub FROM public.recipe_catalog c WHERE c.id = p_recipe_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  snap := private.admin_snapshot(p_recipe_id);
  has_body := (snap->'body') IS NOT NULL AND (snap->'body') <> 'null'::jsonb;
  has_image := nullif(snap#>>'{image,path}', '') IS NOT NULL;
  BEGIN
    SELECT private.recipe_is_reviewed(p_recipe_id) INTO legacy_ok;
  EXCEPTION WHEN OTHERS THEN
    legacy_ok := false;
  END;
  SELECT d.id, d.current_revision_id, d.lifecycle, d.current_submission_id
    INTO head_id, head_rev, head_lifecycle, head_sub FROM private.recipe_drafts d
    WHERE d.recipe_id = p_recipe_id AND d.workflow_schema = 1
      AND d.lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  IF head_id IS NOT NULL THEN
    SELECT r.digest INTO head_digest FROM private.recipe_revisions r WHERE r.id = head_rev;
    review_state := CASE head_lifecycle
      WHEN 'submitted' THEN 'submitted'
      WHEN 'approved' THEN 'approved'
      WHEN 'changes_requested' THEN 'changes_requested'
      WHEN 'rejected' THEN 'rejected'
      ELSE 'unreviewed' END;
    IF head_lifecycle = 'approved' THEN
      SELECT count(*)::int INTO open_blockers FROM private.recipe_revision_issues i
      WHERE i.revision_id = head_rev AND i.severity = 'blocker'
        AND NOT EXISTS (SELECT 1 FROM private.recipe_issue_resolutions r WHERE r.issue_id = i.id);
      approved_now := open_blockers = 0 AND EXISTS (
        SELECT 1 FROM private.recipe_review_decisions d
        WHERE d.submission_id = head_sub AND d.revision_id = head_rev
          AND d.digest = head_digest AND d.decision = 'approve');
      IF NOT approved_now THEN
        review_state := 'unreviewed';
      END IF;
    END IF;
  ELSE
    review_state := CASE WHEN legacy_ok THEN 'approved' ELSE 'unreviewed' END;
  END IF;
  IF NOT has_body THEN
    checks := checks || jsonb_build_object('code', 'missing-body', 'scope', 'body',
      'state', 'fail', 'severity', 'blocker',
      'explanation', 'Recipe body is missing', 'origin', 'validation');
  END IF;
  IF NOT has_image THEN
    checks := checks || jsonb_build_object('code', 'missing-image', 'scope', 'image',
      'state', 'fail', 'severity', 'blocker',
      'explanation', 'Preview image is missing', 'origin', 'validation');
  END IF;
  IF NOT legacy_ok AND NOT approved_now THEN
    checks := checks || jsonb_build_object('code', 'legacy-review', 'scope', 'review',
      'state', 'fail', 'severity', 'blocker',
      'explanation', 'No passing legacy review for the current version', 'origin', 'source');
  END IF;
  IF head_id IS NOT NULL THEN
    SELECT jsonb_build_object('available', c.available, 'digest', c.digest, 'checked_at', c.checked_at)
      INTO latest FROM private.recipe_asset_checks c
      WHERE c.revision_id = head_rev ORDER BY c.checked_at DESC, c.id DESC LIMIT 1;
    IF latest IS NULL THEN
      checks := checks || jsonb_build_object('code', 'image-availability', 'scope', 'image',
        'state', 'unknown', 'severity', 'blocker',
        'explanation', 'No availability check recorded for the working revision', 'origin', 'source');
      needs_verify := true;
    ELSE
      fresh := (now() - (latest->>'checked_at')::timestamptz) <= interval '60 seconds';
      IF NOT fresh OR (latest->>'digest') IS DISTINCT FROM head_digest THEN
        checks := checks || jsonb_build_object('code', 'image-availability', 'scope', 'image',
          'state', 'unknown', 'severity', 'blocker',
          'explanation', 'Availability evidence is stale or targets another revision', 'origin', 'source');
        needs_verify := true;
      ELSIF (latest->>'available')::boolean THEN
        checks := checks || jsonb_build_object('code', 'image-availability', 'scope', 'image',
          'state', 'pass', 'severity', 'blocker',
          'explanation', 'Working image object verified available', 'origin', 'source');
      ELSE
        checks := checks || jsonb_build_object('code', 'image-availability', 'scope', 'image',
          'state', 'fail', 'severity', 'blocker',
          'explanation', 'Working image object is unavailable', 'origin', 'source');
      END IF;
    END IF;
  END IF;
  needs_attention := (NOT has_body) OR (NOT has_image) OR (NOT legacy_ok AND NOT approved_now);
  ready := has_body AND has_image AND (legacy_ok OR approved_now) AND pub = 'draft';
  RETURN jsonb_build_object(
    'targetDigest', encode(extensions.digest(convert_to(snap::text, 'UTF8'), 'sha256'), 'hex'),
    'review', review_state,
    'checks', checks,
    'needsAttention', needs_attention,
    'awaitingReview', coalesce(head_lifecycle = 'submitted', false),
    'readyToPublish', ready,
    'needsVerification', needs_verify,
    'evaluatedAt', now()
  );
END $$;
