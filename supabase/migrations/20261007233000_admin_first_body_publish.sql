-- Bind publication to trusted usage and the exact checked image; insert the first body atomically.
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
  asset_check jsonb;
  obj_id uuid;
  obj_ver text;
  obj_name text;
  expected_name text;
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
  PERFORM set_config('lock_timeout', '5000', true);
  LOCK TABLE public.free_recipe_slots, public.collection_recipes, public.collection_releases,
    private.release_manifests, private.commercial_offers,
    private.purchase_orders, private.provider_payments,
    private.admin_campaign_snapshots, private.admin_console_settings IN SHARE MODE NOWAIT;
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
      'bucket_id', c.bucket_id, 'object_name', c.object_name,
      'object_id', c.object_id, 'object_version', c.object_version, 'checked_at', c.checked_at)
    INTO asset_check FROM private.recipe_asset_checks c
    WHERE c.revision_id = rev_id ORDER BY c.checked_at DESC, c.id DESC LIMIT 1;
  IF asset_check IS NULL
    OR (now() - (asset_check->>'checked_at')::timestamptz) > interval '60 seconds'
    OR (asset_check->>'digest') IS DISTINCT FROM (current->>'digest')
    OR NOT coalesce((asset_check->>'available')::boolean, false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  expected_name := private.admin_recipe_asset_name(candidate#>>'{image,path}');
  IF (asset_check->>'bucket_id') IS DISTINCT FROM 'recipe-previews'
    OR (asset_check->>'object_name') IS DISTINCT FROM expected_name THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  SELECT o.id, o.version, o.name INTO obj_id, obj_ver, obj_name FROM storage.objects o
  WHERE o.id = (asset_check->>'object_id')::uuid
    AND o.bucket_id = 'recipe-previews' AND o.name = expected_name FOR SHARE;
  IF NOT FOUND OR obj_ver IS DISTINCT FROM (asset_check->>'object_version')
    OR obj_name IS DISTINCT FROM expected_name THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  usage := public.admin_recipe_usage(cmd_recipe);
  IF usage->>'sourceRevision' IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
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
  IF jsonb_array_length(coalesce(usage->'campaigns', '[]'::jsonb)) > 0 THEN
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
  INSERT INTO public.recipe_bodies(recipe_id, content_version, ingredients, instructions, yield,
    yield_structured, reviewed_notes, allergen_review_state, allergens, storage_notes)
  VALUES (cmd_recipe, 1, candidate->'body'->'ingredients', candidate->'body'->'instructions',
    candidate->'body'->>'yield', candidate->'body'->'yieldStructured',
    candidate->'body'->>'reviewedNotes', candidate->'body'->>'allergenReviewState',
    CASE WHEN candidate->'body'->'allergens' IS NULL OR candidate->'body'->'allergens' = 'null'::jsonb
      THEN NULL ELSE ARRAY(SELECT jsonb_array_elements_text(candidate->'body'->'allergens')) END,
    candidate->'body'->>'storageNotes')
  ON CONFLICT (recipe_id) DO UPDATE SET
    content_version = public.recipe_bodies.content_version + 1,
    ingredients = EXCLUDED.ingredients, instructions = EXCLUDED.instructions,
    yield = EXCLUDED.yield, yield_structured = EXCLUDED.yield_structured,
    reviewed_notes = EXCLUDED.reviewed_notes, allergen_review_state = EXCLUDED.allergen_review_state,
    allergens = EXCLUDED.allergens, storage_notes = EXCLUDED.storage_notes,
    updated_at = now()
  RETURNING content_version INTO new_version;
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
