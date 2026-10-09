-- Phase 2: an exact, human-approved correction to a recipe that buyers already own. Ordinary publication
-- keeps Phase 1's commercial and sealed-release block; only this command passes it, and only for the same
-- recipe identity with an explicit acknowledgement of the global effect. Campaign protection still applies.
-- The correction changes the recipe's active content everywhere it is read. It never changes collection
-- membership, release manifests, offers, prices, sales switches, free slots or orders. Private collection
-- drafts that reference the previous version become stale through their recipe evidence and need review.

-- Archives keep the complete previous snapshot and who authorised the change. Earlier rows stay as written
-- (kind NULL): their missing fields are not reconstructed.
ALTER TABLE private.recipe_active_archives
 ADD COLUMN kind text CHECK (kind IS NULL OR kind IN ('publish','withdraw','correction')),
 ADD COLUMN snapshot jsonb,
 ADD COLUMN reason text,
 ADD COLUMN human_authoriser uuid REFERENCES auth.users(id),
 ADD COLUMN executor_id text,
 ADD COLUMN affected_releases jsonb;

-- Phase 1's recipe usage, without the signed-in check, so the restricted operator channel (Task 16) can
-- compute the same evidence. The browser read keeps its check and returns the same value.
CREATE FUNCTION private.recipe_usage(p_recipe_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  slots int[];
  rels jsonb;
  recipe_slug text;
  camp_rev text;
  camp_cfg jsonb;
  camps jsonb := '[]'::jsonb;
  source_rev text;
  campaign jsonb;
  campaign_slugs jsonb;
  valid_campaigns boolean := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.recipe_catalog WHERE id = p_recipe_id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT slug INTO recipe_slug FROM public.recipe_catalog WHERE id = p_recipe_id;
  SELECT coalesce(array_agg(s.slot ORDER BY s.slot), '{}') INTO slots
    FROM public.free_recipe_slots s WHERE s.recipe_id = p_recipe_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', rel.id, 'collectionId', rel.collection_id, 'title', col.title,
    'version', rel.version, 'state', rel.state,
    'sealed', rel.state IN ('sealed', 'retired'),
    'liveOffer', EXISTS (SELECT 1 FROM private.commercial_offers o
      WHERE o.release_id = rel.id AND o.provider_mode = 'live' AND o.sale_enabled),
    'pendingLiveAttempt', EXISTS (SELECT 1 FROM private.purchase_orders po
      JOIN private.commercial_offers o ON o.id = po.offer_id
      WHERE po.release_id = rel.id AND o.provider_mode = 'live'
        AND po.attempt_state IN ('creating', 'creation_unknown', 'open', 'processing', 'review')),
    'historicalLivePayment', EXISTS (SELECT 1 FROM private.provider_payments pay
      JOIN private.purchase_orders po ON po.id = pay.order_id
      JOIN private.commercial_offers o ON o.id = po.offer_id
      WHERE po.release_id = rel.id AND o.provider_mode = 'live' AND pay.captured_amount > 0),
    'testActivity', EXISTS (SELECT 1 FROM private.purchase_orders po
      JOIN private.commercial_offers o ON o.id = po.offer_id
      WHERE po.release_id = rel.id AND o.provider_mode = 'test'))
    ORDER BY col.title, rel.version), '[]'::jsonb)
    INTO rels
    FROM public.collection_recipes cr
    JOIN public.collection_releases rel ON rel.id = cr.release_id
    JOIN public.recipe_collections col ON col.id = rel.collection_id
    WHERE cr.recipe_id = p_recipe_id;
  SELECT s.campaign_revision, a.configuration INTO camp_rev, camp_cfg
  FROM private.admin_console_settings s
  LEFT JOIN private.admin_campaign_snapshots a
    ON a.deployment_revision = s.campaign_revision
  WHERE s.singleton;
  IF camp_rev IS NOT NULL AND jsonb_typeof(camp_cfg) = 'object' THEN
    IF jsonb_typeof(camp_cfg->'campaigns') = 'array' THEN
      valid_campaigns := true;
      FOR campaign IN SELECT value FROM jsonb_array_elements(camp_cfg->'campaigns') LOOP
        campaign_slugs := private.admin_campaign_recipe_slugs(campaign);
        IF campaign_slugs IS NULL THEN
          valid_campaigns := false;
          EXIT;
        END IF;
        IF coalesce(campaign->>'status', 'published') = 'published'
          AND campaign_slugs ? recipe_slug THEN
          camps := camps || jsonb_build_array(jsonb_build_object(
            'slug', campaign->>'slug', 'status', 'published',
            'recipeSlugs', campaign_slugs,
            'promisedCount', jsonb_array_length(campaign_slugs),
            'deploymentRevision', camp_rev));
        END IF;
      END LOOP;
      IF valid_campaigns THEN
        source_rev := camp_rev;
      ELSE
        camps := '[]'::jsonb;
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object(
    'checkedAt', now(),
    'sourceRevision', source_rev,
    'freeSlots', to_jsonb(slots),
    'releases', rels,
    'campaigns', camps
  );
END $$;

CREATE OR REPLACE FUNCTION public.admin_recipe_usage(p_recipe_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.admin_assert('recipe.read', 'inspection');
  RETURN private.recipe_usage(p_recipe_id);
END $$;

-- Collections that use a recipe: any release, the current publication or an open draft. UUID order is
-- the shared lock order.
CREATE FUNCTION private.recipe_collection_ids(p_recipe_id uuid) RETURNS uuid[]
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(array_agg(DISTINCT x.id ORDER BY x.id),'{}') FROM (
  SELECT r.collection_id id FROM public.collection_releases r
  JOIN public.collection_recipes cr ON cr.release_id=r.id WHERE cr.recipe_id=p_recipe_id
  UNION
  SELECT a.collection_id FROM private.collection_active_publications a
  JOIN private.collection_publications p ON p.id=a.publication_id
  WHERE p.snapshot->'members' @> jsonb_build_array(jsonb_build_object('recipeId',p_recipe_id::text))
  UNION
  SELECT h.collection_id FROM private.collection_draft_heads h
  JOIN private.collection_revisions rv ON rv.id=h.revision_id
  WHERE rv.snapshot->'members' @> jsonb_build_array(jsonb_build_object('recipeId',p_recipe_id::text))) x
$$;

-- The collections a correction reaches, for the decision page: releases holding the recipe and any open
-- private draft that will need its recipe reference updated and a new review.
CREATE FUNCTION public.admin_recipe_correction_impact(p_recipe_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.admin_assert('recipe.read','inspection');
 IF p_recipe_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 RETURN jsonb_build_object('checkedAt',now(),'collections',coalesce((SELECT jsonb_agg(jsonb_build_object(
   'collectionId',c.id,'slug',c.slug,'title',c.title,
   'releases',coalesce((SELECT jsonb_agg(jsonb_build_object('version',r.version,'state',r.state) ORDER BY r.version)
     FROM public.collection_releases r JOIN public.collection_recipes cr ON cr.release_id=r.id
     WHERE r.collection_id=c.id AND cr.recipe_id=p_recipe_id),'[]'::jsonb),
   'draft',(SELECT jsonb_build_object('state',h.state,'version',h.version) FROM private.collection_draft_heads h
     JOIN private.collection_revisions rv ON rv.id=h.revision_id
     WHERE h.collection_id=c.id
       AND rv.snapshot->'members' @> jsonb_build_array(jsonb_build_object('recipeId',p_recipe_id::text))))
   ORDER BY c.title, c.id)
  FROM public.recipe_collections c WHERE c.id = ANY(private.recipe_collection_ids(p_recipe_id))),'[]'::jsonb));
END $$;

-- Shared core for the browser command and, later, the restricted operator channel. The caller has already
-- verified the human's authority; p_context carries the human authoriser and the executor.
CREATE FUNCTION private.recipe_correct_core(p_context jsonb, p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE
 actor uuid := (p_context->>'human_authoriser')::uuid;
 executor text := p_context->>'executor_id';
 operator_run boolean := coalesce(p_context->>'executor_type','human') = 'operator';
 cmd_recipe uuid; op_id uuid; rev_id uuid; reason text;
 head private.recipe_drafts; current jsonb; candidate jsonb; receipt jsonb; pub text; pub_before text;
 usage jsonb; base jsonb; token text; snap_cfg jsonb; camp_rev text; asset_check jsonb;
 obj_id uuid; obj_ver text; obj_name text; expected_name text; old_version int; new_version int;
BEGIN
 BEGIN
  cmd_recipe := (p_command->>'recipe_id')::uuid;
  op_id := (p_command->>'operation_id')::uuid;
  rev_id := (p_command->>'revision_id')::uuid;
 EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END;
 reason := p_command->>'reason';
 IF actor IS NULL OR cmd_recipe IS NULL OR op_id IS NULL OR rev_id IS NULL
  OR length(trim(coalesce(reason,''))) NOT BETWEEN 1 AND 1000
  OR (p_command->>'correction_kind') IS DISTINCT FROM 'same_recipe'
  OR (p_command->'acknowledge_global_impact') IS DISTINCT FROM 'true'::jsonb THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 PERFORM set_config('lock_timeout','5000',true);
 -- Lock order shared with collection publication and checkout: collections (UUID order), then the recipe.
 PERFORM 1 FROM public.recipe_collections WHERE id = ANY(private.recipe_collection_ids(cmd_recipe)) ORDER BY id FOR UPDATE;
 -- Freeze the commercial evidence the impact token describes, as ordinary publication does.
 LOCK TABLE public.free_recipe_slots, public.collection_recipes, public.collection_releases,
  private.release_manifests, private.commercial_offers, private.purchase_orders, private.provider_payments,
  private.admin_campaign_snapshots, private.admin_console_settings IN SHARE MODE NOWAIT;
 SELECT publication_state INTO pub_before FROM public.recipe_catalog WHERE id=cmd_recipe FOR UPDATE;
 -- A correction changes a recipe that has been public; a never-published recipe uses ordinary publication.
 IF NOT FOUND OR pub_before NOT IN ('published','withdrawn') THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 -- A replay of a committed operation returns its receipt before anything else is compared. Browser runs use
 -- Phase 1's ledger (keyed by the signed-in human); operator runs use the executor-keyed collection ledger.
 receipt := jsonb_build_object('recipe_id',cmd_recipe,'reason',reason,'revision_id',rev_id,
   'expected_version',p_command->'expected_version','expected_digest',p_command->>'expected_digest',
   'base',p_command->'base','impact_token',p_command->>'impact_token','correction_kind','same_recipe',
   'acknowledge_global_impact',true,'executor_id',executor);
 receipt := CASE WHEN operator_run THEN private.collection_begin_operation(executor, op_id, 'recipe.correct', NULL, receipt)
   ELSE private.admin_begin_operation(actor, op_id, 'recipe.correct', cmd_recipe, receipt) END;
 IF receipt IS NOT NULL THEN RETURN receipt; END IF;
 SELECT * INTO head FROM private.recipe_drafts
  WHERE recipe_id=cmd_recipe AND workflow_schema=1
    AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected')
  FOR UPDATE;
 IF head.id IS NULL OR head.current_revision_id IS DISTINCT FROM rev_id THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;

 current := private.admin_revision_json(head.current_revision_id);
 IF (p_command->>'expected_version')::int IS DISTINCT FROM head.working_version
  OR (p_command->>'expected_digest') IS DISTINCT FROM (current->>'digest')
  OR private.admin_active_hash(cmd_recipe) IS DISTINCT FROM head.base_active_hash
  OR (p_command->'base'->>'active_hash') IS DISTINCT FROM head.base_active_hash THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 -- Exact human approval of this revision and digest, with no open blocker.
 IF head.lifecycle <> 'approved' OR head.current_submission_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM private.recipe_review_decisions d
   WHERE d.submission_id=head.current_submission_id AND d.revision_id=rev_id
     AND d.digest=(current->>'digest') AND d.decision='approve')
  OR private.admin_unresolved_blockers(rev_id, current->>'digest') > 0 THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;
 candidate := current->'snapshot';
 -- Same recipe identity only; a replacement is a new recipe, never a correction.
 IF candidate->>'recipeId' IS DISTINCT FROM cmd_recipe::text
  OR candidate->>'slug' IS DISTINCT FROM (SELECT slug FROM public.recipe_catalog WHERE id=cmd_recipe) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;
 IF candidate->'body' IS NULL OR (candidate->'body')='null'::jsonb
  OR (candidate->'body'->>'allergenReviewState')='unknown' THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;
 SELECT jsonb_build_object('available',c.available,'digest',c.digest,'bucket_id',c.bucket_id,'object_name',c.object_name,
   'object_id',c.object_id,'object_version',c.object_version,'checked_at',c.checked_at)
  INTO asset_check FROM private.recipe_asset_checks c
  WHERE c.revision_id=rev_id ORDER BY c.checked_at DESC, c.id DESC LIMIT 1;
 IF asset_check IS NULL OR (now()-(asset_check->>'checked_at')::timestamptz) > interval '60 seconds'
  OR (asset_check->>'digest') IS DISTINCT FROM (current->>'digest')
  OR NOT coalesce((asset_check->>'available')::boolean,false) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;
 expected_name := private.admin_recipe_asset_name(candidate#>>'{image,path}');
 IF (asset_check->>'bucket_id') IS DISTINCT FROM 'recipe-previews'
  OR (asset_check->>'object_name') IS DISTINCT FROM expected_name THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;
 SELECT o.id, o.version, o.name INTO obj_id, obj_ver, obj_name FROM storage.objects o
 WHERE o.id=(asset_check->>'object_id')::uuid AND o.bucket_id='recipe-previews' AND o.name=expected_name FOR SHARE;
 IF NOT FOUND OR obj_ver IS DISTINCT FROM (asset_check->>'object_version') OR obj_name IS DISTINCT FROM expected_name THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;

 -- The same impact evidence and token as ordinary publication.
 usage := private.recipe_usage(cmd_recipe);
 IF usage->>'sourceRevision' IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED'; END IF;
 SELECT jsonb_build_object('contentVersion',b.content_version,'activeHash',private.admin_active_hash(cmd_recipe)), b.content_version
  INTO base, old_version
 FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id=c.id WHERE c.id=cmd_recipe;
 usage := usage - 'checkedAt';
 SELECT campaign_revision INTO camp_rev FROM private.admin_console_settings WHERE singleton;
 SELECT configuration INTO snap_cfg FROM private.admin_campaign_snapshots WHERE deployment_revision=camp_rev;
 IF snap_cfg IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED'; END IF;
 token := private.admin_snapshot_digest(jsonb_build_object('recipe',cmd_recipe,'base',base,'usage',usage,'campaignRevision',camp_rev));
 IF (p_command->>'impact_token') IS DISTINCT FROM token THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 -- Campaign promises keep their Phase 1 protection; the commercial block is what this command replaces.
 IF jsonb_array_length(coalesce(usage->'campaigns','[]'::jsonb)) > 0 THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;

 INSERT INTO private.recipe_active_archives(recipe_id, catalog, body, image, publication_state, content_version, operation_id,
   kind, snapshot, reason, human_authoriser, executor_id, affected_releases)
 SELECT c.id,
  jsonb_build_object('title',c.title,'publicSummary',c.public_summary,'totalMinutes',c.total_minutes,
   'mealLabels',c.meal_labels,'dietLabels',c.diet_labels),
  to_jsonb(b.*),
  jsonb_build_object('path',c.preview_image_path,'alt',c.preview_image_alt,'description',c.preview_image_description,
   'objectId',c.preview_image_object_id,'objectVersion',c.preview_image_object_version),
  c.publication_state, b.content_version, op_id,
  'correction', private.admin_snapshot(cmd_recipe), reason, actor, executor, coalesce(usage->'releases','[]'::jsonb)
 FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id=c.id WHERE c.id=cmd_recipe;

 UPDATE public.recipe_bodies SET content_version=content_version+1,
  ingredients=candidate->'body'->'ingredients', instructions=candidate->'body'->'instructions',
  yield=candidate->'body'->>'yield', yield_structured=candidate->'body'->'yieldStructured',
  reviewed_notes=candidate->'body'->>'reviewedNotes', allergen_review_state=candidate->'body'->>'allergenReviewState',
  allergens=CASE WHEN candidate->'body'->'allergens' IS NULL OR candidate->'body'->'allergens'='null'::jsonb
   THEN NULL ELSE ARRAY(SELECT jsonb_array_elements_text(candidate->'body'->'allergens')) END,
  storage_notes=candidate->'body'->>'storageNotes', updated_at=now()
 WHERE recipe_id=cmd_recipe RETURNING content_version INTO new_version;
 IF new_version IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED'; END IF;
 -- The recipe review row keeps the new version reviewed before the catalog becomes published again.
 INSERT INTO private.recipe_reviews(recipe_id, content_version, reviewer_kind, reviewer, verdict, open_blockers,
  admin_revision_id, reviewed_digest)
 VALUES (cmd_recipe, new_version, 'human', actor::text, 'approve', 0, rev_id, current->>'digest');
 UPDATE public.recipe_catalog SET title=candidate->'catalog'->>'title',
  public_summary=candidate->'catalog'->>'publicSummary', total_minutes=(candidate->'catalog'->>'totalMinutes')::int,
  meal_labels=ARRAY(SELECT jsonb_array_elements_text(candidate->'catalog'->'mealLabels')),
  diet_labels=ARRAY(SELECT jsonb_array_elements_text(candidate->'catalog'->'dietLabels')),
  preview_image_path=candidate->'image'->>'path', preview_image_alt=candidate->'image'->>'alt',
  preview_image_description=candidate->'image'->>'description',
  preview_image_object_id=(candidate->'image'->>'objectId')::uuid,
  preview_image_object_version=candidate->'image'->>'objectVersion',
  publication_state='published', updated_at=now()
 WHERE id=cmd_recipe;
 UPDATE private.recipe_drafts SET lifecycle='published', updated_by=actor WHERE id=head.id;
 SELECT publication_state INTO pub FROM public.recipe_catalog WHERE id=cmd_recipe;
 INSERT INTO private.admin_audit(actor_id, action, recipe_id, revision_id, digest, before_ref, after_ref, request_id, reason, result)
 VALUES (actor, 'recipe.correct', cmd_recipe, rev_id, current->>'digest', old_version::text, new_version::text, op_id, reason, 'success');
 receipt := jsonb_build_object('operationId',op_id,'recipeId',cmd_recipe,'revisionId',rev_id,'version',head.working_version,
  'digest',current->>'digest','noChange',false,'committedAt',now(),'publication',pub);
 IF operator_run THEN PERFORM private.collection_finish_operation(executor, op_id, receipt);
 ELSE PERFORM private.admin_finish_operation(actor, op_id, receipt);
 END IF;
 RETURN receipt;
END $$;

-- Browser entry point: the verified caller with publish authority in the publication stage.
CREATE FUNCTION public.admin_recipe_correct(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid;
BEGIN
 actor := private.admin_assert('recipe.publish','publication');
 RETURN private.recipe_correct_core(jsonb_build_object('human_authoriser',actor,'executor_id',actor::text,
  'executor_type','human','attestation_id',null), p_command);
END $$;

-- Corrections are publication receipts too.
CREATE OR REPLACE FUNCTION public.admin_recipe_operations(p_recipe_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid;
  receipts jsonb;
BEGIN
  actor := private.admin_assert('recipe.read', 'inspection');
  IF p_recipe_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'operationId', recent.operation_id,
    'recipeId', recent.target,
    'action', recent.action,
    'revisionId', recent.result->'revisionId',
    'version', recent.result->'version',
    'digest', recent.result->'digest',
    'noChange', recent.result->'noChange',
    'committedAt', recent.committed_at,
    'publication', recent.result->'publication'
  ) ORDER BY recent.committed_at DESC, recent.operation_id DESC), '[]'::jsonb)
  INTO receipts
  FROM (
    SELECT operation_id, target, action, result, committed_at
    FROM private.admin_operations
    WHERE actor_id = actor
      AND target = p_recipe_id
      AND action IN ('revision.publish', 'recipe.withdraw', 'recipe.correct')
      AND result IS NOT NULL
      AND committed_at IS NOT NULL
    ORDER BY committed_at DESC, operation_id DESC
    LIMIT 10
  ) recent;
  RETURN receipts;
END $$;

REVOKE ALL ON FUNCTION private.recipe_usage(uuid), private.recipe_collection_ids(uuid), private.recipe_correct_core(jsonb,jsonb)
 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_recipe_correct(jsonb), public.admin_recipe_correction_impact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recipe_correct(jsonb), public.admin_recipe_correction_impact(uuid) TO authenticated;
