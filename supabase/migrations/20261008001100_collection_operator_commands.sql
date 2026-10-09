-- Phase 2: a restricted operator channel for collection publication and recipe corrections. A registered
-- database login (an agent's trusted connection) can prepare and preview drafts, record a human's attested
-- approval of an exact proposal, and execute it through the same private cores the browser uses. The browser
-- roles cannot call any of it. The database checks the operator, the named human's current authority and the
-- exact proposal; it cannot check that the human really said yes, which is why every attestation stores its
-- evidence reference and the operator who recorded it. No migration registers a real login.

-- Registered operator logins (database session users). Registration is a reviewed manual step (runbook).
CREATE TABLE private.collection_operator_principals (
 principal text PRIMARY KEY CHECK (principal ~ '^[a-z_][a-z0-9_]{0,62}$'),
 label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 120),
 registered_by uuid NOT NULL REFERENCES auth.users(id),
 registered_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz
);

-- One attested human approval of one exact proposal, usable once within 30 minutes by the operator that
-- recorded it.
CREATE TABLE private.collection_operator_authorisations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 target_kind text NOT NULL CHECK (target_kind IN ('collection.publish','recipe.correct')),
 target_id uuid NOT NULL,
 revision_id uuid NOT NULL,
 expected_version int NOT NULL,
 expected_digest text NOT NULL,
 base jsonb NOT NULL CHECK (jsonb_typeof(base) = 'object'),
 impact_token text NOT NULL,
 approve_now boolean NOT NULL DEFAULT false,
 access_decisions jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(access_decisions) = 'array'),
 human_id uuid NOT NULL REFERENCES auth.users(id),
 reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 1000),
 evidence_ref text NOT NULL CHECK (length(trim(evidence_ref)) BETWEEN 1 AND 200),
 evidence_excerpt text CHECK (evidence_excerpt IS NULL OR length(evidence_excerpt) <= 500),
 proposed_at timestamptz NOT NULL,
 attested_by text NOT NULL REFERENCES private.collection_operator_principals(principal),
 attested_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 consumed_operation uuid,
 receipt jsonb,
 revoked_at timestamptz
);
REVOKE ALL ON private.collection_operator_principals, private.collection_operator_authorisations FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.collection_operator_principals, private.collection_operator_authorisations TO service_role;
ALTER TABLE private.collection_operator_principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.collection_operator_authorisations ENABLE ROW LEVEL SECURITY;

-- An attestation's proposal never changes; it can only be consumed once or revoked once. It is never deleted.
CREATE FUNCTION private.collection_operator_authorisation_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP = 'DELETE'
  OR (to_jsonb(NEW) - ARRAY['consumed_at','consumed_operation','receipt','revoked_at'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['consumed_at','consumed_operation','receipt','revoked_at'])
  OR (OLD.consumed_at IS NOT NULL AND (NEW.consumed_at, NEW.consumed_operation, NEW.receipt)
     IS DISTINCT FROM (OLD.consumed_at, OLD.consumed_operation, OLD.receipt))
  OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_IMMUTABLE';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER collection_operator_authorisations_guard BEFORE UPDATE OR DELETE ON private.collection_operator_authorisations
 FOR EACH ROW EXECUTE FUNCTION private.collection_operator_authorisation_guard();

-- The calling operator: the session user must be registered and not revoked. SET ROLE does not change it.
CREATE FUNCTION private.collection_operator_principal() RETURNS text
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE found text;
BEGIN
 SELECT principal INTO found FROM private.collection_operator_principals
 WHERE principal = session_user::text AND revoked_at IS NULL;
 IF found IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED'; END IF;
 RETURN found;
END $$;

-- The named human's current authority: active membership with the permission, and the stage switched on.
CREATE FUNCTION private.collection_operator_human(p_human uuid, p_permissions text[], p_stage text, p_collection boolean)
RETURNS void LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE console_stage text; collection_stage text;
BEGIN
 SELECT stage INTO console_stage FROM private.admin_console_settings WHERE singleton;
 SELECT stage INTO collection_stage FROM private.collection_workspace_settings WHERE singleton;
 IF NOT private.admin_stage_at_least(console_stage, p_stage)
  OR (p_collection AND NOT private.admin_stage_at_least(collection_stage, p_stage)) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DISABLED';
 END IF;
 IF p_human IS NULL OR EXISTS (SELECT 1 FROM unnest(p_permissions) need WHERE NOT EXISTS (
   SELECT 1 FROM private.admin_memberships m WHERE m.user_id=p_human AND m.active
     AND need = ANY(private.admin_permissions(m.role)))) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED';
 END IF;
END $$;

-- Executor-aware forms of the revision and audit writers. The browser forms keep recording a human executor.
CREATE FUNCTION private.collection_append_revision(p_collection_id uuid, p_snapshot jsonb, p_base jsonb, p_actor uuid,
  p_operation uuid, p_reason text, p_state text, p_executor text, p_executor_type text) RETURNS uuid
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE next_version int; rev uuid;
BEGIN
 SELECT coalesce(max(version),0)+1 INTO next_version FROM private.collection_revisions WHERE collection_id=p_collection_id;
 INSERT INTO private.collection_revisions(collection_id,version,snapshot,digest,base_publication_id,base_digest,
   saved_by,executor_id,executor_type,operation_id,reason)
 VALUES(p_collection_id,next_version,p_snapshot,private.collection_digest(p_snapshot),
   (p_base->>'publicationId')::uuid,p_base->>'digest',p_actor,p_executor,p_executor_type,p_operation,p_reason)
 RETURNING id INTO rev;
 INSERT INTO private.collection_draft_heads(collection_id,revision_id,version,state)
 VALUES(p_collection_id,rev,next_version,p_state)
 ON CONFLICT (collection_id) DO UPDATE SET revision_id=EXCLUDED.revision_id, version=EXCLUDED.version,
   state=EXCLUDED.state, submission_id=NULL, updated_at=now();
 RETURN rev;
END $$;

CREATE FUNCTION private.collection_audit_event(p_collection_id uuid, p_action text, p_revision uuid, p_digest text,
  p_before text, p_after text, p_operation uuid, p_actor uuid, p_reason text, p_executor text, p_executor_type text)
RETURNS void LANGUAGE sql SET search_path='' AS $$
 INSERT INTO private.collection_audit(collection_id,action,revision_id,digest,before_ref,after_ref,operation_id,
   human_authoriser,executor_id,executor_type,reason,result)
 VALUES(p_collection_id,p_action,p_revision,p_digest,p_before,p_after,p_operation,p_actor,p_executor,p_executor_type,p_reason,'success')
$$;

-- Shared draft cores. p_context: human_authoriser, executor_id, executor_type, attestation_id.
CREATE FUNCTION private.collection_start_core(p_context jsonb, p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE human uuid := (p_context->>'human_authoriser')::uuid; executor text := p_context->>'executor_id';
 executor_type text := p_context->>'executor_type'; ids record; result jsonb; rev uuid; base jsonb; snap jsonb;
BEGIN
 ids := private.collection_command_ids(p_command);
 PERFORM 1 FROM public.recipe_collections WHERE id=ids.collection_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 result := private.collection_begin_operation(executor, ids.operation_id, 'collection.start', ids.collection_id,
   jsonb_build_object('reason',ids.reason));
 IF result IS NOT NULL THEN RETURN result; END IF;
 IF EXISTS(SELECT 1 FROM private.collection_draft_heads WHERE collection_id=ids.collection_id) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 base := private.collection_active_base(ids.collection_id);
 SELECT p.snapshot INTO snap FROM private.collection_publications p WHERE p.id=(base->>'publicationId')::uuid;
 IF snap IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 rev := private.collection_append_revision(ids.collection_id, snap, base, human, ids.operation_id, ids.reason, 'draft',
   executor, executor_type);
 PERFORM private.collection_audit_event(ids.collection_id,'collection.start',rev,private.collection_digest(snap),
   base->>'publicationId',rev::text,ids.operation_id,human,ids.reason,executor,executor_type);
 result := private.collection_draft_result(ids.operation_id, rev, false);
 PERFORM private.collection_finish_operation(executor, ids.operation_id, result);
 RETURN result;
END $$;

CREATE FUNCTION private.collection_save_core(p_context jsonb, p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE human uuid := (p_context->>'human_authoriser')::uuid; executor text := p_context->>'executor_id';
 executor_type text := p_context->>'executor_type'; ids record; snap jsonb := p_command->'snapshot'; result jsonb;
 head private.collection_draft_heads; current private.collection_revisions; rev uuid; reopen boolean;
BEGIN
 ids := private.collection_command_ids(p_command);
 PERFORM 1 FROM public.recipe_collections WHERE id=ids.collection_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 reopen := coalesce((p_command->>'reopen_reviewed')::boolean,false);
 result := private.collection_begin_operation(executor, ids.operation_id, 'collection.save', ids.collection_id,
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
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 PERFORM private.collection_validate_snapshot(snap, ids.collection_id);
 IF private.collection_digest(snap) = current.digest THEN
  result := private.collection_draft_result(ids.operation_id, head.revision_id, true);
  PERFORM private.collection_finish_operation(executor, ids.operation_id, result);
  RETURN result;
 END IF;
 IF head.state IN ('submitted','approved') AND NOT reopen THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;
 PERFORM private.collection_assert_protected(ids.collection_id, snap);
 PERFORM private.collection_apply_slug(ids.collection_id, snap->>'slug');
 rev := private.collection_append_revision(ids.collection_id, snap,
   jsonb_build_object('publicationId',current.base_publication_id,'digest',current.base_digest),
   human, ids.operation_id, ids.reason, CASE WHEN head.state IN ('submitted','approved') THEN 'draft' ELSE head.state END,
   executor, executor_type);
 PERFORM private.collection_audit_event(ids.collection_id,'collection.save',rev,private.collection_digest(snap),
   head.revision_id::text,rev::text,ids.operation_id,human,ids.reason,executor,executor_type);
 result := private.collection_draft_result(ids.operation_id, rev, false);
 PERFORM private.collection_finish_operation(executor, ids.operation_id, result);
 RETURN result;
END $$;

-- The browser commands keep their contract and now run the shared cores.
CREATE OR REPLACE FUNCTION public.admin_collection_draft_start(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid;
BEGIN
 actor := private.collection_assert('collection.edit','editing');
 RETURN private.collection_start_core(jsonb_build_object('human_authoriser',actor,'executor_id',actor::text,
   'executor_type','human','attestation_id',null), p_command);
END $$;

CREATE OR REPLACE FUNCTION public.admin_collection_draft_save(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid;
BEGIN
 actor := private.collection_assert('collection.edit','editing');
 RETURN private.collection_save_core(jsonb_build_object('human_authoriser',actor,'executor_id',actor::text,
   'executor_type','human','attestation_id',null), p_command);
END $$;

-- Operator procedures.

-- Start or save a private draft for a named human who may edit collections. Same validation as the editor.
CREATE FUNCTION private.collection_operator_prepare(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE principal text := private.collection_operator_principal(); human uuid;
BEGIN
 BEGIN human := (p_command->>'human_id')::uuid;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END;
 PERFORM private.collection_operator_human(human, ARRAY['collection.edit'], 'editing', true);
 IF (p_command->>'action') = 'start' THEN
  RETURN private.collection_start_core(jsonb_build_object('human_authoriser',human,'executor_id','operator:'||principal,
    'executor_type','operator','attestation_id',null), p_command);
 ELSIF (p_command->>'action') = 'save' THEN
  RETURN private.collection_save_core(jsonb_build_object('human_authoriser',human,'executor_id','operator:'||principal,
    'executor_type','operator','attestation_id',null), p_command);
 END IF;
 RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
END $$;

-- The exact current proposal: the draft head, its evaluated evidence and token, and undecided buyer groups.
-- A NULL revision means the current head; a named revision must still be the head.
CREATE FUNCTION private.collection_operator_preview(p_collection_id uuid, p_revision_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE principal text := private.collection_operator_principal(); head private.collection_draft_heads; rev private.collection_revisions;
BEGIN
 SELECT * INTO head FROM private.collection_draft_heads WHERE collection_id=p_collection_id;
 IF head.collection_id IS NULL OR (p_revision_id IS NOT NULL AND head.revision_id IS DISTINCT FROM p_revision_id) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 SELECT * INTO rev FROM private.collection_revisions WHERE id=head.revision_id;
 RETURN jsonb_build_object('collectionId',p_collection_id,
  'title',(SELECT title FROM public.recipe_collections WHERE id=p_collection_id),
  'revisionId',rev.id,'version',head.version,'digest',rev.digest,'state',head.state,
  'base',jsonb_build_object('publication_id',rev.base_publication_id,'digest',rev.base_digest),
  'evaluation',private.collection_evaluate(p_collection_id, rev.id),
  'undecidedAccess',private.collection_unmapped_access(p_collection_id),
  'previewedBy',principal);
END $$;

-- The exact current recipe correction proposal: the open draft, the same impact evidence and token as the
-- recipe publish page, and the collections the correction reaches.
CREATE FUNCTION private.recipe_operator_preview(p_recipe_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE principal text := private.collection_operator_principal(); head private.recipe_drafts; cur jsonb; usage jsonb; base jsonb;
BEGIN
 SELECT * INTO head FROM private.recipe_drafts WHERE recipe_id=p_recipe_id AND workflow_schema=1
  AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
 IF head.id IS NULL THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT'; END IF;
 cur := private.admin_revision_json(head.current_revision_id);
 usage := private.recipe_usage(p_recipe_id);
 SELECT jsonb_build_object('contentVersion',b.content_version,'activeHash',private.admin_active_hash(p_recipe_id)) INTO base
 FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id=c.id WHERE c.id=p_recipe_id;
 RETURN jsonb_build_object('recipeId',p_recipe_id,'title',(SELECT title FROM public.recipe_catalog WHERE id=p_recipe_id),
  'revisionId',head.current_revision_id,'version',head.working_version,'digest',cur->>'digest','state',head.lifecycle,
  'base',jsonb_build_object('content_version',head.base_content_version,'active_hash',head.base_active_hash),
  'usage',usage,
  'impactToken',CASE WHEN usage->>'sourceRevision' IS NULL THEN NULL ELSE private.admin_snapshot_digest(jsonb_build_object(
    'recipe',p_recipe_id,'base',base,'usage',usage - 'checkedAt',
    'campaignRevision',(SELECT campaign_revision FROM private.admin_console_settings WHERE singleton))) END,
  'collections',coalesce((SELECT jsonb_agg(jsonb_build_object('collectionId',c.id,'title',c.title) ORDER BY c.title)
    FROM public.recipe_collections c WHERE c.id = ANY(private.recipe_collection_ids(p_recipe_id))),'[]'::jsonb),
  'previewedBy',principal);
END $$;

-- Record a human's attested approval of one exact proposal. The human must hold the authority now; the
-- proposal must be the current one. Returns the authorisation id the execution must name.
CREATE FUNCTION private.collection_operator_attest(p_authorisation jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE principal text := private.collection_operator_principal(); a jsonb := p_authorisation; kind text := a->>'target_kind';
 target uuid; revision uuid; human uuid; proposed timestamptz; approve_now boolean := coalesce((a->>'approve_now')::boolean,false);
 head private.collection_draft_heads; recipe_head private.recipe_drafts; new_id uuid;
BEGIN
 BEGIN
  target := (a->>'target_id')::uuid; revision := (a->>'revision_id')::uuid; human := (a->>'human_id')::uuid;
  proposed := (a->>'proposed_at')::timestamptz;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END;
 IF kind NOT IN ('collection.publish','recipe.correct') OR target IS NULL OR revision IS NULL OR proposed IS NULL
  OR proposed > now() + interval '1 minute' OR proposed < now() - interval '30 minutes'
  OR jsonb_typeof(a->'base') IS DISTINCT FROM 'object' OR coalesce(a->>'impact_token','') = '' THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 IF kind = 'collection.publish' THEN
  PERFORM private.collection_operator_human(human,
    CASE WHEN approve_now THEN ARRAY['collection.publish','collection.review'] ELSE ARRAY['collection.publish'] END,
    'publication', true);
  SELECT * INTO head FROM private.collection_draft_heads WHERE collection_id=target;
  IF head.revision_id IS DISTINCT FROM revision OR head.version::text IS DISTINCT FROM a->>'expected_version'
   OR (SELECT digest FROM private.collection_revisions WHERE id=revision) IS DISTINCT FROM a->>'expected_digest' THEN
   RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
  END IF;
 ELSE
  PERFORM private.collection_operator_human(human, ARRAY['recipe.publish'], 'publication', false);
  SELECT * INTO recipe_head FROM private.recipe_drafts WHERE recipe_id=target AND workflow_schema=1
   AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  IF recipe_head.current_revision_id IS DISTINCT FROM revision OR recipe_head.working_version::text IS DISTINCT FROM a->>'expected_version'
   OR (private.admin_revision_json(revision)->>'digest') IS DISTINCT FROM a->>'expected_digest' THEN
   RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
  END IF;
 END IF;
 INSERT INTO private.collection_operator_authorisations(target_kind,target_id,revision_id,expected_version,expected_digest,base,
   impact_token,approve_now,access_decisions,human_id,reason,evidence_ref,evidence_excerpt,proposed_at,attested_by,expires_at)
 VALUES (kind,target,revision,(a->>'expected_version')::int,a->>'expected_digest',a->'base',a->>'impact_token',approve_now,
   coalesce(a->'access_decisions','[]'::jsonb),human,a->>'reason',a->>'evidence_ref',a->>'evidence_excerpt',proposed,principal,
   now() + interval '30 minutes')
 RETURNING id INTO new_id;
 RETURN new_id;
END $$;

-- Load an authorisation for execution by the operator that recorded it. Returns NULL when it was already
-- consumed by this same operation (the caller returns the stored receipt after rechecking authority).
CREATE FUNCTION private.collection_operator_claim(p_authorisation_id uuid, p_operation_id uuid, p_kind text, p_principal text)
RETURNS private.collection_operator_authorisations LANGUAGE plpgsql SET search_path='' AS $$
DECLARE auth private.collection_operator_authorisations;
BEGIN
 SELECT * INTO auth FROM private.collection_operator_authorisations WHERE id=p_authorisation_id FOR UPDATE;
 IF auth.id IS NULL OR auth.target_kind <> p_kind OR p_operation_id IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 IF auth.attested_by <> p_principal OR auth.revoked_at IS NOT NULL THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED';
 END IF;
 IF auth.consumed_at IS NOT NULL AND auth.consumed_operation IS DISTINCT FROM p_operation_id THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 IF auth.consumed_at IS NULL AND auth.expires_at <= now() THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;
 RETURN auth;
END $$;

-- Execute an attested collection publication through the shared publication core.
CREATE FUNCTION private.collection_operator_publish(p_authorisation_id uuid, p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE principal text := private.collection_operator_principal(); auth private.collection_operator_authorisations; result jsonb;
BEGIN
 auth := private.collection_operator_claim(p_authorisation_id, p_operation_id, 'collection.publish', principal);
 PERFORM private.collection_operator_human(auth.human_id,
   CASE WHEN auth.approve_now THEN ARRAY['collection.publish','collection.review'] ELSE ARRAY['collection.publish'] END,
   'publication', true);
 IF auth.consumed_at IS NOT NULL THEN RETURN auth.receipt; END IF;
 result := private.collection_publish_core(jsonb_build_object('human_authoriser',auth.human_id,
   'executor_id','operator:'||principal,'executor_type','operator','attestation_id',auth.id),
  jsonb_build_object('collection_id',auth.target_id,'operation_id',p_operation_id,'reason',auth.reason,
   'revision_id',auth.revision_id,'expected_version',auth.expected_version,'expected_digest',auth.expected_digest,
   'impact_token',auth.impact_token,'base',auth.base,'approve_now',auth.approve_now,'access_decisions',auth.access_decisions));
 UPDATE private.collection_operator_authorisations SET consumed_at=now(), consumed_operation=p_operation_id, receipt=result
 WHERE id=auth.id;
 RETURN result;
END $$;

-- Execute an attested recipe correction through the shared correction core.
CREATE FUNCTION private.recipe_operator_correct(p_authorisation_id uuid, p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE principal text := private.collection_operator_principal(); auth private.collection_operator_authorisations; result jsonb;
BEGIN
 auth := private.collection_operator_claim(p_authorisation_id, p_operation_id, 'recipe.correct', principal);
 PERFORM private.collection_operator_human(auth.human_id, ARRAY['recipe.publish'], 'publication', false);
 IF auth.consumed_at IS NOT NULL THEN RETURN auth.receipt; END IF;
 result := private.recipe_correct_core(jsonb_build_object('human_authoriser',auth.human_id,
   'executor_id','operator:'||principal,'executor_type','operator','attestation_id',auth.id),
  jsonb_build_object('recipe_id',auth.target_id,'operation_id',p_operation_id,'reason',auth.reason,
   'revision_id',auth.revision_id,'expected_version',auth.expected_version,'expected_digest',auth.expected_digest,
   'base',auth.base,'impact_token',auth.impact_token,'correction_kind','same_recipe','acknowledge_global_impact',true));
 UPDATE private.collection_operator_authorisations SET consumed_at=now(), consumed_operation=p_operation_id, receipt=result
 WHERE id=auth.id;
 RETURN result;
END $$;

-- Trusted manual steps, run by the database owner from the runbook: register or revoke a login. The named
-- owner is recorded as the person who approved the registration.
CREATE FUNCTION private.collection_operator_register(p_principal text, p_label text, p_owner uuid) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM private.admin_memberships WHERE user_id=p_owner AND active AND role='owner') THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED';
 END IF;
 INSERT INTO private.collection_operator_principals(principal,label,registered_by) VALUES (p_principal,p_label,p_owner);
END $$;

CREATE FUNCTION private.collection_operator_revoke(p_principal text) RETURNS void
LANGUAGE sql SET search_path='' AS $$
 UPDATE private.collection_operator_principals SET revoked_at=now() WHERE principal=p_principal AND revoked_at IS NULL
$$;

-- The operator group: no login, execute-only grants on the six operator procedures, no table access.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mch_collection_operator') THEN
  CREATE ROLE mch_collection_operator NOLOGIN;
 END IF;
END $$;
GRANT USAGE ON SCHEMA private TO mch_collection_operator;

REVOKE ALL ON FUNCTION private.collection_operator_authorisation_guard(), private.collection_operator_principal(),
 private.collection_operator_human(uuid,text[],text,boolean),
 private.collection_append_revision(uuid,jsonb,jsonb,uuid,uuid,text,text,text,text),
 private.collection_audit_event(uuid,text,uuid,text,text,text,uuid,uuid,text,text,text),
 private.collection_start_core(jsonb,jsonb), private.collection_save_core(jsonb,jsonb),
 private.collection_operator_claim(uuid,uuid,text,text), private.collection_operator_register(text,text,uuid),
 private.collection_operator_revoke(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.collection_operator_prepare(jsonb), private.collection_operator_preview(uuid,uuid),
 private.recipe_operator_preview(uuid), private.collection_operator_attest(jsonb), private.collection_operator_publish(uuid,uuid),
 private.recipe_operator_correct(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.collection_operator_prepare(jsonb), private.collection_operator_preview(uuid,uuid),
 private.recipe_operator_preview(uuid), private.collection_operator_attest(jsonb), private.collection_operator_publish(uuid,uuid),
 private.recipe_operator_correct(uuid,uuid) TO mch_collection_operator;
