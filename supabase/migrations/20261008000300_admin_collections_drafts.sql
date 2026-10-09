-- Phase 2: private collection drafts. Create, start, save, rebase, copy and discard.
-- Every command is idempotent per (executor, operation_id), checks current authority and the
-- collection stage, locks the collection identity, and appends immutable revisions. Nothing here
-- touches the public projection, recipe bodies, offers or customer access.

-- Recipes buyers have already received through a committed release. Ordinary drafts must keep them.
-- Task 8 extends the evidence (payments, test-mode separation); the set only ever grows.
CREATE FUNCTION private.collection_protected_members(p_collection_id uuid) RETURNS TABLE(recipe_id uuid)
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT DISTINCT cr.recipe_id
 FROM public.collection_releases r JOIN public.collection_recipes cr ON cr.release_id=r.id
 WHERE r.collection_id=p_collection_id AND (
   r.state IN ('sealed','retired')
   OR EXISTS(SELECT 1 FROM private.purchase_orders po WHERE po.release_id=r.id)
   OR EXISTS(SELECT 1 FROM public.access_entitlements e WHERE e.release_id=r.id)
   OR EXISTS(SELECT 1 FROM private.commercial_offers o WHERE o.release_id=r.id AND o.sale_enabled AND o.provider_mode='live'))
$$;

CREATE FUNCTION private.collection_begin_operation(p_executor text, p_id uuid, p_action text, p_collection uuid, p_request jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE fingerprint text := private.admin_snapshot_digest(p_request); previous private.collection_operations;
BEGIN
 IF p_executor IS NULL OR p_id IS NULL OR p_request IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 INSERT INTO private.collection_operations(executor_id,operation_id,action,collection_id,request_hash)
 VALUES(p_executor,p_id,p_action,p_collection,fingerprint) ON CONFLICT DO NOTHING;
 SELECT * INTO previous FROM private.collection_operations WHERE executor_id=p_executor AND operation_id=p_id FOR UPDATE;
 IF previous.request_hash<>fingerprint OR previous.action<>p_action OR previous.collection_id IS DISTINCT FROM p_collection THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 RETURN previous.result;
END $$;

CREATE FUNCTION private.collection_finish_operation(p_executor text, p_id uuid, p_receipt jsonb) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 UPDATE private.collection_operations SET result=p_receipt, committed_at=now()
 WHERE executor_id=p_executor AND operation_id=p_id AND result IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
END $$;

-- Server-side twin of validateCollection (src/lib/admin/collections/snapshot.ts): shape, vocabulary and
-- member references. No recipe-count rule. Unknown keys are refused.
CREATE FUNCTION private.collection_validate_snapshot(p_snapshot jsonb, p_collection_id uuid) RETURNS void
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE
 keys text[] := ARRAY['collectionId','slug','title','tagline','story','forWhen','refresh','shelf','sortOrder','stage',
   'series','listingState','availability','cloth','cover','members'];
 m jsonb; ids uuid[] := ARRAY[]::uuid[]; smin jsonb; smax jsonb; cover jsonb;
BEGIN
 IF jsonb_typeof(p_snapshot) <> 'object'
  OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_snapshot) k WHERE k <> ALL(keys))
  OR EXISTS(SELECT 1 FROM unnest(keys) k WHERE NOT p_snapshot ? k)
  OR p_snapshot->>'collectionId' IS DISTINCT FROM p_collection_id::text
  OR p_snapshot->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(p_snapshot->>'slug') > 80
  OR jsonb_typeof(p_snapshot->'title') <> 'string' OR length(trim(p_snapshot->>'title')) = 0 OR length(p_snapshot->>'title') > 120
  OR jsonb_typeof(p_snapshot->'tagline') <> 'string' OR length(p_snapshot->>'tagline') > 160
  OR jsonb_typeof(p_snapshot->'story') <> 'string' OR length(p_snapshot->>'story') > 1200
  OR jsonb_typeof(p_snapshot->'forWhen') <> 'string' OR length(p_snapshot->>'forWhen') > 400
  OR jsonb_typeof(p_snapshot->'refresh') <> 'string' OR length(p_snapshot->>'refresh') > 400
  OR jsonb_typeof(p_snapshot->'sortOrder') <> 'number'
  OR p_snapshot->>'shelf' NOT IN ('mornings','everyday-meals','cook-once','nourish','snacks-and-treats','seasons-and-parties')
  OR p_snapshot->>'cloth' NOT IN ('ember','forest','plum','terracotta','sage','slate','walnut','navy','rose','ochre','berry',
     'clay','sky','rust','crimson','teal')
  OR p_snapshot->>'listingState' NOT IN ('listed','unlisted','retired')
  OR p_snapshot->>'availability' NOT IN ('open','coming-soon')
  OR jsonb_typeof(p_snapshot->'members') <> 'array' THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 smin := p_snapshot#>'{stage,min}'; smax := p_snapshot#>'{stage,max}';
 IF jsonb_typeof(p_snapshot->'stage') <> 'object'
  OR (smin <> 'null'::jsonb AND (jsonb_typeof(smin) <> 'number' OR (smin#>>'{}')::numeric NOT BETWEEN 0 AND 216
      OR (smin#>>'{}')::numeric <> trunc((smin#>>'{}')::numeric)))
  OR (smax <> 'null'::jsonb AND (jsonb_typeof(smax) <> 'number' OR (smax#>>'{}')::numeric NOT BETWEEN 0 AND 216
      OR (smax#>>'{}')::numeric <> trunc((smax#>>'{}')::numeric)))
  OR (smin = 'null'::jsonb AND smax <> 'null'::jsonb)
  OR (smin <> 'null'::jsonb AND smax <> 'null'::jsonb AND (smin#>>'{}')::numeric >= (smax#>>'{}')::numeric) THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 IF p_snapshot->'series' <> 'null'::jsonb AND (
   p_snapshot#>>'{series,key}' NOT IN ('breakfast','meal-prep')
   OR jsonb_typeof(p_snapshot#>'{series,volume}') <> 'number'
   OR (p_snapshot#>>'{series,volume}')::numeric < 1
   OR (p_snapshot#>>'{series,volume}')::numeric <> trunc((p_snapshot#>>'{series,volume}')::numeric)) THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 cover := p_snapshot->'cover';
 IF cover <> 'null'::jsonb AND (
   jsonb_typeof(cover) <> 'object' OR cover->>'src' !~ '^(/|https://)'
   OR jsonb_typeof(cover->'width') <> 'number' OR (cover->>'width')::numeric < 1
   OR jsonb_typeof(cover->'height') <> 'number' OR (cover->>'height')::numeric < 1
   OR length(trim(coalesce(cover->>'alt',''))) < 3 OR coalesce(cover->>'assetDigest','') !~ '^[0-9a-f]{64}$') THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 FOR m IN SELECT value FROM jsonb_array_elements(p_snapshot->'members') LOOP
  IF jsonb_typeof(m) <> 'object'
   OR (SELECT count(*) FROM jsonb_object_keys(m)) <> 7
   OR coalesce(m->>'recipeId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR NOT EXISTS(SELECT 1 FROM public.recipe_catalog c WHERE c.id=(m->>'recipeId')::uuid AND c.slug=m->>'recipeSlug')
   OR jsonb_typeof(m->'contentVersion') <> 'number' OR (m->>'contentVersion')::numeric < 1
   OR coalesce(m->>'reviewDigest','') !~ '^[0-9a-f]{64}$' OR coalesce(m->>'tagsDigest','') !~ '^[0-9a-f]{64}$'
   OR jsonb_typeof(m->'placementNote') <> 'string' OR length(m->>'placementNote') > 500
   OR m->>'fit' NOT IN ('unverified','accepted','blocked')
   OR (m->>'recipeId')::uuid = ANY(ids) THEN
   RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
  END IF;
  ids := ids || (m->>'recipeId')::uuid;
 END LOOP;
END $$;

-- Candidate must keep every protected recipe. Draft-only additions can still be removed.
CREATE FUNCTION private.collection_assert_protected(p_collection_id uuid, p_snapshot jsonb) RETURNS void
LANGUAGE plpgsql STABLE SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM private.collection_protected_members(p_collection_id) p
   WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_snapshot->'members') m WHERE (m->>'recipeId')::uuid=p.recipe_id)) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;
END $$;

CREATE FUNCTION private.collection_active_base(p_collection_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(
  (SELECT jsonb_build_object('publicationId',p.id,'digest',p.digest) FROM private.collection_active_publications a
    JOIN private.collection_publications p ON p.id=a.publication_id WHERE a.collection_id=p_collection_id),
  jsonb_build_object('publicationId',null,'digest',private.collection_digest('{}'::jsonb)))
$$;

-- A slug is fixed once the collection has any publication; before that it may change if unused.
CREATE FUNCTION private.collection_apply_slug(p_collection_id uuid, p_slug text) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE current_slug text;
BEGIN
 SELECT slug INTO current_slug FROM public.recipe_collections WHERE id=p_collection_id;
 IF current_slug = p_slug THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM private.collection_publications WHERE collection_id=p_collection_id) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;
 IF EXISTS(SELECT 1 FROM public.recipe_collections WHERE slug=p_slug AND id<>p_collection_id) THEN
  RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='ADM_CONFLICT';
 END IF;
 UPDATE public.recipe_collections SET slug=p_slug, updated_at=now() WHERE id=p_collection_id;
END $$;

CREATE FUNCTION private.collection_append_revision(p_collection_id uuid, p_snapshot jsonb, p_base jsonb, p_actor uuid,
  p_operation uuid, p_reason text, p_state text) RETURNS uuid
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE next_version int; rev uuid;
BEGIN
 SELECT coalesce(max(version),0)+1 INTO next_version FROM private.collection_revisions WHERE collection_id=p_collection_id;
 INSERT INTO private.collection_revisions(collection_id,version,snapshot,digest,base_publication_id,base_digest,
   saved_by,executor_id,executor_type,operation_id,reason)
 VALUES(p_collection_id,next_version,p_snapshot,private.collection_digest(p_snapshot),
   (p_base->>'publicationId')::uuid,p_base->>'digest',p_actor,p_actor::text,'human',p_operation,p_reason)
 RETURNING id INTO rev;
 INSERT INTO private.collection_draft_heads(collection_id,revision_id,version,state)
 VALUES(p_collection_id,rev,next_version,p_state)
 ON CONFLICT (collection_id) DO UPDATE SET revision_id=EXCLUDED.revision_id, version=EXCLUDED.version,
   state=EXCLUDED.state, submission_id=NULL, updated_at=now();
 RETURN rev;
END $$;

CREATE FUNCTION private.collection_audit_event(p_collection_id uuid, p_action text, p_revision uuid, p_digest text,
  p_before text, p_after text, p_operation uuid, p_actor uuid, p_reason text) RETURNS void
LANGUAGE sql SET search_path='' AS $$
 INSERT INTO private.collection_audit(collection_id,action,revision_id,digest,before_ref,after_ref,operation_id,
   human_authoriser,executor_id,executor_type,reason,result)
 VALUES(p_collection_id,p_action,p_revision,p_digest,p_before,p_after,p_operation,p_actor,p_actor::text,'human',p_reason,'success')
$$;

CREATE FUNCTION private.collection_command_ids(p_command jsonb, OUT collection_id uuid, OUT operation_id uuid, OUT reason text)
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN
 BEGIN
  collection_id := (p_command->>'collection_id')::uuid;
  operation_id := (p_command->>'operation_id')::uuid;
 EXCEPTION WHEN others THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END;
 reason := p_command->>'reason';
 IF collection_id IS NULL OR operation_id IS NULL OR length(trim(coalesce(reason,''))) NOT BETWEEN 1 AND 1000 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
END $$;

CREATE FUNCTION private.collection_draft_result(p_operation uuid, p_revision uuid, p_no_change boolean) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('operationId',p_operation,'noChange',p_no_change,
  'revision',CASE WHEN p_revision IS NULL THEN NULL ELSE private.collection_revision_json(p_revision) END,
  'committedAt',now())
$$;

-- Create a private collection: unlisted identity, database source, first draft. No publication.
-- The operation row keeps collection_id NULL (the identity does not exist when it is recorded).
CREATE FUNCTION public.admin_collection_create(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; ids record; snap jsonb := p_command->'snapshot'; result jsonb; rev uuid;
BEGIN
 actor := private.collection_assert('collection.edit','editing');
 ids := private.collection_command_ids(p_command);
 result := private.collection_begin_operation(actor::text, ids.operation_id, 'collection.create', NULL,
   jsonb_build_object('collection_id',ids.collection_id,'reason',ids.reason,'snapshot',snap));
 IF result IS NOT NULL THEN RETURN result; END IF;
 IF EXISTS(SELECT 1 FROM public.recipe_collections WHERE id=ids.collection_id) THEN
  RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='ADM_CONFLICT';
 END IF;
 PERFORM private.collection_validate_snapshot(snap, ids.collection_id);
 IF EXISTS(SELECT 1 FROM public.recipe_collections WHERE slug=snap->>'slug') THEN
  RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='ADM_CONFLICT';
 END IF;
 INSERT INTO public.recipe_collections(id,slug,title,public_summary,listing_state)
 VALUES(ids.collection_id,snap->>'slug',snap->>'title',snap->>'tagline','unlisted');
 INSERT INTO private.collection_sources(collection_id,source_mode) VALUES(ids.collection_id,'database');
 rev := private.collection_append_revision(ids.collection_id, snap, private.collection_active_base(ids.collection_id),
   actor, ids.operation_id, ids.reason, 'draft');
 PERFORM private.collection_audit_event(ids.collection_id,'collection.create',rev,private.collection_digest(snap),
   NULL,rev::text,ids.operation_id,actor,ids.reason);
 result := private.collection_draft_result(ids.operation_id, rev, false);
 PERFORM private.collection_finish_operation(actor::text, ids.operation_id, result);
 RETURN result;
END $$;

-- Start a private draft from the current publication.
CREATE FUNCTION public.admin_collection_draft_start(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; ids record; result jsonb; rev uuid; base jsonb; snap jsonb;
BEGIN
 actor := private.collection_assert('collection.edit','editing');
 ids := private.collection_command_ids(p_command);
 PERFORM 1 FROM public.recipe_collections WHERE id=ids.collection_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 result := private.collection_begin_operation(actor::text, ids.operation_id, 'collection.start', ids.collection_id,
   jsonb_build_object('reason',ids.reason));
 IF result IS NOT NULL THEN RETURN result; END IF;
 IF EXISTS(SELECT 1 FROM private.collection_draft_heads WHERE collection_id=ids.collection_id) THEN
  RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='ADM_CONFLICT';
 END IF;
 base := private.collection_active_base(ids.collection_id);
 SELECT p.snapshot INTO snap FROM private.collection_publications p WHERE p.id=(base->>'publicationId')::uuid;
 IF snap IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 rev := private.collection_append_revision(ids.collection_id, snap, base, actor, ids.operation_id, ids.reason, 'draft');
 PERFORM private.collection_audit_event(ids.collection_id,'collection.start',rev,private.collection_digest(snap),
   base->>'publicationId',rev::text,ids.operation_id,actor,ids.reason);
 result := private.collection_draft_result(ids.operation_id, rev, false);
 PERFORM private.collection_finish_operation(actor::text, ids.operation_id, result);
 RETURN result;
END $$;

-- Save the full draft snapshot. Stale version, digest or base is a conflict, never an overwrite.
CREATE FUNCTION public.admin_collection_draft_save(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; ids record; snap jsonb := p_command->'snapshot'; result jsonb; head private.collection_draft_heads;
 current private.collection_revisions; rev uuid; reopen boolean;
BEGIN
 actor := private.collection_assert('collection.edit','editing');
 ids := private.collection_command_ids(p_command);
 PERFORM 1 FROM public.recipe_collections WHERE id=ids.collection_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 reopen := coalesce((p_command->>'reopen_reviewed')::boolean,false);
 result := private.collection_begin_operation(actor::text, ids.operation_id, 'collection.save', ids.collection_id,
   jsonb_build_object('reason',ids.reason,'expected_version',p_command->'expected_version',
     'expected_digest',p_command->'expected_digest','base',p_command->'base','snapshot',snap,'reopen_reviewed',reopen));
 IF result IS NOT NULL THEN RETURN result; END IF;
 SELECT * INTO head FROM private.collection_draft_heads WHERE collection_id=ids.collection_id FOR UPDATE;
 IF head.collection_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 SELECT * INTO current FROM private.collection_revisions WHERE id=head.revision_id;
 IF (p_command->>'expected_version') IS DISTINCT FROM head.version::text
  OR (p_command->>'expected_digest') IS DISTINCT FROM current.digest
  OR (p_command#>>'{base,publication_id}') IS DISTINCT FROM current.base_publication_id::text
  OR (p_command#>>'{base,digest}') IS DISTINCT FROM current.base_digest
  OR (private.collection_active_base(ids.collection_id)->>'publicationId') IS DISTINCT FROM current.base_publication_id::text THEN
  RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='ADM_CONFLICT';
 END IF;
 PERFORM private.collection_validate_snapshot(snap, ids.collection_id);
 IF private.collection_digest(snap) = current.digest THEN
  result := private.collection_draft_result(ids.operation_id, head.revision_id, true);
  PERFORM private.collection_finish_operation(actor::text, ids.operation_id, result);
  RETURN result;
 END IF;
 IF head.state IN ('submitted','approved') AND NOT reopen THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;
 PERFORM private.collection_assert_protected(ids.collection_id, snap);
 PERFORM private.collection_apply_slug(ids.collection_id, snap->>'slug');
 rev := private.collection_append_revision(ids.collection_id, snap,
   jsonb_build_object('publicationId',current.base_publication_id,'digest',current.base_digest),
   actor, ids.operation_id, ids.reason, CASE WHEN head.state IN ('submitted','approved') THEN 'draft' ELSE head.state END);
 PERFORM private.collection_audit_event(ids.collection_id,'collection.save',rev,private.collection_digest(snap),
   head.revision_id::text,rev::text,ids.operation_id,actor,ids.reason);
 result := private.collection_draft_result(ids.operation_id, rev, false);
 PERFORM private.collection_finish_operation(actor::text, ids.operation_id, result);
 RETURN result;
END $$;

-- rebase: move the draft onto the current publication, keeping its content.
-- copy_publication: start a draft from an earlier publication, re-adding today's protected recipes.
-- discard: close the draft. Revisions and history stay.
CREATE FUNCTION public.admin_collection_draft_control(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; ids record; action text := p_command->>'action'; ref uuid; result jsonb;
 head private.collection_draft_heads; current private.collection_revisions; base jsonb; snap jsonb; rev uuid;
 current_members jsonb;
BEGIN
 actor := private.collection_assert('collection.edit','editing');
 ids := private.collection_command_ids(p_command);
 IF action IS NULL OR action NOT IN ('rebase','copy_publication','discard') THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 BEGIN ref := (p_command->>'reference_id')::uuid;
 EXCEPTION WHEN others THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END;
 PERFORM 1 FROM public.recipe_collections WHERE id=ids.collection_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 result := private.collection_begin_operation(actor::text, ids.operation_id, 'collection.'||action, ids.collection_id,
   jsonb_build_object('reason',ids.reason,'expected_digest',p_command->'expected_digest','reference_id',ref));
 IF result IS NOT NULL THEN RETURN result; END IF;
 SELECT * INTO head FROM private.collection_draft_heads WHERE collection_id=ids.collection_id FOR UPDATE;
 base := private.collection_active_base(ids.collection_id);

 IF action = 'copy_publication' THEN
  IF head.collection_id IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='ADM_CONFLICT'; END IF;
  SELECT snapshot INTO snap FROM private.collection_publications WHERE id=ref AND collection_id=ids.collection_id;
  IF snap IS NULL OR (p_command->>'expected_digest') IS DISTINCT FROM (base->>'digest') THEN
   RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='ADM_CONFLICT';
  END IF;
  -- Keep today's protected recipes, taking their references from the current publication.
  SELECT p.snapshot->'members' INTO current_members FROM private.collection_publications p WHERE p.id=(base->>'publicationId')::uuid;
  snap := jsonb_set(snap,'{members}', (snap->'members') || coalesce((
    SELECT jsonb_agg(m ORDER BY o) FROM jsonb_array_elements(coalesce(current_members,'[]'::jsonb)) WITH ORDINALITY x(m,o)
    WHERE (m->>'recipeId')::uuid IN (SELECT recipe_id FROM private.collection_protected_members(ids.collection_id))
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snap->'members') s WHERE s->>'recipeId'=m->>'recipeId')),'[]'::jsonb));
  PERFORM private.collection_validate_snapshot(snap, ids.collection_id);
  PERFORM private.collection_assert_protected(ids.collection_id, snap);
  rev := private.collection_append_revision(ids.collection_id, snap, base, actor, ids.operation_id, ids.reason, 'draft');
  PERFORM private.collection_audit_event(ids.collection_id,'collection.copy',rev,private.collection_digest(snap),
    ref::text,rev::text,ids.operation_id,actor,ids.reason);
  result := private.collection_draft_result(ids.operation_id, rev, false);
 ELSE
  IF head.collection_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
  SELECT * INTO current FROM private.collection_revisions WHERE id=head.revision_id;
  IF (p_command->>'expected_digest') IS DISTINCT FROM current.digest THEN
   RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='ADM_CONFLICT';
  END IF;
  IF action = 'discard' THEN
   DELETE FROM private.collection_draft_heads WHERE collection_id=ids.collection_id;
   PERFORM private.collection_audit_event(ids.collection_id,'collection.discard',current.id,current.digest,
     current.id::text,NULL,ids.operation_id,actor,ids.reason);
   result := private.collection_draft_result(ids.operation_id, NULL, false);
  ELSE
   -- rebase: the caller names the publication it reviewed as the new base.
   IF ref IS DISTINCT FROM (base->>'publicationId')::uuid OR current.base_publication_id IS NOT DISTINCT FROM ref THEN
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='ADM_CONFLICT';
   END IF;
   PERFORM private.collection_assert_protected(ids.collection_id, current.snapshot);
   rev := private.collection_append_revision(ids.collection_id, current.snapshot, base, actor, ids.operation_id, ids.reason, 'draft');
   PERFORM private.collection_audit_event(ids.collection_id,'collection.rebase',rev,current.digest,
     current.base_publication_id::text,ref::text,ids.operation_id,actor,ids.reason);
   result := private.collection_draft_result(ids.operation_id, rev, false);
  END IF;
 END IF;
 PERFORM private.collection_finish_operation(actor::text, ids.operation_id, result);
 RETURN result;
END $$;

-- Impact reads now share the protected definition used by the writers.
CREATE OR REPLACE FUNCTION private.collection_impact(p_collection_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE evidence jsonb; active_pub uuid;
BEGIN
 SELECT publication_id INTO active_pub FROM private.collection_active_publications WHERE collection_id=p_collection_id;
 WITH releases AS (SELECT id FROM public.collection_releases WHERE collection_id=p_collection_id)
 SELECT jsonb_build_object(
  'sourceRevision', coalesce(active_pub::text,'none'),
  'protectedRecipeIds', coalesce((SELECT jsonb_agg(recipe_id ORDER BY recipe_id)
     FROM private.collection_protected_members(p_collection_id)), '[]'::jsonb),
  'eligibleBuyerCount', (SELECT count(DISTINCT e.user_id) FROM public.access_entitlements e JOIN releases r ON r.id=e.release_id
     WHERE e.state='active' AND e.revoked_at IS NULL AND e.valid_from<=now() AND (e.expires_at IS NULL OR e.expires_at>now())),
  'pendingLiveCount', (SELECT count(*) FROM private.purchase_orders po JOIN releases r ON r.id=po.release_id
     JOIN private.commercial_offers o ON o.id=po.offer_id
     WHERE o.provider_mode='live' AND po.attempt_state IN ('creating','creation_unknown','open','processing')),
  'offerIds', coalesce((SELECT jsonb_agg(o.id ORDER BY o.id) FROM private.commercial_offers o JOIN releases r ON r.id=o.release_id), '[]'::jsonb),
  'affectedCampaignSlugs', '[]'::jsonb,
  'checks', '[]'::jsonb)
 INTO evidence;
 RETURN jsonb_build_object('ok', true, 'value', evidence || jsonb_build_object(
  'token', private.collection_digest(evidence), 'checkedAt', now()));
END $$;

REVOKE ALL ON FUNCTION private.collection_protected_members(uuid), private.collection_begin_operation(text,uuid,text,uuid,jsonb),
 private.collection_finish_operation(text,uuid,jsonb), private.collection_validate_snapshot(jsonb,uuid),
 private.collection_assert_protected(uuid,jsonb), private.collection_active_base(uuid), private.collection_apply_slug(uuid,text),
 private.collection_append_revision(uuid,jsonb,jsonb,uuid,uuid,text,text),
 private.collection_audit_event(uuid,text,uuid,text,text,text,uuid,uuid,text), private.collection_command_ids(jsonb),
 private.collection_draft_result(uuid,uuid,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_collection_create(jsonb), public.admin_collection_draft_start(jsonb),
 public.admin_collection_draft_save(jsonb), public.admin_collection_draft_control(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_collection_create(jsonb), public.admin_collection_draft_start(jsonb),
 public.admin_collection_draft_save(jsonb), public.admin_collection_draft_control(jsonb) TO authenticated;
