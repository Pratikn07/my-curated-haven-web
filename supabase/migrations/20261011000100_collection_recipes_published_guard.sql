-- A collection is only sold when buyers can read every recipe in it.
--
-- The 2026-10-11 production rehearsal published and sold First Tastes while its recipes were drafts: the buyer
-- paid and their library listed no recipes, because buyers read only published recipes. Now:
-- 1. Readiness adds RECIPE_PUBLISHED for each member that is not published. It blocks an open collection
--    (publication, submission and approval all refuse) and is a suggestion for a coming-soon one. The
--    publication state is part of the impact evidence, so a recipe withdrawn after review makes it stale.
-- 2. Checkout refuses a release that has a member that is not published, including one withdrawn after the
--    collection went on sale.

CREATE OR REPLACE FUNCTION private.collection_evaluate(p_collection_id uuid, p_revision_id uuid) RETURNS jsonb
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
    (b.recipe_id IS NOT NULL AND private.recipe_is_reviewed(c.id)) reviewed, c.publication_state='published' published
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
  -- Buyers read only published recipes, so an open collection cannot be sold with a draft or withdrawn one.
  IF NOT recipe.published THEN
   checks := checks || private.collection_check('RECIPE_PUBLISHED',recipe.slug,'fail',
     CASE WHEN snap->>'availability'='open' THEN 'blocker' ELSE 'suggestion' END,
     format('%s is not published yet. Publish it in Recipes before this collection goes on sale.', recipe.title),'source');
  END IF;
  IF recipe.active_hash IS DISTINCT FROM m->>'reviewDigest' OR recipe.content_version IS DISTINCT FROM (m->>'contentVersion')::int THEN
   checks := checks || private.collection_check('RECIPE_CURRENT',recipe.slug,'fail','blocker',
     format('%s changed after it was added. Update the recipe references in the draft.', recipe.title),'source');
  END IF;
  IF m->>'fit' = 'blocked' THEN blocked := blocked + 1; ELSIF m->>'fit' <> 'accepted' THEN unverified := unverified + 1; END IF;
  member_evidence := member_evidence || jsonb_build_object('recipeId',recipe.id,'activeHash',recipe.active_hash,
    'contentVersion',recipe.content_version,'reviewed',recipe.reviewed,'published',recipe.published);
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

CREATE OR REPLACE FUNCTION private.collection_sellable(p_collection_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE mode text; delivered uuid; v_release uuid; offer private.commercial_offers; members jsonb; pub uuid; manifest text;
BEGIN
 SELECT source_mode INTO mode FROM private.collection_sources WHERE collection_id=p_collection_id;
 delivered := private.collection_delivered_release(p_collection_id);
 IF coalesce(mode,'legacy')='database' THEN
  -- A retired or not-yet-open database collection is not for sale, whatever offers still exist.
  IF EXISTS(SELECT 1 FROM private.collection_active_publications a JOIN private.collection_publications p ON p.id=a.publication_id
    WHERE a.collection_id=p_collection_id
      AND (p.snapshot->>'listingState'='retired' OR p.snapshot->>'availability' IS DISTINCT FROM 'open')) THEN
   RETURN NULL;
  END IF;
  v_release := delivered;
 ELSE
  SELECT r.id INTO v_release FROM public.collection_releases r
  WHERE r.collection_id=p_collection_id AND r.state IN ('published','sealed')
    AND EXISTS(SELECT 1 FROM private.commercial_offers o WHERE o.release_id=r.id AND o.sale_enabled)
  ORDER BY r.version DESC LIMIT 1;
 END IF;
 IF v_release IS NULL THEN RETURN NULL; END IF;
 -- A release with a recipe buyers could not read (draft or withdrawn) is not for sale.
 IF EXISTS(SELECT 1 FROM public.collection_recipes cr JOIN public.recipe_catalog c ON c.id=cr.recipe_id
   WHERE cr.release_id=v_release AND c.publication_state IS DISTINCT FROM 'published') THEN
  RETURN NULL;
 END IF;
 SELECT * INTO offer FROM private.commercial_offers WHERE release_id=v_release AND sale_enabled
  ORDER BY created_at DESC, id LIMIT 1;
 IF offer.id IS NULL THEN RETURN NULL; END IF;
 SELECT coalesce(jsonb_agg(recipe_id ORDER BY position),'[]'::jsonb) INTO members FROM public.collection_recipes
  WHERE collection_recipes.release_id=v_release;
 SELECT a.publication_id INTO pub FROM private.collection_active_publications a JOIN private.collection_publications p
  ON p.id=a.publication_id WHERE a.collection_id=p_collection_id AND p.release_id=v_release;
 manifest := private.collection_digest(members);
 RETURN jsonb_build_object('publicationId',pub,'releaseId',v_release,'offerId',offer.id,'manifestHash',manifest,
  'sourceDigest',private.collection_digest(jsonb_build_object('publicationId',pub,'releaseId',v_release,'manifest',manifest,
    'offerId',offer.id,'terms',private.collection_offer_terms_digest(offer))),
  'memberIds',members,
  'offer',jsonb_build_object('id',offer.id,'providerAccountId',offer.provider_account_id,'providerMode',offer.provider_mode,
    'providerProductId',offer.provider_product_id,'providerPriceId',offer.provider_price_id,'currency',offer.currency,
    'baseMinorAmount',offer.base_minor_amount,'taxMode',offer.tax_mode,'quantity',offer.quantity,
    'termsVersion',offer.terms_version,'refundPolicyVersion',offer.refund_policy_version,
    'accessPolicyVersion',offer.access_policy_version));
END $$;
