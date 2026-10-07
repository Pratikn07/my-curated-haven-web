-- Admin review state: submission, decisions and issues for one revision.
-- Read-only; mutations stay in the review RPCs.

CREATE OR REPLACE FUNCTION public.admin_review_state(p_revision_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  rev record;
  sub jsonb;
BEGIN
  PERFORM private.admin_assert('recipe.read', 'inspection');
  IF p_revision_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT r.recipe_id, r.digest, r.version, d.lifecycle, d.current_submission_id
    INTO rev
    FROM private.recipe_revisions r
    JOIN private.recipe_drafts d ON d.id = r.draft_id
    WHERE r.id = p_revision_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT jsonb_build_object('id', s.id, 'digest', s.digest, 'version', s.version,
      'submittedBy', s.submitted_by, 'submittedAt', s.submitted_at)
    INTO sub FROM private.recipe_review_submissions s
    WHERE s.id = (SELECT current_submission_id FROM private.recipe_drafts d2
      JOIN private.recipe_revisions r2 ON r2.draft_id = d2.id WHERE r2.id = p_revision_id)
      AND s.revision_id = p_revision_id;
  RETURN jsonb_build_object(
    'submission', sub,
    'decisions', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'decision', d.decision, 'reviewer', d.reviewer, 'reason', d.reason,
        'decidedAt', d.decided_at, 'submissionId', d.submission_id)
        ORDER BY d.decided_at DESC)
      FROM private.recipe_review_decisions d WHERE d.revision_id = p_revision_id), '[]'::jsonb),
    'issues', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'code', i.code, 'field', i.field, 'severity', i.severity,
        'origin', i.origin, 'explanation', i.explanation,
        'createdBy', i.created_by, 'createdAt', i.created_at,
        'resolved', EXISTS (SELECT 1 FROM private.recipe_issue_resolutions r WHERE r.issue_id = i.id))
        ORDER BY i.created_at)
      FROM private.recipe_revision_issues i WHERE i.revision_id = p_revision_id), '[]'::jsonb)
  );
END $$;

REVOKE ALL ON FUNCTION public.admin_review_state(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_state(uuid) TO authenticated;

-- Detail now exposes the open working revision (Task 2 predates heads).
CREATE OR REPLACE FUNCTION public.admin_recipe_detail(p_recipe_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  snap jsonb;
  pub text;
  ver int;
  hsh text;
  readiness jsonb;
  usage jsonb;
  legacy jsonb;
  hist jsonb;
  working jsonb;
BEGIN
  PERFORM private.admin_assert('recipe.read', 'inspection');
  SELECT c.publication_state INTO pub FROM public.recipe_catalog c WHERE c.id = p_recipe_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  snap := private.admin_snapshot(p_recipe_id);
  readiness := private.admin_recipe_status(p_recipe_id);
  SELECT b.content_version INTO ver FROM public.recipe_bodies b WHERE b.recipe_id = p_recipe_id;
  hsh := readiness->>'targetDigest';
  usage := public.admin_recipe_usage(p_recipe_id);
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'contentVersion', r.content_version,
    'reviewerKind', r.reviewer_kind, 'reviewer', r.reviewer, 'verdict', r.verdict,
    'openBlockers', r.open_blockers, 'reviewedAt', r.reviewed_at)
    ORDER BY r.reviewed_at DESC, r.id DESC), '[]'::jsonb)
    INTO legacy FROM private.recipe_reviews r WHERE r.recipe_id = p_recipe_id;
  SELECT jsonb_build_object('events', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id', a.id, 'actorId', a.actor_id, 'action', a.action, 'recipeId', a.recipe_id,
    'revisionId', a.revision_id, 'digest', a.digest, 'beforeRef', a.before_ref,
    'afterRef', a.after_ref, 'requestId', a.request_id, 'at', a.at,
    'reason', a.reason, 'result', a.result) ORDER BY a.at DESC, a.id DESC)
    FROM private.admin_audit a WHERE a.recipe_id = p_recipe_id LIMIT 25), '[]'::jsonb),
    'nextCursor', NULL) INTO hist;
  SELECT private.admin_revision_json(d.current_revision_id) INTO working
  FROM private.recipe_drafts d
  WHERE d.recipe_id = p_recipe_id AND d.workflow_schema = 1
    AND d.lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  RETURN jsonb_build_object(
    'active', snap,
    'publication', pub,
    'contentVersion', ver,
    'activeHash', hsh,
    'working', working,
    'readiness', readiness,
    'usage', jsonb_build_object('ok', true, 'value', usage),
    'legacyReviews', legacy,
    'history', hist,
    'checkedAt', now()
  );
END $$;
