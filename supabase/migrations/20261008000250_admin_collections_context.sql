-- The console context also reports the collection stage, so navigation offers Collections only
-- while that workspace is switched on. Authority is still checked by every collection RPC.
CREATE OR REPLACE FUNCTION public.admin_console_context() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); operator jsonb; current_stage text; collection_stage text;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_AUTH_REQUIRED'; END IF;
 SELECT stage INTO current_stage FROM private.admin_console_settings WHERE singleton;
 IF current_stage='disabled' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_DISABLED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM private.admin_memberships WHERE user_id=actor AND active) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_DENIED'; END IF;
 SELECT stage INTO collection_stage FROM private.collection_workspace_settings WHERE singleton;
 SELECT jsonb_build_object('id',actor,'email',u.email,'roles',(SELECT jsonb_agg(role ORDER BY role) FROM private.admin_memberships WHERE user_id=actor AND active),
 'permissions',(SELECT jsonb_agg(permission ORDER BY permission) FROM (SELECT DISTINCT unnest(private.admin_permissions(role)) permission FROM private.admin_memberships WHERE user_id=actor AND active) p))
 INTO operator FROM auth.users u WHERE u.id=actor;
 RETURN jsonb_build_object('stage',current_stage,'collectionStage',coalesce(collection_stage,'disabled'),'operator',operator,
  'assurance',CASE WHEN auth.jwt()->>'aal'='aal2' THEN 'aal2' ELSE 'aal1' END);
END $$;
