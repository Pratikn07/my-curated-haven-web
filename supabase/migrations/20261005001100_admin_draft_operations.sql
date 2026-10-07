-- Admin draft operations: start, save and rebase over immutable revisions.
-- Every mutation serialises on the catalog row, rechecks authority and base
-- identity, and funnels duplicate requests through the shared operation ledger.

CREATE OR REPLACE FUNCTION private.admin_validate_snapshot(p_snapshot jsonb) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  top text[];
  catalog jsonb;
  body jsonb;
  image jsonb;
BEGIN
  IF jsonb_typeof(p_snapshot) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT array_agg(k) INTO top FROM jsonb_object_keys(p_snapshot) k;
  IF EXISTS (SELECT 1 FROM unnest(top) k WHERE k NOT IN ('recipeId','slug','catalog','body','image')) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF octet_length(p_snapshot::text) > 200000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  catalog := p_snapshot->'catalog';
  IF jsonb_typeof(catalog) <> 'object'
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(catalog) k
      WHERE k NOT IN ('title','publicSummary','totalMinutes','mealLabels','dietLabels'))
    OR nullif(trim(catalog->>'title'), '') IS NULL
    OR char_length(catalog->>'title') > 300 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  body := p_snapshot->'body';
  IF body IS NOT NULL AND body <> 'null'::jsonb THEN
    IF jsonb_typeof(body) <> 'object'
      OR EXISTS (SELECT 1 FROM jsonb_object_keys(body) k
        WHERE k NOT IN ('ingredients','instructions','yield','yieldStructured','reviewedNotes','allergenReviewState','allergens','storageNotes')) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
    END IF;
    IF (body ? 'ingredients') AND jsonb_typeof(body->'ingredients') <> 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
    END IF;
    IF (body ? 'instructions') AND jsonb_typeof(body->'instructions') <> 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
    END IF;
  END IF;
  image := p_snapshot->'image';
  IF jsonb_typeof(image) <> 'object'
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(image) k
      WHERE k NOT IN ('path','alt','description','objectId','objectVersion')) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION private.admin_revision_json(p_revision_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'id', r.id, 'draftId', r.draft_id, 'recipeId', r.recipe_id,
    'version', r.version, 'digest', r.digest,
    'base', jsonb_build_object('contentVersion', r.base_content_version, 'activeHash', r.base_active_hash),
    'state', d.lifecycle, 'submissionId', NULL,
    'snapshot', r.snapshot, 'savedAt', r.saved_at, 'savedBy', r.actor_id
  )
  FROM private.recipe_revisions r
  JOIN private.recipe_drafts d ON d.id = r.draft_id
  WHERE r.id = p_revision_id;
$$;

CREATE OR REPLACE FUNCTION private.admin_no_change_receipt(p_actor uuid, p_operation_id uuid, p_draft_id uuid) RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  head private.recipe_drafts;
  current jsonb;
  receipt jsonb;
BEGIN
  SELECT * INTO head FROM private.recipe_drafts WHERE id = p_draft_id;
  current := private.admin_revision_json(head.current_revision_id);
  receipt := jsonb_build_object(
    'operationId', p_operation_id, 'recipeId', head.recipe_id,
    'revisionId', current->>'id', 'version', (current->>'version')::int,
    'digest', current->>'digest', 'noChange', true,
    'committedAt', now(),
    'publication', (SELECT publication_state FROM public.recipe_catalog WHERE id = head.recipe_id));
  PERFORM private.admin_finish_operation(p_actor, p_operation_id, receipt);
  RETURN receipt;
END $$;

CREATE OR REPLACE FUNCTION public.admin_draft_start(p_recipe_id uuid, p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid;
  head private.recipe_drafts;
  snap jsonb;
  digest text;
  active_hash text;
  base_ver int;
  receipt jsonb;
  new_draft_id uuid;
  new_rev_id uuid;
BEGIN
  actor := private.admin_assert('recipe.edit', 'editing');
  IF p_recipe_id IS NULL OR p_operation_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  PERFORM 1 FROM public.recipe_catalog WHERE id = p_recipe_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT * INTO head FROM private.recipe_drafts
    WHERE recipe_id = p_recipe_id AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected')
    FOR UPDATE;
  receipt := private.admin_begin_operation(actor, p_operation_id, 'draft.start', p_recipe_id,
    jsonb_build_object('recipeId', p_recipe_id));
  IF receipt IS NOT NULL THEN
    PERFORM private.admin_assert('recipe.edit', 'editing');
    RETURN receipt;
  END IF;
  IF head.id IS NOT NULL THEN
    receipt := private.admin_revision_json(head.current_revision_id);
    PERFORM private.admin_finish_operation(actor, p_operation_id, receipt);
    RETURN receipt;
  END IF;
  snap := private.admin_snapshot(p_recipe_id);
  digest := private.admin_snapshot_digest(snap);
  active_hash := private.admin_active_hash(p_recipe_id);
  SELECT content_version INTO base_ver FROM public.recipe_bodies WHERE recipe_id = p_recipe_id;
  INSERT INTO private.recipe_drafts(recipe_id, workflow_schema, lifecycle, base_content_version,
    base_active_hash, working_version, created_by, updated_by)
  VALUES (p_recipe_id, 1, 'draft', base_ver, active_hash, 1, actor, actor)
  RETURNING id INTO new_draft_id;
  INSERT INTO private.recipe_revisions(draft_id, recipe_id, version, snapshot, digest,
    base_content_version, base_active_hash, actor_id)
  VALUES (new_draft_id, p_recipe_id, 1, snap, digest, base_ver, active_hash, actor)
  RETURNING id INTO new_rev_id;
  UPDATE private.recipe_drafts SET current_revision_id = new_rev_id WHERE id = new_draft_id;
  INSERT INTO private.admin_audit(actor_id, action, recipe_id, revision_id, digest, request_id, reason, result)
  VALUES (actor, 'draft.start', p_recipe_id, new_rev_id, digest, p_operation_id, 'start working revision', 'success');
  receipt := private.admin_revision_json(new_rev_id);
  PERFORM private.admin_finish_operation(actor, p_operation_id, receipt);
  RETURN receipt;
END $$;

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
    updated_by = actor,
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

CREATE OR REPLACE FUNCTION public.admin_draft_rebase(p_command jsonb) RETURNS jsonb
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
  live_ver int;
  live_hash text;
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
  receipt := private.admin_begin_operation(actor, op_id, 'draft.rebase', cmd_recipe,
    jsonb_build_object('recipe_id', cmd_recipe, 'reason', reason,
      'expected_version', p_command->'expected_version', 'expected_digest', p_command->>'expected_digest',
      'base', p_command->'base', 'new_base', p_command->'new_base', 'snapshot', candidate));
  IF receipt IS NOT NULL THEN
    PERFORM private.admin_assert('recipe.edit', 'editing');
    RETURN receipt;
  END IF;
  current := private.admin_revision_json(head.current_revision_id);
  SELECT content_version INTO live_ver FROM public.recipe_bodies WHERE recipe_id = cmd_recipe;
  live_hash := private.admin_active_hash(cmd_recipe);
  IF (p_command->>'expected_version')::int IS DISTINCT FROM head.working_version
    OR (p_command->>'expected_digest') IS DISTINCT FROM (current->>'digest')
    OR (p_command->'base'->>'active_hash') IS DISTINCT FROM head.base_active_hash THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ADM_CONFLICT';
  END IF;
  IF (p_command->'new_base'->>'active_hash') IS DISTINCT FROM live_hash
    OR ((p_command->'new_base'->>'content_version')::int IS DISTINCT FROM live_ver
      AND NOT ((p_command->'new_base'->>'content_version') IS NULL AND live_ver IS NULL)) THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ADM_CONFLICT';
  END IF;
  IF candidate->>'recipeId' IS DISTINCT FROM cmd_recipe::text
    OR candidate->>'slug' IS DISTINCT FROM (SELECT slug FROM public.recipe_catalog WHERE id = cmd_recipe) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  PERFORM private.admin_validate_snapshot(candidate);
  digest := private.admin_snapshot_digest(candidate);
  INSERT INTO private.recipe_revisions(draft_id, recipe_id, version, snapshot, digest,
    base_content_version, base_active_hash, actor_id)
  VALUES (head.id, cmd_recipe, head.working_version + 1, candidate, digest,
    live_ver, live_hash, actor)
  RETURNING id INTO new_rev_id;
  UPDATE private.recipe_drafts
  SET working_version = head.working_version + 1, current_revision_id = new_rev_id,
    base_content_version = live_ver, base_active_hash = live_hash,
    updated_by = actor, lifecycle = 'draft'
  WHERE id = head.id;
  SELECT publication_state INTO pub FROM public.recipe_catalog WHERE id = cmd_recipe;
  INSERT INTO private.admin_audit(actor_id, action, recipe_id, revision_id, digest, request_id, reason, result)
  VALUES (actor, 'draft.rebase', cmd_recipe, new_rev_id, digest, op_id, reason, 'success');
  receipt := jsonb_build_object('operationId', op_id, 'recipeId', cmd_recipe,
    'revisionId', new_rev_id, 'version', head.working_version + 1, 'digest', digest,
    'noChange', false, 'committedAt', now(), 'publication', pub);
  PERFORM private.admin_finish_operation(actor, op_id, receipt);
  RETURN receipt;
END $$;

CREATE OR REPLACE FUNCTION public.admin_recipe_revision(p_recipe_id uuid, p_revision_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  revision jsonb;
BEGIN
  PERFORM private.admin_assert('recipe.read', 'inspection');
  IF p_recipe_id IS NULL OR p_revision_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  revision := private.admin_revision_json(p_revision_id);
  IF revision IS NULL OR (revision->>'recipeId')::uuid IS DISTINCT FROM p_recipe_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  RETURN revision;
END $$;

REVOKE ALL ON FUNCTION private.admin_validate_snapshot(jsonb), private.admin_revision_json(uuid),
  private.admin_no_change_receipt(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_draft_start(uuid, uuid), public.admin_draft_save(jsonb),
  public.admin_draft_rebase(jsonb), public.admin_recipe_revision(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_draft_start(uuid, uuid), public.admin_draft_save(jsonb),
  public.admin_draft_rebase(jsonb), public.admin_recipe_revision(uuid, uuid) TO authenticated;
