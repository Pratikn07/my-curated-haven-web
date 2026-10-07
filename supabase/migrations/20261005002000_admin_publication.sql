-- Admin publication: atomic publish/withdraw with frozen impact evidence.
-- Ordinary publication is blocked by sealed, live-commercial, historical or
-- campaign exposure; emergency withdrawal is owner-only and fully recorded.

CREATE TABLE IF NOT EXISTS private.admin_campaign_snapshots (
  deployment_revision text PRIMARY KEY,
  configuration jsonb NOT NULL,
  configuration_hash text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.admin_campaign_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.admin_campaign_snapshots FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.admin_campaign_snapshots TO service_role;

CREATE TABLE IF NOT EXISTS private.recipe_active_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipe_catalog(id) ON DELETE CASCADE,
  archived_at timestamptz NOT NULL DEFAULT now(),
  catalog jsonb NOT NULL,
  body jsonb,
  image jsonb NOT NULL,
  publication_state text NOT NULL,
  content_version integer,
  operation_id uuid NOT NULL
);
CREATE INDEX IF NOT EXISTS recipe_active_archives_recipe_idx
  ON private.recipe_active_archives (recipe_id, archived_at DESC);
ALTER TABLE private.recipe_active_archives ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.recipe_active_archives FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.recipe_active_archives TO service_role;

DROP TRIGGER IF EXISTS recipe_active_archives_immutable ON private.recipe_active_archives;
CREATE TRIGGER recipe_active_archives_immutable BEFORE UPDATE OR DELETE ON private.recipe_active_archives
  FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();

-- Revision JSON carries the live submission binding (Task 6 revision predates it).
CREATE OR REPLACE FUNCTION private.admin_revision_json(p_revision_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'id', r.id, 'draftId', r.draft_id, 'recipeId', r.recipe_id,
    'version', r.version, 'digest', r.digest,
    'base', jsonb_build_object('contentVersion', r.base_content_version, 'activeHash', r.base_active_hash),
    'state', d.lifecycle, 'submissionId', d.current_submission_id,
    'snapshot', r.snapshot, 'savedAt', r.saved_at, 'savedBy', r.actor_id
  )
  FROM private.recipe_revisions r
  JOIN private.recipe_drafts d ON d.id = r.draft_id
  WHERE r.id = p_revision_id;
$$;

-- Frozen dependency facts plus the canonical token clients must echo back.
CREATE OR REPLACE FUNCTION public.admin_recipe_impact(p_recipe_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  usage jsonb;
  base jsonb;
  token text;
BEGIN
  PERFORM private.admin_assert('recipe.read', 'inspection');
  IF p_recipe_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.recipe_catalog WHERE id = p_recipe_id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  LOCK TABLE public.free_recipe_slots, public.collection_recipes, public.collection_releases,
    private.release_manifests, private.commercial_offers,
    private.purchase_orders, private.provider_payments,
    private.admin_campaign_snapshots IN SHARE MODE NOWAIT;
  usage := public.admin_recipe_usage(p_recipe_id);
  SELECT jsonb_build_object(
      'contentVersion', b.content_version,
      'activeHash', private.admin_active_hash(p_recipe_id)) INTO base
  FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id = c.id
  WHERE c.id = p_recipe_id;
  token := private.admin_snapshot_digest(jsonb_build_object(
    'recipe', p_recipe_id, 'base', base, 'usage', usage - 'checkedAt',
    'campaignRevision', (SELECT campaign_revision FROM private.admin_console_settings WHERE singleton)));
  RETURN jsonb_build_object('usage', usage, 'base', base, 'impactToken', token, 'checkedAt', now());
END $$;

REVOKE ALL ON FUNCTION public.admin_recipe_impact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recipe_impact(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_revision_publish(p_command jsonb) RETURNS jsonb
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
  pub text;
  live_offer boolean;
  pending_attempt boolean;
  historical_payment boolean;
  sealed_member boolean;
  usage jsonb;
  base jsonb;
  token text;
  snap_cfg jsonb;
  camp_rev text;
  camp_slugs text[];
  asset_check jsonb;
  obj_id uuid;
  obj_ver text;
  new_version int;
  first_publish boolean;
BEGIN
  actor := private.admin_assert('recipe.publish', 'publication');
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
  LOCK TABLE public.free_recipe_slots, public.collection_recipes, public.collection_releases,
    private.release_manifests, private.commercial_offers,
    private.purchase_orders, private.provider_payments,
    private.admin_campaign_snapshots IN SHARE MODE NOWAIT;
  PERFORM 1 FROM public.recipe_catalog WHERE id = cmd_recipe FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT * INTO head FROM private.recipe_drafts
    WHERE recipe_id = cmd_recipe AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected','published')
    ORDER BY CASE WHEN lifecycle = 'published' THEN 1 ELSE 0 END
    FOR UPDATE;
  IF head.id IS NULL OR head.current_revision_id IS DISTINCT FROM rev_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  receipt := private.admin_begin_operation(actor, op_id, 'revision.publish', cmd_recipe,
    jsonb_build_object('recipe_id', cmd_recipe, 'reason', reason, 'revision_id', rev_id,
      'expected_version', p_command->'expected_version', 'expected_digest', p_command->>'expected_digest',
      'base', p_command->'base', 'impact_token', p_command->>'impact_token'));
  IF receipt IS NOT NULL THEN
    PERFORM private.admin_assert('recipe.publish', 'publication');
    RETURN receipt;
  END IF;
  current := private.admin_revision_json(head.current_revision_id);
  IF (p_command->>'expected_version')::int IS DISTINCT FROM head.working_version
    OR (p_command->>'expected_digest') IS DISTINCT FROM (current->>'digest')
    OR private.admin_active_hash(cmd_recipe) IS DISTINCT FROM head.base_active_hash
    OR (p_command->'base'->>'active_hash') IS DISTINCT FROM head.base_active_hash THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ADM_CONFLICT';
  END IF;
  IF head.lifecycle <> 'approved' OR head.current_submission_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.recipe_review_decisions d
    WHERE d.submission_id = head.current_submission_id AND d.revision_id = rev_id
      AND d.digest = (current->>'digest') AND d.decision = 'approve') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  IF private.admin_unresolved_blockers(rev_id, current->>'digest') > 0 THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  candidate := current->'snapshot';
  IF candidate->'body' IS NULL OR (candidate->'body') = 'null'::jsonb
    OR (candidate->'body'->>'allergenReviewState') = 'unknown' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  SELECT jsonb_build_object('available', c.available, 'digest', c.digest,
      'object_id', c.object_id, 'object_version', c.object_version, 'checked_at', c.checked_at)
    INTO asset_check FROM private.recipe_asset_checks c
    WHERE c.revision_id = rev_id ORDER BY c.checked_at DESC, c.id DESC LIMIT 1;
  IF asset_check IS NULL
    OR (now() - (asset_check->>'checked_at')::timestamptz) > interval '60 seconds'
    OR (asset_check->>'digest') IS DISTINCT FROM (current->>'digest')
    OR NOT coalesce((asset_check->>'available')::boolean, false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  SELECT o.id, o.version INTO obj_id, obj_ver FROM storage.objects o
  WHERE o.id = (asset_check->>'object_id')::uuid FOR SHARE;
  IF NOT FOUND OR obj_ver IS DISTINCT FROM (asset_check->>'object_version') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  usage := public.admin_recipe_usage(cmd_recipe);
  SELECT jsonb_build_object(
      'contentVersion', b.content_version,
      'activeHash', private.admin_active_hash(cmd_recipe)) INTO base
  FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id = c.id
  WHERE c.id = cmd_recipe;
  usage := usage - 'checkedAt';
  SELECT campaign_revision INTO camp_rev FROM private.admin_console_settings WHERE singleton;
  SELECT configuration INTO snap_cfg FROM private.admin_campaign_snapshots
  WHERE deployment_revision = camp_rev;
  IF snap_cfg IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  SELECT array_agg(DISTINCT s) INTO camp_slugs FROM jsonb_array_elements_text(
    (SELECT jsonb_agg(DISTINCT r) FROM (
      SELECT jsonb_array_elements_text(camp->'recipeSlugs') AS r
      FROM jsonb_array_elements(coalesce(snap_cfg->'campaigns', '[]'::jsonb)) camp
    ) s)) s;
  token := private.admin_snapshot_digest(jsonb_build_object(
    'recipe', cmd_recipe, 'base', base, 'usage', usage, 'campaignRevision', camp_rev));
  IF (p_command->>'impact_token') IS DISTINCT FROM token THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ADM_CONFLICT';
  END IF;
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(usage->'releases', '[]'::jsonb)) r
      WHERE (r->>'liveOffer')::boolean) INTO live_offer;
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(usage->'releases', '[]'::jsonb)) r
      WHERE (r->>'pendingLiveAttempt')::boolean) INTO pending_attempt;
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(usage->'releases', '[]'::jsonb)) r
      WHERE (r->>'historicalLivePayment')::boolean) INTO historical_payment;
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(usage->'releases', '[]'::jsonb)) r
      WHERE (r->>'sealed')::boolean) INTO sealed_member;
  IF coalesce(live_offer, false) OR coalesce(pending_attempt, false)
    OR coalesce(historical_payment, false) OR coalesce(sealed_member, false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  IF camp_slugs IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.recipe_catalog c
    WHERE c.id = cmd_recipe AND camp_slugs @> ARRAY[c.slug]) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  INSERT INTO private.recipe_active_archives(recipe_id, catalog, body, image, publication_state,
      content_version, operation_id)
  SELECT c.id,
    jsonb_build_object('title', c.title, 'publicSummary', c.public_summary,
      'totalMinutes', c.total_minutes, 'mealLabels', c.meal_labels, 'dietLabels', c.diet_labels),
    to_jsonb(b.*), 
    jsonb_build_object('path', c.preview_image_path, 'alt', c.preview_image_alt,
      'description', c.preview_image_description),
    c.publication_state, b.content_version, op_id
  FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id = c.id
  WHERE c.id = cmd_recipe;
  SELECT publication_state = 'published' INTO first_publish
  FROM public.recipe_catalog WHERE id = cmd_recipe;
  first_publish := NOT first_publish;
  SELECT coalesce(content_version, 0) + 1 INTO new_version FROM public.recipe_bodies
  WHERE recipe_id = cmd_recipe;
  UPDATE public.recipe_bodies
  SET content_version = new_version,
    ingredients = candidate->'body'->'ingredients',
    instructions = candidate->'body'->'instructions',
    yield = candidate->'body'->>'yield',
    yield_structured = candidate->'body'->'yieldStructured',
    reviewed_notes = candidate->'body'->>'reviewedNotes',
    allergen_review_state = candidate->'body'->>'allergenReviewState',
    allergens = CASE WHEN candidate->'body'->'allergens' IS NULL
        OR candidate->'body'->'allergens' = 'null'::jsonb THEN NULL
      ELSE ARRAY(SELECT jsonb_array_elements_text(candidate->'body'->'allergens')) END,
    storage_notes = candidate->'body'->>'storageNotes',
    updated_at = now()
  WHERE recipe_id = cmd_recipe;
  UPDATE public.recipe_catalog
  SET title = candidate->'catalog'->>'title',
    public_summary = candidate->'catalog'->>'publicSummary',
    total_minutes = (candidate->'catalog'->>'totalMinutes')::int,
    meal_labels = ARRAY(SELECT jsonb_array_elements_text(candidate->'catalog'->'mealLabels')),
    diet_labels = ARRAY(SELECT jsonb_array_elements_text(candidate->'catalog'->'dietLabels')),
    preview_image_path = candidate->'image'->>'path',
    preview_image_alt = candidate->'image'->>'alt',
    preview_image_description = candidate->'image'->>'description',
    preview_image_object_id = (candidate->'image'->>'objectId')::uuid,
    preview_image_object_version = candidate->'image'->>'objectVersion',
    publication_state = 'published',
    published_at = CASE WHEN first_publish THEN now() ELSE published_at END,
    updated_at = now()
  WHERE id = cmd_recipe;
  INSERT INTO private.recipe_reviews(recipe_id, content_version, reviewer_kind, reviewer, verdict,
    open_blockers, admin_revision_id, reviewed_digest)
  SELECT cmd_recipe, new_version, 'human', actor::text, 'approve', 0, rev_id, current->>'digest';
  UPDATE private.recipe_drafts SET lifecycle = 'published', updated_by = actor WHERE id = head.id;
  SELECT publication_state INTO pub FROM public.recipe_catalog WHERE id = cmd_recipe;
  INSERT INTO private.admin_audit(actor_id, action, recipe_id, revision_id, digest, request_id, reason, result)
  VALUES (actor, 'recipe.publish', cmd_recipe, rev_id, current->>'digest', op_id, reason, 'success');
  receipt := jsonb_build_object('operationId', op_id, 'recipeId', cmd_recipe,
    'revisionId', rev_id, 'version', head.working_version, 'digest', current->>'digest',
    'noChange', false, 'committedAt', now(), 'publication', pub);
  PERFORM private.admin_finish_operation(actor, op_id, receipt);
  RETURN receipt;
END $$;

CREATE OR REPLACE FUNCTION public.admin_recipe_withdraw(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid;
  cmd_recipe uuid;
  op_id uuid;
  reason text;
  head private.recipe_drafts;
  receipt jsonb;
  pub text;
  usage jsonb;
  base jsonb;
  expected text;
  live_offer boolean;
  pending_attempt boolean;
  historical_payment boolean;
  sealed_member boolean;
  camp_refs boolean;
  is_owner boolean;
  can_emergency boolean;
  emergency boolean;
  ack boolean;
BEGIN
  actor := private.admin_assert('recipe.withdraw', 'publication');
  BEGIN
    cmd_recipe := (p_command->>'recipe_id')::uuid;
    op_id := (p_command->>'operation_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END;
  reason := p_command->>'reason';
  emergency := coalesce((p_command->>'emergency')::boolean, false);
  ack := coalesce((p_command->>'acknowledge_promise_impact')::boolean, false);
  IF cmd_recipe IS NULL OR op_id IS NULL
    OR length(trim(coalesce(reason, ''))) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  LOCK TABLE public.free_recipe_slots, public.collection_recipes, public.collection_releases,
    private.release_manifests, private.commercial_offers,
    private.purchase_orders, private.provider_payments,
    private.admin_campaign_snapshots IN SHARE MODE NOWAIT;
  PERFORM 1 FROM public.recipe_catalog WHERE id = cmd_recipe FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT * INTO head FROM private.recipe_drafts
    WHERE recipe_id = cmd_recipe AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected','published')
    ORDER BY CASE WHEN lifecycle = 'published' THEN 1 ELSE 0 END
    FOR UPDATE;
  receipt := private.admin_begin_operation(actor, op_id, 'recipe.withdraw', cmd_recipe,
    jsonb_build_object('recipe_id', cmd_recipe, 'reason', reason,
      'base', p_command->'base', 'emergency', emergency, 'acknowledge_promise_impact', ack));
  IF receipt IS NOT NULL THEN
    PERFORM private.admin_assert('recipe.withdraw', 'publication');
    RETURN receipt;
  END IF;
  SELECT jsonb_build_object(
      'contentVersion', b.content_version,
      'activeHash', private.admin_active_hash(cmd_recipe)) INTO base
  FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id = c.id
  WHERE c.id = cmd_recipe;
  IF (p_command->'base'->>'active_hash') IS DISTINCT FROM (base->>'activeHash') THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ADM_CONFLICT';
  END IF;
  usage := public.admin_recipe_usage(cmd_recipe);
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(usage->'releases', '[]'::jsonb)) r
      WHERE (r->>'liveOffer')::boolean) INTO live_offer;
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(usage->'releases', '[]'::jsonb)) r
      WHERE (r->>'pendingLiveAttempt')::boolean) INTO pending_attempt;
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(usage->'releases', '[]'::jsonb)) r
      WHERE (r->>'historicalLivePayment')::boolean) INTO historical_payment;
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(usage->'releases', '[]'::jsonb)) r
      WHERE (r->>'sealed')::boolean) INTO sealed_member;
  SELECT jsonb_array_length(coalesce(usage->'freeSlots', '[]'::jsonb)) > 0 INTO camp_refs;
  SELECT EXISTS (SELECT 1 FROM private.admin_memberships
    WHERE user_id = actor AND role = 'owner' AND active) INTO is_owner;
  SELECT EXISTS (SELECT 1 FROM private.admin_memberships
    WHERE user_id = actor AND active
      AND 'recipe.emergency_withdraw' = ANY (private.admin_permissions(role))) INTO can_emergency;
  SELECT publication_state INTO expected FROM public.recipe_catalog WHERE id = cmd_recipe;
  IF expected <> 'published' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF coalesce(live_offer, false) OR coalesce(pending_attempt, false)
    OR coalesce(historical_payment, false) OR coalesce(sealed_member, false) THEN
    IF NOT (is_owner AND emergency AND can_emergency) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
    END IF;
  ELSIF coalesce(camp_refs, false) AND NOT (is_owner AND (ack OR (emergency AND can_emergency))) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  INSERT INTO private.recipe_active_archives(recipe_id, catalog, body, image, publication_state,
      content_version, operation_id)
  SELECT c.id,
    jsonb_build_object('title', c.title, 'publicSummary', c.public_summary,
      'totalMinutes', c.total_minutes, 'mealLabels', c.meal_labels, 'dietLabels', c.diet_labels),
    to_jsonb(b.*),
    jsonb_build_object('path', c.preview_image_path, 'alt', c.preview_image_alt,
      'description', c.preview_image_description),
    c.publication_state, b.content_version, op_id
  FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id = c.id
  WHERE c.id = cmd_recipe;
  UPDATE public.recipe_catalog SET publication_state = 'withdrawn', updated_at = now()
  WHERE id = cmd_recipe;
  IF head.id IS NOT NULL AND head.lifecycle = 'published' THEN
    UPDATE private.recipe_drafts SET updated_by = actor WHERE id = head.id;
  END IF;
  SELECT publication_state INTO pub FROM public.recipe_catalog WHERE id = cmd_recipe;
  INSERT INTO private.admin_audit(actor_id, action, recipe_id, revision_id, digest, request_id, reason, result)
  VALUES (actor, CASE WHEN emergency THEN 'recipe.emergency_withdraw' ELSE 'recipe.withdraw' END,
    cmd_recipe, NULL, NULL, op_id, reason, 'success');
  receipt := jsonb_build_object('operationId', op_id, 'recipeId', cmd_recipe,
    'revisionId', NULL, 'version', 0, 'digest', base->>'activeHash',
    'noChange', false, 'committedAt', now(), 'publication', pub);
  PERFORM private.admin_finish_operation(actor, op_id, receipt);
  RETURN receipt;
END $$;

REVOKE ALL ON FUNCTION public.admin_recipe_impact(uuid), public.admin_revision_publish(jsonb),
  public.admin_recipe_withdraw(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revision_publish(jsonb),
  public.admin_recipe_withdraw(jsonb), public.admin_recipe_impact(uuid) TO authenticated;
