-- Phase 2: protected members, impact evidence and readiness for an exact draft revision.
-- Checks are pass / fail / unknown with blocker or suggestion severity. Unknown evidence blocks
-- publication; it is never shown as zero or as a pass. The impact token binds the material evidence
-- (candidate, base, recipe versions, protected set, series, campaign revision, commercial exposure),
-- not informational buyer counts.

-- A release's recipes are protected when buyers hold or held a real promise:
-- sealed/retired release, a verified live payment (kept after refunds), an unresolved live checkout,
-- an enabled live offer, access granted outside test checkouts, or access that cannot be classified.
-- Test-mode orders alone never protect a recipe. Members come from release rows and immutable manifests.
CREATE OR REPLACE FUNCTION private.collection_protected_members(p_collection_id uuid) RETURNS TABLE(recipe_id uuid)
LANGUAGE sql STABLE SET search_path='' AS $$
 WITH committed AS (
  SELECT r.id FROM public.collection_releases r
  WHERE r.collection_id=p_collection_id AND (
   r.state IN ('sealed','retired')
   OR EXISTS(SELECT 1 FROM private.purchase_orders po JOIN private.commercial_offers o ON o.id=po.offer_id
     WHERE po.release_id=r.id AND o.provider_mode='live' AND (
       po.attempt_state IN ('creating','creation_unknown','open','processing','review')
       OR EXISTS(SELECT 1 FROM private.provider_payments p WHERE p.order_id=po.id AND p.provider_mode='live')))
   OR EXISTS(SELECT 1 FROM private.commercial_offers o WHERE o.release_id=r.id AND o.sale_enabled AND o.provider_mode='live')
   OR EXISTS(SELECT 1 FROM private.access_sources s WHERE s.release_id=r.id AND (
     s.source_kind IN ('native_legacy','support_grant','promotional')
     OR NOT EXISTS(SELECT 1 FROM private.purchase_orders po JOIN private.commercial_offers o ON o.id=po.offer_id
       WHERE po.id::text=s.source_id AND o.provider_mode='test')))
   OR EXISTS(SELECT 1 FROM public.access_entitlements e WHERE e.release_id=r.id
     AND NOT EXISTS(SELECT 1 FROM private.access_sources s WHERE s.release_id=e.release_id AND s.user_id=e.user_id))))
 SELECT DISTINCT cr.recipe_id FROM public.collection_recipes cr JOIN committed c ON c.id=cr.release_id
 UNION
 SELECT DISTINCT unnest(m.member_recipe_ids) FROM private.release_manifests m JOIN committed c ON c.id=m.release_id
$$;

CREATE FUNCTION private.collection_check(p_code text, p_scope text, p_state text, p_severity text, p_explanation text,
  p_origin text DEFAULT 'validation') RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_build_object('code',p_code,'scope',p_scope,'state',p_state,'severity',p_severity,
   'explanation',p_explanation,'origin',p_origin)
$$;

-- Evaluate one revision. Returns {ok:true,value:CollectionImpact}; lookups that fail become unknown checks.
CREATE FUNCTION private.collection_evaluate(p_collection_id uuid, p_revision_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE
 rev private.collection_revisions; head private.collection_draft_heads; snap jsonb; checks jsonb := '[]'::jsonb;
 protected uuid[]; m jsonb; recipe record; base jsonb; camp_rev text; camp_cfg jsonb; campaigns jsonb := '[]'::jsonb;
 exposure jsonb; member_evidence jsonb := '[]'::jsonb; series_owner uuid; evidence jsonb; summary jsonb;
 unverified int := 0; blocked int := 0;
BEGIN
 SELECT * INTO rev FROM private.collection_revisions WHERE id=p_revision_id AND collection_id=p_collection_id;
 IF rev.id IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 SELECT * INTO head FROM private.collection_draft_heads WHERE collection_id=p_collection_id;
 snap := rev.snapshot;
 base := private.collection_active_base(p_collection_id);
 SELECT coalesce(array_agg(recipe_id ORDER BY recipe_id), '{}') INTO protected FROM private.collection_protected_members(p_collection_id);

 checks := checks || private.collection_check('CANDIDATE_CURRENT','revision',
   CASE WHEN head.revision_id=rev.id THEN 'pass' ELSE 'fail' END,'blocker',
   CASE WHEN head.revision_id=rev.id THEN 'This is the current private draft.' ELSE 'A newer draft exists. Review that one instead.' END);
 checks := checks || private.collection_check('BASE_CURRENT','revision',
   CASE WHEN (base->>'publicationId') IS NOT DISTINCT FROM rev.base_publication_id::text THEN 'pass' ELSE 'fail' END,'blocker',
   CASE WHEN (base->>'publicationId') IS NOT DISTINCT FROM rev.base_publication_id::text
     THEN 'The draft is based on what is live now.' ELSE 'The live collection changed after this draft started. Move the draft onto it first.' END);
 checks := checks || private.collection_check('PROTECTED_KEPT','members',
   CASE WHEN NOT EXISTS(SELECT 1 FROM unnest(protected) p WHERE NOT EXISTS(
     SELECT 1 FROM jsonb_array_elements(snap->'members') x WHERE (x->>'recipeId')::uuid=p)) THEN 'pass' ELSE 'fail' END,'blocker',
   'Every recipe buyers already received stays in the collection.');

 FOR m IN SELECT value FROM jsonb_array_elements(snap->'members') LOOP
  SELECT c.id, c.slug, c.title, b.content_version, private.admin_active_hash(c.id) active_hash,
    (b.recipe_id IS NOT NULL AND private.recipe_is_reviewed(c.id)) reviewed
   INTO recipe FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id=c.id WHERE c.id=(m->>'recipeId')::uuid;
  IF recipe.id IS NULL THEN
   checks := checks || private.collection_check('RECIPE_MISSING',m->>'recipeSlug','fail','blocker',
     format('%s is no longer in the recipe catalog.', m->>'recipeSlug'),'source');
   CONTINUE;
  END IF;
  IF NOT recipe.reviewed THEN
   checks := checks || private.collection_check('RECIPE_REVIEWED',recipe.slug,'fail','blocker',
     format('%s has not been editorially reviewed. Review it in Recipes first.', recipe.title),'source');
  END IF;
  IF recipe.active_hash IS DISTINCT FROM m->>'reviewDigest' OR recipe.content_version IS DISTINCT FROM (m->>'contentVersion')::int THEN
   checks := checks || private.collection_check('RECIPE_CURRENT',recipe.slug,'fail','blocker',
     format('%s changed after it was added. Update the recipe references in the draft.', recipe.title),'source');
  END IF;
  IF m->>'fit' = 'blocked' THEN blocked := blocked + 1; ELSIF m->>'fit' <> 'accepted' THEN unverified := unverified + 1; END IF;
  member_evidence := member_evidence || jsonb_build_object('recipeId',recipe.id,'activeHash',recipe.active_hash,
    'contentVersion',recipe.content_version,'reviewed',recipe.reviewed);
 END LOOP;
 checks := checks || private.collection_check('MEMBER_FIT','members',
   CASE WHEN blocked > 0 OR unverified > 0 THEN 'fail' ELSE 'pass' END,'blocker',
   CASE WHEN blocked > 0 THEN format('%s marked as not fitting. Remove them or change the decision.', blocked)
     WHEN unverified > 0 THEN format('Confirm that %s %s belong here.', unverified, CASE WHEN unverified=1 THEN 'recipe' ELSE 'recipes' END)
     ELSE 'Every recipe has been confirmed for this collection.' END,'human');

 IF snap->'series' <> 'null'::jsonb THEN
  SELECT a.collection_id INTO series_owner FROM private.collection_active_publications a
   WHERE a.series_key=snap#>>'{series,key}' AND a.series_volume=(snap#>>'{series,volume}')::int AND a.collection_id<>p_collection_id;
  checks := checks || private.collection_check('SERIES_VOLUME','series',CASE WHEN series_owner IS NULL THEN 'pass' ELSE 'fail' END,
   'blocker',CASE WHEN series_owner IS NULL THEN 'The series volume is free.' ELSE 'Another published collection already uses this series volume.' END);
 END IF;

 -- Campaign promises come from the recorded deployment snapshot; without it the effect is unknown.
 SELECT campaign_revision INTO camp_rev FROM private.admin_console_settings WHERE singleton;
 SELECT configuration INTO camp_cfg FROM private.admin_campaign_snapshots WHERE deployment_revision=camp_rev;
 IF camp_cfg IS NULL THEN
  checks := checks || private.collection_check('SOURCE_UNAVAILABLE','campaigns','unknown','blocker',
    'Campaign promises for this deployment are not recorded, so their effect is unknown. Record them before publication.','source');
 ELSE
  SELECT coalesce(jsonb_agg(DISTINCT camp->>'slug'),'[]'::jsonb) INTO campaigns
  FROM jsonb_array_elements(coalesce(camp_cfg->'campaigns','[]'::jsonb)) camp
  WHERE EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(private.admin_campaign_recipe_slugs(camp),'[]'::jsonb)) s
    WHERE s IN (SELECT x->>'recipeSlug' FROM jsonb_array_elements(snap->'members') x));
  checks := checks || private.collection_check('CAMPAIGNS_CHECKED','campaigns','pass','suggestion',
    format('%s %s recipes from this collection.', jsonb_array_length(campaigns),
      CASE WHEN jsonb_array_length(campaigns)=1 THEN 'campaign promises' ELSE 'campaigns promise' END),'source');
 END IF;

 WITH releases AS (SELECT id FROM public.collection_releases WHERE collection_id=p_collection_id)
 SELECT jsonb_build_object(
   'offers',coalesce((SELECT jsonb_agg(jsonb_build_object('id',o.id,'mode',o.provider_mode,'saleEnabled',o.sale_enabled,
     'releaseId',o.release_id) ORDER BY o.id) FROM private.commercial_offers o JOIN releases r ON r.id=o.release_id),'[]'::jsonb),
   'unresolvedLive',(SELECT count(*) FROM private.purchase_orders po JOIN releases r ON r.id=po.release_id
     JOIN private.commercial_offers o ON o.id=po.offer_id
     WHERE o.provider_mode='live' AND po.attempt_state IN ('creating','creation_unknown','open','processing','review')),
   'testActivity',EXISTS(SELECT 1 FROM private.purchase_orders po JOIN releases r ON r.id=po.release_id
     JOIN private.commercial_offers o ON o.id=po.offer_id WHERE o.provider_mode='test'))
 INTO exposure;
 IF (exposure->>'testActivity')::boolean THEN
  checks := checks || private.collection_check('TEST_ACTIVITY','commerce','pass','suggestion',
    'Test checkouts exist. They are not real purchases and do not protect any recipe.','source');
 END IF;

 evidence := jsonb_build_object('collectionId',p_collection_id,'revisionId',rev.id,'digest',rev.digest,
   'base',jsonb_build_object('publicationId',rev.base_publication_id,'digest',rev.base_digest),'activeBase',base,
   'protected',to_jsonb(protected),'members',member_evidence,'seriesOwner',series_owner,'campaignRevision',camp_rev,
   'campaigns',campaigns,'exposure',exposure);
 summary := jsonb_build_object(
  'token',private.collection_digest(evidence),'checkedAt',now(),'sourceRevision',coalesce(base->>'publicationId','none'),
  'protectedRecipeIds',to_jsonb(protected),
  'eligibleBuyerCount',(SELECT count(DISTINCT e.user_id) FROM public.access_entitlements e
     JOIN public.collection_releases r ON r.id=e.release_id
     WHERE r.collection_id=p_collection_id AND e.state='active' AND e.revoked_at IS NULL AND e.valid_from<=now()
       AND (e.expires_at IS NULL OR e.expires_at>now())),
  'pendingLiveCount',(exposure->>'unresolvedLive')::int,
  'offerIds',coalesce((SELECT jsonb_agg(o->'id') FROM jsonb_array_elements(exposure->'offers') o),'[]'::jsonb),
  'affectedCampaignSlugs',campaigns,
  'checks',checks);
 RETURN jsonb_build_object('ok',true,'value',summary);
EXCEPTION WHEN query_canceled OR lock_not_available THEN
 RETURN jsonb_build_object('ok',false,'code','UNAVAILABLE','reference','collection-impact-'||left(md5(clock_timestamp()::text),8));
END $$;

CREATE FUNCTION private.collection_readiness(p_digest text, p_impact jsonb, p_state text) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 WITH c AS (SELECT CASE WHEN (p_impact->>'ok')::boolean THEN p_impact#>'{value,checks}'
   ELSE jsonb_build_array(private.collection_check('SOURCE_UNAVAILABLE','impact','unknown','blocker',
     'Buyer and dependency evidence could not be checked. Retry before review or publication.','source')) END checks)
 SELECT jsonb_build_object('digest',p_digest,'checks',c.checks,
  'readyForApproval',NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c.checks) x WHERE x->>'severity'='blocker' AND x->>'state'<>'pass'),
  'readyToPublish',p_state='approved' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c.checks) x WHERE x->>'severity'='blocker' AND x->>'state'<>'pass'),
  'needsVerification',EXISTS(SELECT 1 FROM jsonb_array_elements(c.checks) x WHERE x->>'state'='unknown'))
 FROM c
$$;

CREATE FUNCTION public.admin_collection_impact(p_collection_id uuid, p_revision_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.collection_assert('collection.read','inspection');
 RETURN private.collection_evaluate(p_collection_id, p_revision_id);
END $$;

-- Detail now carries evaluated readiness and impact for the open draft, and richer recipe summaries
-- for the private preview.
CREATE OR REPLACE FUNCTION public.admin_collection_detail(p_collection_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE published jsonb; working jsonb; published_digest text; working_digest text; working_id uuid; working_state text;
 history jsonb; impact jsonb;
BEGIN
 PERFORM private.collection_assert('collection.read','inspection');
 IF NOT EXISTS(SELECT 1 FROM public.recipe_collections WHERE id=p_collection_id) THEN
  RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND';
 END IF;
 SELECT jsonb_build_object('publicationId',p.id,'releaseId',p.release_id,'snapshot',p.snapshot), p.digest
  INTO published, published_digest
  FROM private.collection_active_publications a JOIN private.collection_publications p ON p.id=a.publication_id
  WHERE a.collection_id=p_collection_id;
 SELECT private.collection_revision_json(h.revision_id), r.digest, r.id, h.state INTO working, working_digest, working_id, working_state
  FROM private.collection_draft_heads h JOIN private.collection_revisions r ON r.id=h.revision_id
  WHERE h.collection_id=p_collection_id;
 history := public.admin_collection_history(p_collection_id,NULL);
 impact := CASE WHEN working_id IS NULL THEN private.collection_impact(p_collection_id)
   ELSE private.collection_evaluate(p_collection_id, working_id) END;
 RETURN jsonb_build_object(
  'collectionId',p_collection_id,
  'identity',(SELECT jsonb_build_object('slug',slug,'title',title) FROM public.recipe_collections WHERE id=p_collection_id),
  'sourceMode',coalesce((SELECT source_mode FROM private.collection_sources WHERE collection_id=p_collection_id),'legacy'),
  'commerceState',private.collection_commerce_state(p_collection_id),
  'published',published,
  'working',working,
  'readiness',CASE WHEN working_id IS NULL
    THEN jsonb_build_object('digest',coalesce(published_digest,private.collection_digest('{}'::jsonb)),'checks','[]'::jsonb,
      'readyForApproval',false,'readyToPublish',false,'needsVerification',false)
    ELSE private.collection_readiness(working_digest, impact, working_state) END,
  'impact',impact,
  'recipes',coalesce((SELECT jsonb_agg(jsonb_build_object('recipeId',c.id,'slug',c.slug,'title',c.title,
      'publication',c.publication_state,'totalMinutes',c.total_minutes,'imagePath',c.preview_image_path,
      'allergens',coalesce(to_jsonb(b.allergens),'[]'::jsonb),'storageNotes',b.storage_notes) ORDER BY c.id)
    FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id=c.id WHERE c.id IN (
      SELECT (m->>'recipeId')::uuid FROM jsonb_array_elements(coalesce(published#>'{snapshot,members}','[]'::jsonb)) m
      UNION SELECT (m->>'recipeId')::uuid FROM jsonb_array_elements(coalesce(working#>'{snapshot,members}','[]'::jsonb)) m
      UNION SELECT (x#>>'{}')::uuid FROM jsonb_array_elements(coalesce(impact#>'{value,protectedRecipeIds}','[]'::jsonb)) x)),'[]'::jsonb),
  'history',history->'events',
  'historyCursor',history->'nextCursor',
  'checkedAt',now());
END $$;

REVOKE ALL ON FUNCTION private.collection_check(text,text,text,text,text,text), private.collection_evaluate(uuid,uuid),
 private.collection_readiness(text,jsonb,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_collection_impact(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_collection_impact(uuid,uuid) TO authenticated;
