-- Phase 2 Publishing Home: two narrow reads across the recipe and collection domains. Recent results are the
-- caller's own committed publication receipts; Continue work is open private drafts the caller may edit.
-- Each domain contributes rows only while the caller currently holds that domain's permission and its stage
-- is on. The operation ledgers and draft tables stay private; no request payload or reason is returned.

-- Caller check shared by both reads: signed in, aal2, console on, active membership. Returns the
-- caller's current permissions; each read then decides per domain.
CREATE FUNCTION private.admin_home_permissions() RETURNS text[]
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); console_stage text; perms text[];
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_AUTH_REQUIRED'; END IF;
 IF (auth.jwt()->>'aal') IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_MFA_REQUIRED'; END IF;
 SELECT stage INTO console_stage FROM private.admin_console_settings WHERE singleton;
 IF console_stage IS NULL OR console_stage='disabled' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DISABLED'; END IF;
 SELECT coalesce(array_agg(DISTINCT p ORDER BY p),'{}') INTO perms
 FROM private.admin_memberships m CROSS JOIN LATERAL unnest(private.admin_permissions(m.role)) p
 WHERE m.user_id=actor AND m.active;
 IF cardinality(perms)=0 THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED'; END IF;
 RETURN perms;
END $$;

CREATE FUNCTION private.admin_stage_at_least(p_stage text, p_minimum text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(p_stage,'disabled') <> 'disabled'
  AND array_position(ARRAY['disabled','inspection','editing','publication'],p_stage)
   >= array_position(ARRAY['disabled','inspection','editing','publication'],p_minimum)
$$;

-- At most p_limit (1-10) of the caller's committed recipe and collection publication results, newest first.
-- A collection publication reports whether its public refresh completed; recipe refresh is not tracked.
CREATE FUNCTION public.admin_home_publishing_results(p_limit int) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; perms text[]; console_stage text; collection_stage text; recipes_ok boolean; collections_ok boolean;
BEGIN
 perms := private.admin_home_permissions();
 actor := auth.uid();
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 SELECT stage INTO console_stage FROM private.admin_console_settings WHERE singleton;
 SELECT stage INTO collection_stage FROM private.collection_workspace_settings WHERE singleton;
 recipes_ok := 'recipe.read' = ANY(perms) AND private.admin_stage_at_least(console_stage,'inspection');
 collections_ok := 'collection.read' = ANY(perms) AND private.admin_stage_at_least(console_stage,'inspection')
  AND private.admin_stage_at_least(collection_stage,'inspection');
 RETURN coalesce((SELECT jsonb_agg(x.r ORDER BY x.at DESC, x.id DESC) FROM (
  SELECT u.r, u.at, u.id FROM (
   SELECT jsonb_build_object('operationId',o.operation_id,'domain','recipe','objectId',o.target,'title',c.title,
     'action',o.action,'noChange',coalesce((o.result->>'noChange')::boolean,false),'refreshState',NULL,
     'committedAt',o.committed_at) r, o.committed_at at, o.operation_id id
   FROM private.admin_operations o JOIN public.recipe_catalog c ON c.id=o.target
   WHERE recipes_ok AND o.actor_id=actor AND o.action IN ('revision.publish','recipe.withdraw','recipe.correct')
     AND o.result IS NOT NULL AND o.committed_at IS NOT NULL
   UNION ALL
   SELECT jsonb_build_object('operationId',o.operation_id,'domain','collection','objectId',o.collection_id,'title',rc.title,
     'action',o.action,'noChange',coalesce((o.result->>'noChange')::boolean,false),
     'refreshState',CASE WHEN coalesce((o.result->>'noChange')::boolean,false) THEN NULL
       WHEN j.state='complete' THEN 'complete' ELSE 'pending' END,
     'committedAt',o.committed_at), o.committed_at, o.operation_id
   FROM private.collection_operations o JOIN public.recipe_collections rc ON rc.id=o.collection_id
   LEFT JOIN private.collection_refresh_jobs j ON j.operation_id=o.operation_id
   WHERE collections_ok AND o.executor_id=actor::text AND o.action='collection.publish'
     AND o.result IS NOT NULL AND o.committed_at IS NOT NULL
  ) u ORDER BY u.at DESC, u.id DESC LIMIT p_limit) x),'[]'::jsonb);
END $$;

-- At most p_limit (1-10) open private drafts the caller may edit, most recently saved first.
CREATE FUNCTION public.admin_home_continue_work(p_limit int) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; perms text[]; console_stage text; collection_stage text; recipes_ok boolean; collections_ok boolean;
BEGIN
 perms := private.admin_home_permissions();
 actor := auth.uid();
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 SELECT stage INTO console_stage FROM private.admin_console_settings WHERE singleton;
 SELECT stage INTO collection_stage FROM private.collection_workspace_settings WHERE singleton;
 recipes_ok := 'recipe.edit' = ANY(perms) AND private.admin_stage_at_least(console_stage,'editing');
 collections_ok := 'collection.edit' = ANY(perms) AND private.admin_stage_at_least(console_stage,'editing')
  AND private.admin_stage_at_least(collection_stage,'editing');
 RETURN coalesce((SELECT jsonb_agg(x.r ORDER BY x.at DESC, x.id DESC) FROM (
  SELECT u.r, u.at, u.id FROM (
   SELECT jsonb_build_object('domain','recipe','objectId',d.recipe_id,
     'title',coalesce(nullif(rv.snapshot#>>'{catalog,title}',''),c.title),'state',d.lifecycle,'version',rv.version,
     'savedAt',rv.saved_at,'savedByYou',rv.actor_id=actor) r, rv.saved_at at, d.recipe_id id
   FROM private.recipe_drafts d JOIN private.recipe_revisions rv ON rv.id=d.current_revision_id
   JOIN public.recipe_catalog c ON c.id=d.recipe_id
   WHERE recipes_ok AND d.workflow_schema=1 AND d.lifecycle IN ('draft','submitted','approved','changes_requested','rejected')
   UNION ALL
   SELECT jsonb_build_object('domain','collection','objectId',h.collection_id,
     'title',coalesce(nullif(rv.snapshot->>'title',''),rc.title),'state',h.state,'version',h.version,
     'savedAt',rv.saved_at,'savedByYou',rv.saved_by=actor), rv.saved_at, h.collection_id
   FROM private.collection_draft_heads h JOIN private.collection_revisions rv ON rv.id=h.revision_id
   JOIN public.recipe_collections rc ON rc.id=h.collection_id
   WHERE collections_ok
  ) u ORDER BY u.at DESC, u.id DESC LIMIT p_limit) x),'[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION private.admin_home_permissions(), private.admin_stage_at_least(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_home_publishing_results(int), public.admin_home_continue_work(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_home_publishing_results(int), public.admin_home_continue_work(int) TO authenticated;
