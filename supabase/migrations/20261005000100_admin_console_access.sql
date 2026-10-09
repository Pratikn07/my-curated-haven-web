-- Console authority is independent of legacy recipe inspection roles.
CREATE TABLE private.admin_memberships (
 user_id uuid NOT NULL REFERENCES auth.users(id),
 role text NOT NULL CHECK(role IN ('owner','viewer','editor','reviewer','publisher')),
 active boolean NOT NULL DEFAULT true,
 granted_by uuid NOT NULL REFERENCES auth.users(id), granted_at timestamptz NOT NULL DEFAULT now(),
 revoked_by uuid REFERENCES auth.users(id), revoked_at timestamptz,
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 1000),
 PRIMARY KEY(user_id,role)
);
CREATE UNIQUE INDEX admin_one_active_owner ON private.admin_memberships(role) WHERE role='owner' AND active;
CREATE TABLE private.admin_console_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 stage text NOT NULL DEFAULT 'disabled' CHECK(stage IN ('disabled','inspection','editing','publication')),
 campaign_revision text, updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid REFERENCES auth.users(id), reason text
);
INSERT INTO private.admin_console_settings(singleton) VALUES(true);
CREATE TABLE private.admin_operations (
 actor_id uuid NOT NULL REFERENCES auth.users(id), operation_id uuid NOT NULL,
 action text NOT NULL, target uuid, request_hash text NOT NULL, result jsonb,
 committed_at timestamptz, PRIMARY KEY(actor_id,operation_id)
);
CREATE TABLE private.admin_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES auth.users(id),
 action text NOT NULL, recipe_id uuid, revision_id uuid, digest text,
 before_ref text, after_ref text, request_id uuid NOT NULL,
 at timestamptz NOT NULL DEFAULT now(), reason text, result text NOT NULL
);
REVOKE ALL ON private.admin_memberships,private.admin_console_settings,private.admin_operations,private.admin_audit FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.admin_memberships,private.admin_console_settings,private.admin_operations,private.admin_audit TO service_role;
ALTER TABLE private.admin_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.admin_console_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.admin_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.admin_audit ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION private.admin_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_IMMUTABLE'; END $$;
CREATE TRIGGER admin_audit_immutable BEFORE UPDATE OR DELETE ON private.admin_audit FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
CREATE FUNCTION private.admin_protect_owner() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF OLD.role='owner' AND OLD.active THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_OWNER_PROTECTED';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER admin_owner_protected BEFORE UPDATE OR DELETE ON private.admin_memberships FOR EACH ROW EXECUTE FUNCTION private.admin_protect_owner();
CREATE FUNCTION private.admin_permissions(p_role text) RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE p_role
 WHEN 'owner' THEN ARRAY['recipe.read','recipe.edit','recipe.review','recipe.publish','recipe.withdraw','recipe.emergency_withdraw','team.manage']
 WHEN 'viewer' THEN ARRAY['recipe.read']
 WHEN 'editor' THEN ARRAY['recipe.read','recipe.edit']
 WHEN 'reviewer' THEN ARRAY['recipe.read','recipe.review']
 WHEN 'publisher' THEN ARRAY['recipe.read','recipe.publish','recipe.withdraw']
 ELSE ARRAY[]::text[] END
$$;
CREATE FUNCTION private.admin_assert(p_permission text,p_stage text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); current_stage text;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_AUTH_REQUIRED'; END IF;
 IF (auth.jwt()->>'aal') IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_MFA_REQUIRED'; END IF;
 SELECT stage INTO current_stage FROM private.admin_console_settings WHERE singleton FOR SHARE;
 IF current_stage IS NULL OR array_position(ARRAY['disabled','inspection','editing','publication'],current_stage)<array_position(ARRAY['disabled','inspection','editing','publication'],p_stage) OR current_stage='disabled' THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_DISABLED';
 END IF;
 IF p_stage NOT IN ('inspection','editing','publication') THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ADM_INVALID'; END IF;
 PERFORM 1 FROM private.admin_memberships WHERE user_id=actor AND active FOR SHARE;
 IF NOT EXISTS(SELECT 1 FROM private.admin_memberships WHERE user_id=actor AND active AND p_permission=ANY(private.admin_permissions(role))) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_DENIED';
 END IF;
 RETURN actor;
END $$;
CREATE FUNCTION private.admin_begin_operation(p_actor uuid,p_id uuid,p_action text,p_target uuid,p_request jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE fingerprint text:=encode(extensions.digest(convert_to(p_request::text,'UTF8'),'sha256'),'hex'); previous private.admin_operations;
BEGIN
 IF p_actor IS DISTINCT FROM auth.uid() OR p_id IS NULL OR p_request IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ADM_INVALID'; END IF;
 INSERT INTO private.admin_operations(actor_id,operation_id,action,target,request_hash) VALUES(p_actor,p_id,p_action,p_target,fingerprint) ON CONFLICT DO NOTHING;
 SELECT * INTO previous FROM private.admin_operations WHERE actor_id=p_actor AND operation_id=p_id FOR UPDATE;
 IF previous.request_hash<>fingerprint OR previous.action<>p_action OR previous.target IS DISTINCT FROM p_target THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ADM_INVALID'; END IF;
 RETURN previous.result;
END $$;
CREATE FUNCTION private.admin_finish_operation(p_actor uuid,p_id uuid,p_receipt jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 UPDATE private.admin_operations SET result=p_receipt,committed_at=now() WHERE actor_id=p_actor AND operation_id=p_id AND result IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ADM_INVALID'; END IF;
END $$;
CREATE FUNCTION public.admin_console_context() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); operator jsonb; current_stage text;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_AUTH_REQUIRED'; END IF;
 SELECT stage INTO current_stage FROM private.admin_console_settings WHERE singleton;
 IF current_stage='disabled' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_DISABLED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM private.admin_memberships WHERE user_id=actor AND active) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_DENIED'; END IF;
 SELECT jsonb_build_object('id',actor,'email',u.email,'roles',(SELECT jsonb_agg(role ORDER BY role) FROM private.admin_memberships WHERE user_id=actor AND active),
 'permissions',(SELECT jsonb_agg(permission ORDER BY permission) FROM (SELECT DISTINCT unnest(private.admin_permissions(role)) permission FROM private.admin_memberships WHERE user_id=actor AND active) p))
 INTO operator FROM auth.users u WHERE u.id=actor;
 RETURN jsonb_build_object('stage',current_stage,'operator',operator,'assurance',CASE WHEN auth.jwt()->>'aal'='aal2' THEN 'aal2' ELSE 'aal1' END);
END $$;
CREATE FUNCTION public.is_console_recipe_reader() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND auth.jwt()->>'aal'='aal2'
 AND EXISTS(SELECT 1 FROM private.admin_console_settings WHERE singleton AND stage<>'disabled')
 AND EXISTS(SELECT 1 FROM private.admin_memberships WHERE user_id=auth.uid() AND active AND 'recipe.read'=ANY(private.admin_permissions(role)))
$$;
CREATE POLICY "Console staff can read recipe catalog" ON public.recipe_catalog FOR SELECT TO authenticated USING((SELECT public.is_console_recipe_reader()));
CREATE POLICY "Console staff can read recipe bodies" ON public.recipe_bodies FOR SELECT TO authenticated USING((SELECT public.is_console_recipe_reader()));
CREATE FUNCTION private.admin_staff_row(p_user uuid) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$
 SELECT jsonb_build_object('userId',u.id,'email',u.email,'roles',coalesce(jsonb_agg(m.role ORDER BY m.role) FILTER(WHERE m.active),'[]'::jsonb),
 'active',coalesce(bool_or(m.active),false),'grantedBy',max(m.granted_by::text),'grantedAt',max(m.granted_at),'revokedBy',max(m.revoked_by::text),'revokedAt',max(m.revoked_at))
 FROM auth.users u JOIN private.admin_memberships m ON m.user_id=u.id WHERE u.id=p_user GROUP BY u.id,u.email
$$;
CREATE FUNCTION public.admin_staff_list() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.admin_assert('team.manage','inspection');
 RETURN coalesce((SELECT jsonb_agg(private.admin_staff_row(user_id) ORDER BY user_id) FROM (SELECT DISTINCT user_id FROM private.admin_memberships) s),'[]'::jsonb);
END $$;
CREATE FUNCTION public.admin_staff_lookup(p_email text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE normalized text:=lower(trim(p_email)); matches uuid[]; target auth.users;
BEGIN
 PERFORM private.admin_assert('team.manage','inspection');
 IF normalized IS NULL OR length(normalized)>320 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ADM_INVALID'; END IF;
 SELECT array_agg(DISTINCT u.id) INTO matches FROM auth.users u WHERE lower(trim(u.email))=normalized OR EXISTS(
 SELECT 1 FROM auth.identities i WHERE i.user_id=u.id AND lower(trim(i.identity_data->>'email'))=normalized);
 IF coalesce(cardinality(matches),0)=0 THEN RETURN jsonb_build_object('status','not_found'); END IF;
 IF cardinality(matches)>1 THEN RETURN jsonb_build_object('status','ambiguous'); END IF;
 SELECT * INTO target FROM auth.users WHERE id=matches[1];
 IF target.email_confirmed_at IS NULL THEN RETURN jsonb_build_object('status','unconfirmed'); END IF;
 RETURN jsonb_build_object('status','found','match',jsonb_build_object('userId',target.id,'email',target.email));
END $$;
CREATE FUNCTION public.admin_staff_assign(p_user_id uuid,p_roles text[],p_reason text,p_operation_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; receipt jsonb; target auth.users; normalized text[]; lookup jsonb;
BEGIN
 actor:=private.admin_assert('team.manage','inspection');
 IF p_roles IS NULL OR cardinality(p_roles)=0 OR EXISTS(SELECT 1 FROM unnest(p_roles) r WHERE r IS NULL OR r NOT IN ('viewer','editor','reviewer','publisher')) OR length(trim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ADM_INVALID'; END IF;
 SELECT array_agg(DISTINCT r ORDER BY r) INTO normalized FROM unnest(p_roles) r;
 receipt:=private.admin_begin_operation(actor,p_operation_id,'staff.assign',p_user_id,jsonb_build_object('roles',normalized,'reason',p_reason));
 IF receipt IS NOT NULL THEN RETURN receipt; END IF;
 SELECT * INTO target FROM auth.users WHERE id=p_user_id FOR SHARE;
 IF NOT FOUND OR target.email_confirmed_at IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ADM_INVALID'; END IF;
 lookup:=public.admin_staff_lookup(target.email);
 IF lookup->>'status'<>'found' OR (lookup->'match'->>'userId')::uuid<>p_user_id THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ADM_INVALID'; END IF;
 IF EXISTS(SELECT 1 FROM private.admin_memberships WHERE user_id=p_user_id AND role='owner' AND active) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_OWNER_PROTECTED'; END IF;
 -- Serialize changes even for a staff account with no previous membership rows.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 UPDATE private.admin_memberships SET active=false,revoked_by=actor,revoked_at=now(),reason=p_reason WHERE user_id=p_user_id AND active AND NOT(role=ANY(normalized));
 INSERT INTO private.admin_memberships(user_id,role,granted_by,reason)
 SELECT p_user_id,r,actor,p_reason FROM unnest(normalized) r
 ON CONFLICT(user_id,role) DO UPDATE SET active=true,granted_by=actor,granted_at=now(),revoked_by=NULL,revoked_at=NULL,reason=p_reason;
 INSERT INTO private.admin_audit(actor_id,action,request_id,after_ref,reason,result) VALUES(actor,'staff.assign',p_operation_id,p_user_id::text,p_reason,'success');
 receipt:=private.admin_staff_row(p_user_id);
 PERFORM private.admin_finish_operation(actor,p_operation_id,receipt); RETURN receipt;
END $$;
CREATE FUNCTION public.admin_staff_revoke(p_user_id uuid,p_reason text,p_operation_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; receipt jsonb;
BEGIN
 actor:=private.admin_assert('team.manage','inspection');
 IF length(trim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ADM_INVALID'; END IF;
 receipt:=private.admin_begin_operation(actor,p_operation_id,'staff.revoke',p_user_id,jsonb_build_object('reason',p_reason));
 IF receipt IS NOT NULL THEN RETURN receipt; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 IF EXISTS(SELECT 1 FROM private.admin_memberships WHERE user_id=p_user_id AND role='owner' AND active) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_OWNER_PROTECTED'; END IF;
 UPDATE private.admin_memberships SET active=false,revoked_by=actor,revoked_at=now(),reason=p_reason WHERE user_id=p_user_id AND active;
 receipt:=private.admin_staff_row(p_user_id);
 IF receipt IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ADM_INVALID'; END IF;
 INSERT INTO private.admin_audit(actor_id,action,request_id,after_ref,reason,result) VALUES(actor,'staff.revoke',p_operation_id,p_user_id::text,p_reason,'success');
 PERFORM private.admin_finish_operation(actor,p_operation_id,receipt); RETURN receipt;
END $$;
-- Revoke default function EXECUTE; only narrow public entry points cross the private schema.
REVOKE ALL ON FUNCTION private.admin_immutable(),private.admin_protect_owner(),private.admin_permissions(text),private.admin_assert(text,text),private.admin_begin_operation(uuid,uuid,text,uuid,jsonb),private.admin_finish_operation(uuid,uuid,jsonb),private.admin_staff_row(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_console_context(),public.is_console_recipe_reader(),public.admin_staff_list(),public.admin_staff_lookup(text),public.admin_staff_assign(uuid,text[],text,uuid),public.admin_staff_revoke(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_console_context(),public.is_console_recipe_reader(),public.admin_staff_list(),public.admin_staff_lookup(text),public.admin_staff_assign(uuid,text[],text,uuid),public.admin_staff_revoke(uuid,text,uuid) TO authenticated;
