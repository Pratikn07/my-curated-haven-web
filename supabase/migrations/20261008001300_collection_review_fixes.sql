-- Phase 2 fixes from the independent final review (Task 18).
--
-- 1. Recipes delivered to earlier buyers as additions are protected: the delivered release counts as committed
--    when buyers of an earlier release receive its members through an additions-v1 policy, so a later draft
--    cannot remove what those buyers already receive.
-- 2. Buyer-group decisions are recorded only with the one-step approval of someone who also holds review
--    authority (a separated publisher is blocked while any group is undecided), and never by a no-change
--    publication.
-- 3. When the active publication has no release (an empty coming-soon page), the collection's latest published
--    release is the base, so it is sealed and its offers move to the new release instead of being stranded.
-- 4. A retired or not-open database collection is not sellable at checkout.
-- 5. The owner's one-step approval of a revision a reviewer already approved no longer fails on an ambiguous
--    column reference (the existing approval is reused).

CREATE OR REPLACE FUNCTION private.collection_protected_members(p_collection_id uuid) RETURNS TABLE(recipe_id uuid)
LANGUAGE sql STABLE SET search_path='' AS $$
 WITH delivered AS (SELECT private.collection_delivered_release(p_collection_id) id),
 committed AS (
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
     AND NOT EXISTS(SELECT 1 FROM private.access_sources s WHERE s.release_id=e.release_id AND s.user_id=e.user_id))
   -- The delivered release, when buyers of an earlier release receive its members through an additions policy.
   OR (r.id=(SELECT id FROM delivered)
     AND EXISTS(SELECT 1 FROM public.collection_releases h
       JOIN private.access_sources s ON s.release_id=h.id AND s.is_eligible
       JOIN private.collection_access_policies ap ON ap.release_id=s.release_id AND ap.source_kind=s.source_kind
         AND ap.policy='additions-v1'
       WHERE h.collection_id=r.collection_id AND h.version < r.version
         AND (s.source_kind IN ('native_legacy','support_grant','promotional')
           OR NOT EXISTS(SELECT 1 FROM private.purchase_orders po JOIN private.commercial_offers o ON o.id=po.offer_id
             WHERE po.id::text=s.source_id AND o.provider_mode='test'))))))
 SELECT DISTINCT x.recipe_id FROM public.collection_recipes x WHERE x.release_id = ANY(ARRAY(SELECT id FROM committed))
 UNION
 SELECT DISTINCT unnest(m.member_recipe_ids) FROM private.release_manifests m JOIN committed c ON c.id=m.release_id
$$;

CREATE OR REPLACE FUNCTION private.collection_publish_core(p_context jsonb, p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE
 human uuid := (p_context->>'human_authoriser')::uuid; executor text := p_context->>'executor_id';
 executor_type text := p_context->>'executor_type'; ids record; result jsonb;
 head private.collection_draft_heads; rev private.collection_revisions; sub uuid; decision uuid; impact jsonb;
 base jsonb; active_pub private.collection_publications; base_release uuid; base_members uuid[]; members uuid[];
 new_release uuid := NULL; release_for_pub uuid; pub uuid; snap jsonb; decisions jsonb := coalesce(p_command->'access_decisions','[]'::jsonb);
 unmapped jsonb; d jsonb; offer private.commercial_offers; manifest text; next_version int; receipt jsonb;
BEGIN
 ids := private.collection_command_ids(p_command);
 PERFORM set_config('lock_timeout','5s',true);
 -- Lock order shared by every writer: collection, recipes (UUID order), offers (UUID order), then rows.
 PERFORM 1 FROM public.recipe_collections WHERE id=ids.collection_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 result := private.collection_begin_operation(executor, ids.operation_id, 'collection.publish', ids.collection_id,
   jsonb_build_object('reason',ids.reason,'revision_id',p_command->'revision_id','expected_version',p_command->'expected_version',
     'expected_digest',p_command->'expected_digest','base',p_command->'base','impact_token',p_command->'impact_token',
     'approve_now',coalesce((p_command->>'approve_now')::boolean,false),'access_decisions',decisions));
 IF result IS NOT NULL THEN RETURN result; END IF;

 head := private.collection_current_head(ids.collection_id, p_command);
 SELECT * INTO rev FROM private.collection_revisions WHERE id=head.revision_id;
 PERFORM 1 FROM public.recipe_catalog WHERE id IN (SELECT (m->>'recipeId')::uuid FROM jsonb_array_elements(rev.snapshot->'members') m)
  ORDER BY id FOR SHARE;
 PERFORM 1 FROM private.commercial_offers o JOIN public.collection_releases r ON r.id=o.release_id
  WHERE r.collection_id=ids.collection_id ORDER BY o.id FOR UPDATE OF o;
 IF (p_command#>>'{base,publication_id}') IS DISTINCT FROM rev.base_publication_id::text
  OR (p_command#>>'{base,digest}') IS DISTINCT FROM rev.base_digest THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 impact := private.collection_fresh_evidence(ids.collection_id, rev.id, p_command->>'impact_token', true);

 IF coalesce((p_command->>'approve_now')::boolean,false) THEN
  -- Owner one-step: record the exact human approval in this transaction.
  IF head.state NOT IN ('draft','changes_requested','submitted','approved') THEN
   RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
  END IF;
  IF head.state='approved' THEN
   SELECT d2.id INTO decision FROM private.collection_review_decisions d2
   WHERE d2.submission_id=head.submission_id AND d2.decision='approve';
  ELSE
   IF head.state='submitted' THEN
    sub := head.submission_id;
   ELSE
    INSERT INTO private.collection_submissions(collection_id,revision_id,digest,impact_token,submitted_by,operation_id,reason)
    VALUES(ids.collection_id,rev.id,rev.digest,p_command->>'impact_token',human,ids.operation_id,ids.reason) RETURNING id INTO sub;
   END IF;
   IF EXISTS(SELECT 1 FROM private.collection_issues i WHERE i.revision_id=rev.id AND i.digest=rev.digest AND i.severity='blocker'
     AND NOT EXISTS(SELECT 1 FROM private.collection_issue_resolutions x WHERE x.issue_id=i.id)) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
   END IF;
   INSERT INTO private.collection_review_decisions(collection_id,revision_id,submission_id,digest,impact_token,decision,
     human_authoriser,executor_id,executor_type,attestation_id,operation_id,reason)
   VALUES(ids.collection_id,rev.id,sub,rev.digest,p_command->>'impact_token','approve',human,executor,executor_type,
     (p_context->>'attestation_id')::uuid,ids.operation_id,ids.reason) RETURNING id INTO decision;
  END IF;
 ELSE
  -- Separated publisher: an existing approval of exactly this revision and evidence.
  SELECT d2.id INTO decision FROM private.collection_review_decisions d2
  WHERE d2.submission_id=head.submission_id AND d2.revision_id=rev.id AND d2.digest=rev.digest AND d2.decision='approve'
    AND d2.impact_token=p_command->>'impact_token';
  IF head.state<>'approved' OR decision IS NULL THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT'; END IF;
 END IF;

 snap := rev.snapshot;
 SELECT p.* INTO active_pub FROM private.collection_active_publications a JOIN private.collection_publications p ON p.id=a.publication_id
  WHERE a.collection_id=ids.collection_id;
 -- The current release: the active publication's, or for a collection whose publication has none (an empty
 -- coming-soon page) its latest published release, so that release is sealed and its offers move with it.
 base_release := coalesce(active_pub.release_id, (SELECT r.id FROM public.collection_releases r
   WHERE r.collection_id=ids.collection_id AND r.state='published' ORDER BY r.version DESC LIMIT 1));
 SELECT coalesce(array_agg(recipe_id ORDER BY position),'{}') INTO base_members FROM public.collection_recipes WHERE release_id=base_release;
 SELECT coalesce(array_agg((m->>'recipeId')::uuid ORDER BY o),'{}') INTO members
  FROM jsonb_array_elements(snap->'members') WITH ORDINALITY x(m,o);

 IF active_pub.id IS NOT NULL AND active_pub.digest=rev.digest THEN
  -- Nothing to publish: identical to what is live.
  DELETE FROM private.collection_draft_heads WHERE collection_id=ids.collection_id;
  receipt := jsonb_build_object('operationId',ids.operation_id,'collectionId',ids.collection_id,'revisionId',rev.id,
   'publicationId',active_pub.id,'releaseId',active_pub.release_id,'version',rev.version,'digest',rev.digest,'noChange',true,
   'committedAt',now(),'refreshState','complete');
  PERFORM private.collection_finish_operation(executor, ids.operation_id, receipt);
  RETURN receipt;
 END IF;

 -- Buyer groups without a decision must be decided now; nothing is broadened by default. Only someone who also
 -- holds review authority decides (the one-step approval), and nothing is recorded for a no-change publication.
 unmapped := private.collection_unmapped_access(ids.collection_id);
 IF jsonb_array_length(unmapped) > 0 AND NOT coalesce((p_command->>'approve_now')::boolean,false) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;
 FOR d IN SELECT value FROM jsonb_array_elements(unmapped) LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(decisions) x WHERE x->>'release_id'=d->>'releaseId'
    AND x->>'source_kind'=d->>'sourceKind' AND x->>'policy' IN ('additions-v1','original-only')) THEN
   RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
  END IF;
 END LOOP;
 INSERT INTO private.collection_access_policies(release_id,source_kind,policy,approved_by,approval_reason)
 SELECT (x->>'release_id')::uuid, x->>'source_kind', x->>'policy', human, ids.reason
 FROM jsonb_array_elements(decisions) x
 WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(unmapped) u WHERE u->>'releaseId'=x->>'release_id' AND u->>'sourceKind'=x->>'source_kind');

 PERFORM set_config('app.collection_publishing','on',true);
 IF cardinality(members) = 0 THEN
  release_for_pub := NULL;                         -- An empty coming-soon collection has nothing to sell.
 ELSIF base_release IS NOT NULL AND members = base_members THEN
  release_for_pub := base_release;                 -- Same recipes in the same order: wording-only update.
 ELSE
  SELECT coalesce(max(version),0)+1 INTO next_version FROM public.collection_releases WHERE collection_id=ids.collection_id;
  INSERT INTO public.collection_releases(collection_id,version,state) VALUES(ids.collection_id,next_version,'published')
   RETURNING id INTO new_release;
  INSERT INTO public.collection_recipes(release_id,recipe_id,position)
  SELECT new_release, m, o FROM unnest(members) WITH ORDINALITY u(m,o);
  manifest := private.collection_digest(to_jsonb(members));
  INSERT INTO private.release_manifests(release_id,member_recipe_ids,manifest_checksum,approved_by,approved_at)
  VALUES(new_release, members, manifest, 'collection-decision:'||decision::text, now());
  -- Buyers of this release receive later approved additions.
  INSERT INTO private.collection_access_policies(release_id,source_kind,policy,approved_by,approval_reason)
  VALUES(new_release,'stripe_purchase','additions-v1',human,'Registered with publication '||ids.operation_id::text);
  -- The superseded release keeps its members for its buyers and is sealed.
  IF base_release IS NOT NULL THEN
   UPDATE public.collection_releases SET state='sealed', sealed_at=now() WHERE id=base_release AND state='published';
  END IF;
  -- Offers follow the collection to its new release with unchanged terms and sale switch.
  FOR offer IN SELECT o.* FROM private.commercial_offers o WHERE o.release_id=base_release ORDER BY o.id LOOP
   PERFORM private.collection_advance_offer(offer.id, new_release, manifest, private.collection_offer_terms_digest(offer));
  END LOOP;
  release_for_pub := new_release;
 END IF;
 PERFORM set_config('app.collection_publishing','off',true);  -- The guard applies again for the rest of the transaction.

 INSERT INTO private.collection_publications(collection_id,revision_id,decision_id,release_id,snapshot,digest,imported,operation_id,executor_id)
 VALUES(ids.collection_id,rev.id,decision,release_for_pub,snap,rev.digest,false,ids.operation_id,executor) RETURNING id INTO pub;
 BEGIN
  INSERT INTO private.collection_active_publications(collection_id,publication_id,series_key,series_volume,updated_at)
  VALUES(ids.collection_id,pub,snap#>>'{series,key}',(snap#>>'{series,volume}')::int,now())
  ON CONFLICT (collection_id) DO UPDATE SET publication_id=EXCLUDED.publication_id, series_key=EXCLUDED.series_key,
    series_volume=EXCLUDED.series_volume, updated_at=now();
 EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END;
 INSERT INTO public.collection_publication_projection(collection_id,publication_id,release_id,slug,title,tagline,story,for_when,
   refresh,shelf,sort_order,stage_min,stage_max,series_key,series_volume,listing_state,availability,cloth,cover,members,
   published_count,published_at)
 VALUES(ids.collection_id,pub,release_for_pub,snap->>'slug',snap->>'title',snap->>'tagline',snap->>'story',snap->>'forWhen',
   snap->>'refresh',snap->>'shelf',(snap->>'sortOrder')::double precision,(snap#>>'{stage,min}')::int,(snap#>>'{stage,max}')::int,
   snap#>>'{series,key}',(snap#>>'{series,volume}')::int,snap->>'listingState',snap->>'availability',snap->>'cloth',
   CASE WHEN snap->'cover'='null'::jsonb THEN NULL ELSE snap->'cover' END,
   coalesce((SELECT jsonb_agg(jsonb_build_object('recipeId',m->>'recipeId','slug',m->>'recipeSlug','position',o) ORDER BY o)
     FROM jsonb_array_elements(snap->'members') WITH ORDINALITY x(m,o)),'[]'::jsonb),
   jsonb_array_length(snap->'members'),now())
 ON CONFLICT (collection_id) DO UPDATE SET publication_id=EXCLUDED.publication_id, release_id=EXCLUDED.release_id,
   slug=EXCLUDED.slug, title=EXCLUDED.title, tagline=EXCLUDED.tagline, story=EXCLUDED.story, for_when=EXCLUDED.for_when,
   refresh=EXCLUDED.refresh, shelf=EXCLUDED.shelf, sort_order=EXCLUDED.sort_order, stage_min=EXCLUDED.stage_min,
   stage_max=EXCLUDED.stage_max, series_key=EXCLUDED.series_key, series_volume=EXCLUDED.series_volume,
   listing_state=EXCLUDED.listing_state, availability=EXCLUDED.availability, cloth=EXCLUDED.cloth, cover=EXCLUDED.cover,
   members=EXCLUDED.members, published_count=EXCLUDED.published_count, published_at=EXCLUDED.published_at;
 UPDATE public.recipe_collections SET title=snap->>'title', public_summary=coalesce(nullif(snap->>'tagline',''),snap->>'story'),
   listing_state=snap->>'listingState', updated_at=now() WHERE id=ids.collection_id;
 INSERT INTO private.collection_sources(collection_id,source_mode) VALUES(ids.collection_id,'database')
 ON CONFLICT (collection_id) DO UPDATE SET source_mode='database', updated_at=now();
 DELETE FROM private.collection_draft_heads WHERE collection_id=ids.collection_id;
 INSERT INTO private.collection_audit(collection_id,action,revision_id,publication_id,digest,before_ref,after_ref,operation_id,
   human_authoriser,executor_id,executor_type,reason,result)
 VALUES(ids.collection_id,'collection.publish',rev.id,pub,rev.digest,active_pub.id::text,pub::text,ids.operation_id,human,executor,
   executor_type,ids.reason,'success');
 receipt := jsonb_build_object('operationId',ids.operation_id,'collectionId',ids.collection_id,'revisionId',rev.id,
  'publicationId',pub,'releaseId',release_for_pub,'version',rev.version,'digest',rev.digest,'noChange',false,
  'committedAt',now(),'refreshState','pending');
 PERFORM private.collection_finish_operation(executor, ids.operation_id, receipt);
 RETURN receipt;
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
