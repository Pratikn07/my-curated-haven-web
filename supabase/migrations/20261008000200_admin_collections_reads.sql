-- Phase 2: protected collection reads. Identity always comes from verified Auth through
-- private.collection_assert; responses are camelCase JSON decoded strictly by the web app.

-- A collection's presented snapshot: the current publication, else the open draft, else the identity row.
CREATE FUNCTION private.collection_current_snapshot(p_collection_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(
  (SELECT p.snapshot FROM private.collection_active_publications a
    JOIN private.collection_publications p ON p.id=a.publication_id WHERE a.collection_id=p_collection_id),
  (SELECT r.snapshot FROM private.collection_draft_heads h
    JOIN private.collection_revisions r ON r.id=h.revision_id WHERE h.collection_id=p_collection_id),
  (SELECT jsonb_build_object('collectionId',c.id,'slug',c.slug,'title',c.title,'tagline','','story',c.public_summary,
     'forWhen','','refresh','','shelf','','sortOrder',0,'stage',jsonb_build_object('min',null,'max',null),
     'series',null,'listingState',c.listing_state,'availability','coming-soon','cloth','','cover',null,
     'members','[]'::jsonb)
   FROM public.recipe_collections c WHERE c.id=p_collection_id))
$$;

-- Read-only commerce summary. Shown beside, never merged with, publication state.
CREATE FUNCTION private.collection_commerce_state(p_collection_id uuid) RETURNS text
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT CASE
  WHEN bool_or(o.sale_enabled) THEN 'enabled'
  WHEN count(o.id) > 0 THEN 'disabled'
  ELSE 'no_offer' END
 FROM public.collection_releases r
 LEFT JOIN private.commercial_offers o ON o.release_id=r.id
 WHERE r.collection_id=p_collection_id
$$;

-- Aggregate buyer and purchase-protection evidence. No customer identities leave this function.
-- Protected members: every recipe in a release that is sealed/retired or has any purchase,
-- entitlement, open checkout or enabled live offer. Task 8 extends this into full readiness.
CREATE FUNCTION private.collection_impact(p_collection_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE evidence jsonb; active_pub uuid;
BEGIN
 SELECT publication_id INTO active_pub FROM private.collection_active_publications WHERE collection_id=p_collection_id;
 WITH releases AS (SELECT id, state FROM public.collection_releases WHERE collection_id=p_collection_id),
 committed AS (
  SELECT r.id FROM releases r
  WHERE r.state IN ('sealed','retired')
   OR EXISTS(SELECT 1 FROM private.purchase_orders po WHERE po.release_id=r.id)
   OR EXISTS(SELECT 1 FROM public.access_entitlements e WHERE e.release_id=r.id)
   OR EXISTS(SELECT 1 FROM private.commercial_offers o WHERE o.release_id=r.id AND o.sale_enabled AND o.provider_mode='live'))
 SELECT jsonb_build_object(
  'sourceRevision', coalesce(active_pub::text,'none'),
  'protectedRecipeIds', coalesce((SELECT jsonb_agg(DISTINCT cr.recipe_id ORDER BY cr.recipe_id)
     FROM public.collection_recipes cr JOIN committed c ON c.id=cr.release_id), '[]'::jsonb),
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

CREATE FUNCTION private.collection_revision_json(p_revision_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',r.id,'collectionId',r.collection_id,'version',r.version,'digest',r.digest,
  'base',jsonb_build_object('publicationId',r.base_publication_id,'digest',r.base_digest),
  'state',CASE WHEN h.revision_id=r.id THEN h.state ELSE 'superseded' END,
  'submissionId',CASE WHEN h.revision_id=r.id THEN h.submission_id END,
  'snapshot',r.snapshot,'savedAt',r.saved_at,'savedBy',r.saved_by)
 FROM private.collection_revisions r
 LEFT JOIN private.collection_draft_heads h ON h.collection_id=r.collection_id
 WHERE r.id=p_revision_id
$$;

CREATE FUNCTION private.collection_row(p_collection_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 WITH snap AS (SELECT private.collection_current_snapshot(p_collection_id) s),
 pub AS (SELECT a.publication_id, p.snapshot FROM private.collection_active_publications a
   JOIN private.collection_publications p ON p.id=a.publication_id WHERE a.collection_id=p_collection_id),
 head AS (SELECT h.state, r.snapshot FROM private.collection_draft_heads h
   JOIN private.collection_revisions r ON r.id=h.revision_id WHERE h.collection_id=p_collection_id)
 SELECT jsonb_build_object('collectionId',c.id,'slug',c.slug,'title',snap.s->>'title','shelf',snap.s->>'shelf',
  'stage',snap.s->'stage','series',snap.s->'series',
  'listingState',coalesce((SELECT snapshot->>'listingState' FROM pub),c.listing_state),
  'availability',snap.s->>'availability',
  'publicationId',(SELECT publication_id FROM pub),
  'publishedCount',coalesce((SELECT jsonb_array_length(snapshot->'members') FROM pub),0),
  'draftCount',(SELECT jsonb_array_length(snapshot->'members') FROM head),
  'workingState',(SELECT state FROM head),
  'needsAttention',coalesce((SELECT state IN ('submitted','approved','changes_requested') FROM head),false),
  'commerceState',private.collection_commerce_state(c.id),
  'changedAt',greatest(c.updated_at,
     (SELECT max(at) FROM private.collection_audit WHERE collection_id=c.id)))
 FROM public.recipe_collections c, snap WHERE c.id=p_collection_id
$$;

CREATE FUNCTION public.admin_collection_library(p_query jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 q text := lower(left(coalesce(p_query->>'q',''),200));
 page int := coalesce((p_query->>'page')::int,1);
 shelves text[] := ARRAY(SELECT jsonb_array_elements_text(coalesce(p_query->'shelf','[]'::jsonb)));
 stages text[] := ARRAY(SELECT jsonb_array_elements_text(coalesce(p_query->'stage','[]'::jsonb)));
 statuses text[] := ARRAY(SELECT jsonb_array_elements_text(coalesce(p_query->'status','[]'::jsonb)));
 draft_filter boolean := (p_query->>'draft')::boolean;
 attention boolean := coalesce((p_query->>'attention')::boolean,false);
 result jsonb;
BEGIN
 PERFORM private.collection_assert('collection.read','inspection');
 IF page < 1 OR page > 1000 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 WITH rows AS (SELECT private.collection_row(c.id) r FROM public.recipe_collections c),
 filtered AS (
  SELECT r FROM rows
  WHERE (q='' OR position(q IN lower(r->>'title'))>0 OR position(q IN lower(r->>'slug'))>0)
   AND (cardinality(shelves)=0 OR r->>'shelf'=ANY(shelves))
   AND (cardinality(statuses)=0
     OR ('published'=ANY(statuses) AND r->>'publicationId' IS NOT NULL)
     OR ('unpublished'=ANY(statuses) AND r->>'publicationId' IS NULL)
     OR (r->>'listingState'=ANY(statuses)))
   AND (draft_filter IS NULL OR (r->>'workingState' IS NOT NULL)=draft_filter)
   AND (NOT attention OR (r->>'needsAttention')::boolean)
   AND (cardinality(stages)=0 OR r#>>'{stage,min}' IS NULL OR EXISTS(
     SELECT 1 FROM (VALUES ('6-12m',6,12),('1-2y',12,24),('2-4y',24,48)) band(k,lo,hi)
     WHERE band.k=ANY(stages) AND (r#>>'{stage,min}')::int<band.hi
       AND (r#>>'{stage,max}' IS NULL OR (r#>>'{stage,max}')::int>band.lo))))
 SELECT jsonb_build_object(
  'rows',coalesce((SELECT jsonb_agg(r ORDER BY lower(r->>'title'), r->>'collectionId')
     FROM (SELECT r FROM filtered ORDER BY lower(r->>'title'), r->>'collectionId' LIMIT 25 OFFSET (page-1)*25) p),'[]'::jsonb),
  'filteredTotal',(SELECT count(*) FROM filtered),
  'page',page,'pageSize',25,'checkedAt',now())
 INTO result;
 RETURN result;
END $$;

CREATE FUNCTION public.admin_collection_history(p_collection_id uuid, p_cursor text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cursor_at timestamptz; cursor_id uuid; events jsonb; last jsonb;
BEGIN
 PERFORM private.collection_assert('collection.read','inspection');
 IF NOT EXISTS(SELECT 1 FROM public.recipe_collections WHERE id=p_collection_id) THEN
  RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND';
 END IF;
 IF p_cursor IS NOT NULL THEN
  BEGIN
   cursor_at := split_part(p_cursor,'|',1)::timestamptz;
   cursor_id := split_part(p_cursor,'|',2)::uuid;
  EXCEPTION WHEN others THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
  END;
 END IF;
 SELECT coalesce(jsonb_agg(e ORDER BY ord),'[]'::jsonb) INTO events FROM (
  SELECT row_number() OVER (ORDER BY a.at DESC, a.id DESC) ord,
   jsonb_build_object('id',a.id,'action',a.action,'at',a.at,'reason',a.reason,'humanAuthoriser',a.human_authoriser,
    'authoriserEmail',(SELECT u.email FROM auth.users u WHERE u.id=a.human_authoriser),
    'executor',a.executor_id,'executorType',a.executor_type,'beforeRef',a.before_ref,'afterRef',a.after_ref,
    'operationId',a.operation_id) e
  FROM private.collection_audit a
  WHERE a.collection_id=p_collection_id AND (cursor_at IS NULL OR (a.at,a.id) < (cursor_at,cursor_id))
  ORDER BY a.at DESC, a.id DESC LIMIT 26) page;
 IF jsonb_array_length(events) > 25 THEN
  events := events - 25;
  last := events->24;
  RETURN jsonb_build_object('events',events,'nextCursor',(last->>'at')||'|'||(last->>'id'));
 END IF;
 RETURN jsonb_build_object('events',events,'nextCursor',null);
END $$;

CREATE FUNCTION public.admin_collection_detail(p_collection_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE published jsonb; working jsonb; published_digest text; working_digest text; history jsonb; impact jsonb;
BEGIN
 PERFORM private.collection_assert('collection.read','inspection');
 IF NOT EXISTS(SELECT 1 FROM public.recipe_collections WHERE id=p_collection_id) THEN
  RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND';
 END IF;
 SELECT jsonb_build_object('publicationId',p.id,'releaseId',p.release_id,'snapshot',p.snapshot), p.digest
  INTO published, published_digest
  FROM private.collection_active_publications a JOIN private.collection_publications p ON p.id=a.publication_id
  WHERE a.collection_id=p_collection_id;
 SELECT private.collection_revision_json(h.revision_id), r.digest INTO working, working_digest
  FROM private.collection_draft_heads h JOIN private.collection_revisions r ON r.id=h.revision_id
  WHERE h.collection_id=p_collection_id;
 history := public.admin_collection_history(p_collection_id,NULL);
 impact := private.collection_impact(p_collection_id);
 RETURN jsonb_build_object(
  'collectionId',p_collection_id,
  'identity',(SELECT jsonb_build_object('slug',slug,'title',title) FROM public.recipe_collections WHERE id=p_collection_id),
  'sourceMode',coalesce((SELECT source_mode FROM private.collection_sources WHERE collection_id=p_collection_id),'legacy'),
  'commerceState',private.collection_commerce_state(p_collection_id),
  'published',published,
  'working',working,
  -- Task 8 replaces this placeholder with evaluated readiness; until then nothing is ready.
  'readiness',jsonb_build_object('digest',coalesce(working_digest,published_digest,private.collection_digest('{}'::jsonb)),
    'checks','[]'::jsonb,'readyForApproval',false,'readyToPublish',false,'needsVerification',true),
  'impact',impact,
  -- Titles for every recipe the screen names: published, draft and protected members.
  'recipes',coalesce((SELECT jsonb_agg(jsonb_build_object('recipeId',c.id,'slug',c.slug,'title',c.title,
      'publication',c.publication_state) ORDER BY c.id)
    FROM public.recipe_catalog c WHERE c.id IN (
      SELECT (m->>'recipeId')::uuid FROM jsonb_array_elements(coalesce(published#>'{snapshot,members}','[]'::jsonb)) m
      UNION SELECT (m->>'recipeId')::uuid FROM jsonb_array_elements(coalesce(working#>'{snapshot,members}','[]'::jsonb)) m
      UNION SELECT (x#>>'{}')::uuid FROM jsonb_array_elements(coalesce(impact#>'{value,protectedRecipeIds}','[]'::jsonb)) x)),'[]'::jsonb),
  'history',history->'events',
  'historyCursor',history->'nextCursor',
  'checkedAt',now());
END $$;

-- Existing recipes an editor can place in a collection. Recipe review stays in the recipe workflow.
CREATE FUNCTION public.admin_collection_catalog(p_query jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q text := lower(left(coalesce(p_query->>'q',''),200)); page int := coalesce((p_query->>'page')::int,1);
BEGIN
 PERFORM private.collection_assert('collection.read','inspection');
 IF page < 1 OR page > 1000 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 RETURN (WITH matches AS (
   SELECT c.id, c.slug, c.title, c.publication_state, c.total_minutes, c.meal_labels, c.diet_labels, b.content_version
   FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id=c.id
   WHERE q='' OR position(q IN lower(c.title))>0 OR position(q IN lower(c.slug))>0)
  SELECT jsonb_build_object(
   'rows',coalesce((SELECT jsonb_agg(jsonb_build_object('recipeId',m.id,'slug',m.slug,'title',m.title,
      'publication',m.publication_state,'contentVersion',m.content_version,'activeHash',private.admin_active_hash(m.id),
      'totalMinutes',m.total_minutes,'mealLabels',to_jsonb(m.meal_labels),'dietLabels',to_jsonb(m.diet_labels))
      ORDER BY lower(m.title), m.id)
     FROM (SELECT * FROM matches ORDER BY lower(title), id LIMIT 25 OFFSET (page-1)*25) m),'[]'::jsonb),
   'filteredTotal',(SELECT count(*) FROM matches),'page',page,'pageSize',25,'checkedAt',now()));
END $$;

REVOKE ALL ON FUNCTION private.collection_current_snapshot(uuid), private.collection_commerce_state(uuid),
 private.collection_impact(uuid), private.collection_revision_json(uuid), private.collection_row(uuid)
 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_collection_library(jsonb), public.admin_collection_history(uuid,text),
 public.admin_collection_detail(uuid), public.admin_collection_catalog(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_collection_library(jsonb), public.admin_collection_history(uuid,text),
 public.admin_collection_detail(uuid), public.admin_collection_catalog(jsonb) TO authenticated;
