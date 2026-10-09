-- Stable, bounded audit history for the recipe workspace.
CREATE OR REPLACE FUNCTION public.admin_recipe_history(
  p_recipe_id uuid, p_cursor text DEFAULT NULL, p_limit int DEFAULT 25
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  lim int := least(greatest(coalesce(p_limit, 25), 1), 100);
  cursor_text text;
  cursor_at timestamptz;
  cursor_id uuid;
  audit_row record;
  events jsonb := '[]'::jsonb;
  emitted int := 0;
  more_rows boolean := false;
  last_at timestamptz;
  last_id uuid;
BEGIN
  PERFORM private.admin_assert('recipe.read', 'inspection');
  IF NOT EXISTS (SELECT 1 FROM public.recipe_catalog WHERE id = p_recipe_id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF p_cursor IS NOT NULL THEN
    IF length(p_cursor) > 256 OR length(p_cursor) % 2 <> 0 OR p_cursor !~ '^[0-9a-f]+$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
    END IF;
    BEGIN
      cursor_text := convert_from(decode(p_cursor, 'hex'), 'UTF8');
      IF cursor_text !~ '^[^|]+[|][0-9a-f-]{36}$' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
      END IF;
      cursor_at := split_part(cursor_text, '|', 1)::timestamptz;
      cursor_id := split_part(cursor_text, '|', 2)::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
    END;
  END IF;
  FOR audit_row IN
    SELECT a.*, u.email AS actor_email FROM private.admin_audit a
    LEFT JOIN auth.users u ON u.id = a.actor_id
    WHERE a.recipe_id = p_recipe_id
      AND (p_cursor IS NULL OR (a.at, a.id) < (cursor_at, cursor_id))
    ORDER BY a.at DESC, a.id DESC
    LIMIT lim + 1
  LOOP
    IF emitted = lim THEN
      more_rows := true;
      EXIT;
    END IF;
    events := events || jsonb_build_array(jsonb_build_object(
      'id', audit_row.id, 'actorId', audit_row.actor_id, 'actorEmail', audit_row.actor_email,
      'action', audit_row.action, 'recipeId', audit_row.recipe_id,
      'revisionId', audit_row.revision_id, 'digest', audit_row.digest,
      'beforeRef', audit_row.before_ref, 'afterRef', audit_row.after_ref,
      'requestId', audit_row.request_id, 'at', audit_row.at,
      'reason', audit_row.reason, 'result', audit_row.result
    ));
    emitted := emitted + 1;
    last_at := audit_row.at;
    last_id := audit_row.id;
  END LOOP;
  RETURN jsonb_build_object(
    'events', events,
    'nextCursor', CASE WHEN more_rows THEN encode(convert_to(last_at::text || '|' || last_id::text, 'UTF8'), 'hex') ELSE NULL END
  );
END $$;

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
  hist := public.admin_recipe_history(p_recipe_id, NULL, 25);
  SELECT private.admin_revision_json(d.current_revision_id) INTO working
  FROM private.recipe_drafts d
  WHERE d.recipe_id = p_recipe_id AND d.workflow_schema = 1
    AND d.lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  RETURN jsonb_build_object(
    'active', snap, 'publication', pub, 'contentVersion', ver,
    'activeHash', hsh, 'working', working, 'readiness', readiness,
    'usage', jsonb_build_object('ok', true, 'value', usage),
    'legacyReviews', legacy, 'history', hist, 'checkedAt', now()
  );
END $$;
