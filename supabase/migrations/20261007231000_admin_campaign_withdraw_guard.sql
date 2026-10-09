-- Trusted campaign usage and exact impact confirmation for withdrawal.
-- Accept the deployed Campaign.recipes shape and the compact operator snapshot.
-- An ambiguous or malformed member list is unavailable, never an empty promise.
CREATE OR REPLACE FUNCTION private.admin_campaign_recipe_slugs(p_campaign jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  item jsonb;
  slugs jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_typeof(p_campaign) <> 'object'
    OR jsonb_typeof(p_campaign->'slug') <> 'string'
    OR coalesce(p_campaign->>'status', 'published') NOT IN ('draft', 'published')
    OR (p_campaign ? 'recipeSlugs' AND p_campaign ? 'recipes') THEN
    RETURN NULL;
  END IF;
  IF jsonb_typeof(p_campaign->'recipeSlugs') = 'array' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(p_campaign->'recipeSlugs') LOOP
      IF jsonb_typeof(item) <> 'string' THEN RETURN NULL; END IF;
      slugs := slugs || jsonb_build_array(item);
    END LOOP;
  ELSIF jsonb_typeof(p_campaign->'recipes') = 'array' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(p_campaign->'recipes') LOOP
      IF jsonb_typeof(item) <> 'object' OR jsonb_typeof(item->'slug') <> 'string' THEN
        RETURN NULL;
      END IF;
      slugs := slugs || jsonb_build_array(item->'slug');
    END LOOP;
  ELSE
    RETURN NULL;
  END IF;
  RETURN slugs;
END $$;

REVOKE ALL ON FUNCTION private.admin_campaign_recipe_slugs(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_recipe_usage(p_recipe_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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
  PERFORM private.admin_assert('recipe.read', 'inspection');
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
  PERFORM set_config('lock_timeout', '5000', true);
  LOCK TABLE public.free_recipe_slots, public.collection_recipes, public.collection_releases,
    private.release_manifests, private.commercial_offers,
    private.purchase_orders, private.provider_payments,
    private.admin_campaign_snapshots, private.admin_console_settings IN SHARE MODE NOWAIT;
  usage := public.admin_recipe_usage(p_recipe_id);
  IF usage->>'sourceRevision' IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
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
  slot_refs boolean;
  token text;
  camp_rev text;
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
  receipt := private.admin_begin_operation(actor, op_id, 'recipe.withdraw', cmd_recipe,
    jsonb_build_object('recipe_id', cmd_recipe, 'reason', reason,
      'base', p_command->'base', 'impact_token', p_command->>'impact_token',
      'emergency', emergency, 'acknowledge_promise_impact', ack));
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
  IF usage->>'sourceRevision' IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
  END IF;
  SELECT campaign_revision INTO camp_rev FROM private.admin_console_settings WHERE singleton;
  token := private.admin_snapshot_digest(jsonb_build_object(
    'recipe', cmd_recipe, 'base', base, 'usage', usage - 'checkedAt',
    'campaignRevision', camp_rev));
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
  SELECT jsonb_array_length(coalesce(usage->'freeSlots', '[]'::jsonb)) > 0 INTO slot_refs;
  SELECT jsonb_array_length(coalesce(usage->'campaigns', '[]'::jsonb)) > 0 INTO camp_refs;
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
  ELSIF (coalesce(camp_refs, false) OR coalesce(slot_refs, false))
    AND NOT (is_owner AND (ack OR (emergency AND can_emergency))) THEN
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
