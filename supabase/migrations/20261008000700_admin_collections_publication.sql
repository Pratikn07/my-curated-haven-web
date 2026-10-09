-- Phase 2: atomic, exact collection publication. Commit all of these or none:
-- revalidated authority and evidence, the human decision (owner one-step) or an existing matching one,
-- an immutable release when membership or order changes, sealed history, explicit buyer-access decisions,
-- offer re-binding with unchanged terms, the publication record, active pointer, public projection,
-- identity fields, source mode, audit and receipt. Sales switches and prices are never changed.

-- Buyer groups (origin release + access source kind) that have no recorded additions decision yet.
CREATE FUNCTION private.collection_unmapped_access(p_collection_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('releaseId',g.release_id,'version',g.version,'sourceKind',g.source_kind,
   'buyers',g.buyers) ORDER BY g.version, g.source_kind),'[]'::jsonb)
 FROM (SELECT s.release_id, r.version, s.source_kind, count(DISTINCT s.user_id) buyers
   FROM private.access_sources s JOIN public.collection_releases r ON r.id=s.release_id
   WHERE r.collection_id=p_collection_id AND s.is_eligible
     AND NOT (s.source_kind='stripe_purchase' AND EXISTS(SELECT 1 FROM private.purchase_orders po
       JOIN private.commercial_offers o ON o.id=po.offer_id WHERE po.id::text=s.source_id AND o.provider_mode='test'))
     AND NOT EXISTS(SELECT 1 FROM private.collection_access_policies p WHERE p.release_id=s.release_id AND p.source_kind=s.source_kind)
   GROUP BY s.release_id, r.version, s.source_kind) g
$$;

-- Published release membership can only change inside the publication writer.
CREATE FUNCTION private.collection_guard_published_members() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE rel uuid := CASE WHEN TG_OP='DELETE' THEN OLD.release_id ELSE NEW.release_id END;
BEGIN
 IF current_setting('app.collection_publishing', true) IS DISTINCT FROM 'on'
  AND EXISTS(SELECT 1 FROM private.collection_publications p WHERE p.release_id=rel AND NOT p.imported) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_IMMUTABLE';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER collection_recipes_published_guard BEFORE INSERT OR UPDATE OR DELETE ON public.collection_recipes
 FOR EACH ROW EXECUTE FUNCTION private.collection_guard_published_members();
CREATE TRIGGER release_manifests_immutable BEFORE UPDATE OR DELETE ON private.release_manifests
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();

-- A revision that is the current publication reads as published.
CREATE OR REPLACE FUNCTION private.collection_revision_json(p_revision_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',r.id,'collectionId',r.collection_id,'version',r.version,'digest',r.digest,
  'base',jsonb_build_object('publicationId',r.base_publication_id,'digest',r.base_digest),
  'state',CASE WHEN h.revision_id=r.id THEN h.state
    WHEN EXISTS(SELECT 1 FROM private.collection_active_publications a JOIN private.collection_publications p ON p.id=a.publication_id
      WHERE a.collection_id=r.collection_id AND p.revision_id=r.id) THEN 'published' ELSE 'superseded' END,
  'submissionId',CASE WHEN h.revision_id=r.id THEN h.submission_id END,
  'snapshot',r.snapshot,'savedAt',r.saved_at,'savedBy',r.saved_by)
 FROM private.collection_revisions r
 LEFT JOIN private.collection_draft_heads h ON h.collection_id=r.collection_id
 WHERE r.id=p_revision_id
$$;

-- The shared writer. p_context carries the authorised human and the executor; it is built only by the
-- authenticated entry point below (and later the attested operator entry point), never from a caller.
CREATE FUNCTION private.collection_publish_core(p_context jsonb, p_command jsonb) RETURNS jsonb
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
   SELECT id INTO decision FROM private.collection_review_decisions WHERE submission_id=head.submission_id AND decision='approve';
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

 -- Buyer groups without a decision must be decided in this approved command; nothing is broadened by default.
 unmapped := private.collection_unmapped_access(ids.collection_id);
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

 snap := rev.snapshot;
 SELECT p.* INTO active_pub FROM private.collection_active_publications a JOIN private.collection_publications p ON p.id=a.publication_id
  WHERE a.collection_id=ids.collection_id;
 base_release := active_pub.release_id;
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

-- Browser entry point. The human is the verified caller; approve_now also needs review authority.
CREATE FUNCTION public.admin_collection_publish(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid;
BEGIN
 actor := private.collection_assert('collection.publish','publication');
 IF coalesce((p_command->>'approve_now')::boolean,false) THEN
  PERFORM private.collection_assert('collection.review','publication');
 END IF;
 RETURN private.collection_publish_core(jsonb_build_object('human_authoriser',actor,'executor_id',actor::text,
   'executor_type','human','attestation_id',null), p_command);
END $$;

-- Buyer groups the publish page must ask about.
CREATE FUNCTION public.admin_collection_access_decisions(p_collection_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.collection_assert('collection.read','inspection');
 RETURN private.collection_unmapped_access(p_collection_id);
END $$;

REVOKE ALL ON FUNCTION private.collection_unmapped_access(uuid), private.collection_guard_published_members(),
 private.collection_publish_core(jsonb,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_collection_publish(jsonb), public.admin_collection_access_decisions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_collection_publish(jsonb), public.admin_collection_access_decisions(uuid) TO authenticated;
