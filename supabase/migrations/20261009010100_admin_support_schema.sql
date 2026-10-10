-- Phase 3: opt-in support authority.
--
-- Two console roles see customer purchases: support_viewer (read only) and support_operator (read, cases, provider
-- checks, preparing repairs and applying approved ones). Approving repairs, refunds and dispute notices is
-- owner-only. Recipe and collection roles get no support permission, and support roles get no recipe access.
-- Support has its own stage, independent of the recipe console stage, and starts disabled. Nothing here registers
-- a real user, reads a customer record or enables anything in production.

ALTER TABLE private.admin_memberships DROP CONSTRAINT admin_memberships_role_check,
 ADD CONSTRAINT admin_memberships_role_check
 CHECK (role IN ('owner','viewer','editor','reviewer','publisher','support_viewer','support_operator'));

CREATE OR REPLACE FUNCTION private.admin_permissions(p_role text) RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE p_role
 WHEN 'owner' THEN ARRAY['recipe.read','recipe.edit','recipe.review','recipe.publish','recipe.withdraw','recipe.emergency_withdraw','team.manage',
   'collection.read','collection.edit','collection.review','collection.publish',
   'support.read','support.case.write','support.provider.inspect','support.repair.prepare','support.repair.approve',
   'support.repair.execute','support.refund.prepare','support.refund.approve','support.refund.execute',
   'support.notice.prepare','support.notice.approve','support.notice.send']
 WHEN 'viewer' THEN ARRAY['recipe.read','collection.read']
 WHEN 'editor' THEN ARRAY['recipe.read','recipe.edit','collection.read','collection.edit']
 WHEN 'reviewer' THEN ARRAY['recipe.read','recipe.review','collection.read','collection.review']
 WHEN 'publisher' THEN ARRAY['recipe.read','recipe.publish','recipe.withdraw','collection.read','collection.publish']
 WHEN 'support_viewer' THEN ARRAY['support.read']
 WHEN 'support_operator' THEN ARRAY['support.read','support.case.write','support.provider.inspect','support.repair.prepare',
   'support.repair.execute']
 ELSE ARRAY[]::text[] END
$$;

-- Support stages unlock in order: inspection (lookup, explanation, cases), diagnosis (provider checks, proposals),
-- repair (approved repairs). Refund and notice sending have their own gates later.
CREATE TABLE private.support_workspace_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 stage text NOT NULL DEFAULT 'disabled' CHECK (stage IN ('disabled','inspection','diagnosis','repair')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid REFERENCES auth.users(id),
 reason text
);
INSERT INTO private.support_workspace_settings(singleton) VALUES (true);

-- Per-actor, per-minute counters for internal wrappers (lookups, provider checks). Rows are disposable.
CREATE TABLE private.support_rate_buckets (
 actor_id uuid NOT NULL,
 kind text NOT NULL,
 minute timestamptz NOT NULL,
 used integer NOT NULL CHECK (used >= 1),
 PRIMARY KEY (actor_id, kind, minute)
);

ALTER TABLE private.support_workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.support_rate_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.support_workspace_settings, private.support_rate_buckets FROM PUBLIC, anon, authenticated;

-- Current membership, MFA and the support stage. The recipe console stage is not consulted, so support can be
-- open while recipe editing is switched off (and the reverse). Lock waits are bounded like every admin writer.
CREATE FUNCTION private.support_assert(p_permission text, p_stage text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); current_stage text;
 stages constant text[] := ARRAY['disabled','inspection','diagnosis','repair'];
BEGIN
 IF p_permission NOT IN ('support.read','support.case.write','support.provider.inspect','support.repair.prepare',
   'support.repair.approve','support.repair.execute','support.refund.prepare','support.refund.approve',
   'support.refund.execute','support.notice.prepare','support.notice.approve','support.notice.send')
   OR p_stage IS NULL OR p_stage NOT IN ('inspection','diagnosis','repair') THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 PERFORM set_config('lock_timeout', '5000', true);
 IF actor IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_AUTH_REQUIRED'; END IF;
 IF (auth.jwt()->>'aal') IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_MFA_REQUIRED'; END IF;
 SELECT stage INTO current_stage FROM private.support_workspace_settings WHERE singleton FOR SHARE;
 IF current_stage IS NULL OR current_stage = 'disabled'
    OR array_position(stages, current_stage) < array_position(stages, p_stage) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DISABLED';
 END IF;
 PERFORM 1 FROM private.admin_memberships WHERE user_id = actor AND active FOR SHARE;
 IF NOT EXISTS (SELECT 1 FROM private.admin_memberships
   WHERE user_id = actor AND active AND p_permission = ANY(private.admin_permissions(role))) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED';
 END IF;
 RETURN actor;
END $$;

-- The console context also reports the support stage. A switched-off recipe console stays closed to everyone
-- except staff who can read support while support is on; their context shows the recipe stage as disabled.
CREATE OR REPLACE FUNCTION public.admin_console_context() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); operator jsonb; current_stage text; collection_stage text; support_stage text;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_AUTH_REQUIRED'; END IF;
 SELECT stage INTO current_stage FROM private.admin_console_settings WHERE singleton;
 SELECT stage INTO support_stage FROM private.support_workspace_settings WHERE singleton;
 IF NOT EXISTS(SELECT 1 FROM private.admin_memberships WHERE user_id=actor AND active) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_DENIED'; END IF;
 IF current_stage='disabled' AND NOT (coalesce(support_stage,'disabled')<>'disabled' AND EXISTS(
   SELECT 1 FROM private.admin_memberships WHERE user_id=actor AND active AND 'support.read'=ANY(private.admin_permissions(role)))) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_DISABLED';
 END IF;
 SELECT stage INTO collection_stage FROM private.collection_workspace_settings WHERE singleton;
 SELECT jsonb_build_object('id',actor,'email',u.email,'roles',(SELECT jsonb_agg(role ORDER BY role) FROM private.admin_memberships WHERE user_id=actor AND active),
 'permissions',(SELECT jsonb_agg(permission ORDER BY permission) FROM (SELECT DISTINCT unnest(private.admin_permissions(role)) permission FROM private.admin_memberships WHERE user_id=actor AND active) p))
 INTO operator FROM auth.users u WHERE u.id=actor;
 RETURN jsonb_build_object('stage',current_stage,'collectionStage',coalesce(collection_stage,'disabled'),
  'supportStage',coalesce(support_stage,'disabled'),'operator',operator,
  'assurance',CASE WHEN auth.jwt()->>'aal'='aal2' THEN 'aal2' ELSE 'aal1' END);
END $$;

-- Team assignment accepts the two support roles; ownership still cannot be assigned or removed here.
CREATE OR REPLACE FUNCTION public.admin_staff_assign(p_user_id uuid,p_roles text[],p_reason text,p_operation_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; receipt jsonb; target auth.users; normalized text[]; lookup jsonb;
BEGIN
 actor:=private.admin_assert('team.manage','inspection');
 IF p_roles IS NULL OR cardinality(p_roles)=0 OR EXISTS(SELECT 1 FROM unnest(p_roles) r WHERE r IS NULL OR r NOT IN ('viewer','editor','reviewer','publisher','support_viewer','support_operator')) OR length(trim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ADM_INVALID'; END IF;
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

-- Spend one unit of an actor's per-minute budget; false once the limit is reached. Internal wrappers derive the
-- actor themselves, so no browser role can call this or name someone else.
CREATE FUNCTION private.support_consume_budget(p_actor uuid, p_kind text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE limit_per_minute integer := CASE p_kind WHEN 'lookup' THEN 30 WHEN 'provider_check' THEN 5 WHEN 'repair_execute' THEN 5
  WHEN 'refund_prepare' THEN 5 WHEN 'refund_submit' THEN 3 ELSE NULL END;
 spent integer;
BEGIN
 IF p_actor IS NULL OR limit_per_minute IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 INSERT INTO private.support_rate_buckets(actor_id, kind, minute, used)
 VALUES (p_actor, p_kind, date_trunc('minute', clock_timestamp()), 1)
 ON CONFLICT (actor_id, kind, minute) DO UPDATE SET used = private.support_rate_buckets.used + 1
 RETURNING used INTO spent;
 RETURN spent <= limit_per_minute;
END $$;

-- Canonical JSON for support material, matching canonicalSupport in src/lib/admin/support/digest.ts: keys sorted
-- by code point (C collation), no whitespace, arrays in order, numbers without trailing zeros. Never hash raw
-- jsonb::text, which adds spaces and orders keys by length.
CREATE FUNCTION private.support_canonical_json(p_value jsonb) RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT SET search_path='' AS $$
DECLARE out text;
BEGIN
 CASE jsonb_typeof(p_value)
 WHEN 'object' THEN
  SELECT '{' || coalesce(string_agg(to_jsonb(k)::text || ':' || private.support_canonical_json(v), ',' ORDER BY k COLLATE "C"), '') || '}'
  INTO out FROM jsonb_each(p_value) e(k, v);
 WHEN 'array' THEN
  SELECT '[' || coalesce(string_agg(private.support_canonical_json(v), ',' ORDER BY o), '') || ']'
  INTO out FROM jsonb_array_elements(p_value) WITH ORDINALITY a(v, o);
 WHEN 'number' THEN
  out := trim_scale((p_value #>> '{}')::numeric)::text;
 ELSE
  out := p_value::text;
 END CASE;
 RETURN out;
END $$;

CREATE FUNCTION private.support_digest(p_value jsonb) RETURNS text
LANGUAGE sql IMMUTABLE STRICT SET search_path='' AS $$
 SELECT encode(sha256(convert_to(private.support_canonical_json(p_value), 'UTF8')), 'hex')
$$;

REVOKE ALL ON FUNCTION private.support_assert(text,text), private.support_consume_budget(uuid,text),
 private.support_canonical_json(jsonb), private.support_digest(jsonb) FROM PUBLIC, anon, authenticated;
