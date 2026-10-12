-- Phase 3: restricted operator commands for approved access repairs (the Phase 2 operator pattern).
--
-- A registered database login (an agent's trusted connection) can prepare a repair for a named human, show its exact
-- preview, record that human's approval of exactly that proposal, and apply it through the same cores the browser
-- uses, with fresh provider evidence from the registered verifier. Attesting and executing are separate rights, and
-- both are separate from verifying. The database checks the login, the human's current authority and the exact
-- proposal; it cannot check that the human really said yes, which is why every operator approval stores who
-- recorded it and a short reference to where it was given. Refunds and dispute notices are never available here.
-- Operator proposals and approvals last 30 minutes (owner decision). No migration registers a real login.

CREATE TABLE private.support_operator_principals (
 principal text PRIMARY KEY CHECK (principal ~ '^[a-z_][a-z0-9_]{0,62}$'),
 label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 120),
 can_attest boolean NOT NULL,
 can_execute boolean NOT NULL,
 registered_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 registered_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,
 CHECK (can_attest OR can_execute)
);
ALTER TABLE private.support_operator_principals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.support_operator_principals FROM PUBLIC, anon, authenticated;

-- The calling login, if it is registered, not revoked and holds the capability ('attest', 'execute' or 'any').
-- SET ROLE does not change session_user.
CREATE FUNCTION private.support_operator_principal(p_capability text) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE found text;
BEGIN
 SELECT principal INTO found FROM private.support_operator_principals
 WHERE principal = session_user::text AND revoked_at IS NULL
   AND CASE p_capability WHEN 'attest' THEN can_attest WHEN 'execute' THEN can_execute ELSE true END;
 IF found IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED'; END IF;
 RETURN found;
END $$;

-- Database-owner steps (runbook); no grants.
CREATE FUNCTION private.support_operator_register(p_principal text, p_label text, p_owner uuid, p_attest boolean,
  p_execute boolean) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM private.admin_memberships WHERE user_id = p_owner AND active AND role = 'owner') THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED';
 END IF;
 INSERT INTO private.support_operator_principals(principal, label, can_attest, can_execute, registered_by)
 VALUES (p_principal, p_label, p_attest, p_execute, p_owner);
END $$;
CREATE FUNCTION private.support_operator_revoke(p_principal text) RETURNS void
LANGUAGE sql SET search_path='' AS $$
 UPDATE private.support_operator_principals SET revoked_at = now() WHERE principal = p_principal AND revoked_at IS NULL
$$;

-- The named human's current authority: the repair stage is on and an active membership grants every permission.
CREATE FUNCTION private.support_operator_human(p_human uuid, p_permissions text[]) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF (SELECT stage FROM private.support_workspace_settings WHERE singleton) IS DISTINCT FROM 'repair' THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DISABLED';
 END IF;
 IF p_human IS NULL OR EXISTS (SELECT 1 FROM unnest(p_permissions) need WHERE NOT private.support_has(p_human, need)) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED';
 END IF;
END $$;

-- Prepare a repair for a named human who may prepare and inspect provider details now.
-- Command: {orderId, observationId, kind, reason, humanId, operationId}. Repeating it returns the same proposal.
CREATE FUNCTION private.support_operator_prepare(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_principal text := private.support_operator_principal('attest'); c jsonb := p_command; v_human uuid; v_order uuid;
 v_obs uuid; v_op uuid; v_reason text; v_existing private.support_proposals;
BEGIN
 IF c IS NULL OR jsonb_typeof(c) <> 'object'
   OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(c) k) <> ARRAY['humanId','kind','observationId','operationId','orderId','reason']
   OR c->>'kind' NOT IN ('reconcile_order','rebuild_projection') THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 BEGIN
  v_human := (c->>'humanId')::uuid; v_order := (c->>'orderId')::uuid; v_obs := (c->>'observationId')::uuid;
  v_op := (c->>'operationId')::uuid;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END;
 v_reason := btrim(c->>'reason');
 IF v_human IS NULL OR v_order IS NULL OR v_obs IS NULL OR v_op IS NULL OR v_reason IS NULL OR length(v_reason) NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 PERFORM private.support_operator_human(v_human, ARRAY['support.repair.prepare', 'support.provider.inspect']);
 SELECT * INTO v_existing FROM private.support_proposals WHERE actor = v_human AND operation_id = v_op;
 IF FOUND THEN
  IF v_existing.channel <> 'operator' OR v_existing.order_id <> v_order OR v_existing.observation_id <> v_obs
    OR v_existing.kind <> c->>'kind' OR v_existing.proposal->>'reason' <> v_reason THEN
   RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
  END IF;
  RETURN v_existing.proposal;
 END IF;
 RETURN private.support_prepare_core(v_human, v_order, v_obs, c->>'kind', v_reason, v_op, 'operator');
END $$;

-- The exact proposal as it stands now, for the operator to show the human before asking.
CREATE FUNCTION private.support_operator_preview(p_proposal_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_principal text := private.support_operator_principal('any'); p private.support_proposals; a private.support_approvals;
BEGIN
 SELECT * INTO p FROM private.support_proposals WHERE id = p_proposal_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 SELECT * INTO a FROM private.support_approvals WHERE proposal_id = p.id;
 RETURN jsonb_build_object('proposal', p.proposal, 'supportReference', (SELECT support_reference FROM private.purchase_orders
   WHERE id = p.order_id), 'channel', p.channel, 'expired', p.expires_at <= clock_timestamp(), 'blocked', p.blocked,
  'current', private.support_proposal_current(p), 'approval', CASE WHEN a.id IS NULL THEN NULL ELSE private.support_approval_json(a) END);
END $$;

-- Record a human's approval of exactly this proposal. The human must hold approval authority now and the proposal must
-- still be current, unexpired and unblocked. Repeating the same attestation returns the same approval.
CREATE FUNCTION private.support_operator_attest(p_proposal_id uuid, p_digest text, p_human_id uuid, p_evidence_reference text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_principal text := private.support_operator_principal('attest'); p private.support_proposals; a private.support_approvals;
 v_reference text := btrim(p_evidence_reference);
BEGIN
 IF p_proposal_id IS NULL OR p_digest IS NULL OR p_human_id IS NULL OR v_reference IS NULL OR length(v_reference) NOT BETWEEN 1 AND 200 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 PERFORM private.support_operator_human(p_human_id, ARRAY['support.repair.approve']);
 SELECT * INTO p FROM private.support_proposals WHERE id = p_proposal_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 SELECT * INTO a FROM private.support_approvals WHERE proposal_id = p.id;
 IF FOUND THEN
  IF a.channel = 'operator' AND a.authoriser = p_human_id AND a.attested_by = v_principal AND a.digest = p_digest THEN
   RETURN private.support_approval_json(a);
  END IF;
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 IF p.channel <> 'operator' OR p.digest IS DISTINCT FROM p_digest OR p.expires_at <= clock_timestamp() THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 IF p.blocked THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED'; END IF;
 IF NOT private.support_proposal_current(p) THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE'; END IF;
 INSERT INTO private.support_approvals(proposal_id, digest, authoriser, channel, attested_by, evidence_reference, expires_at)
 VALUES (p.id, p.digest, p_human_id, 'operator', v_principal, v_reference, p.expires_at) RETURNING * INTO a;
 RETURN private.support_approval_json(a);
END $$;

-- Start an attested repair: the approving human must still hold approval authority; the operation runs in their name
-- with this login recorded as executor. Same command shape as the browser.
CREATE FUNCTION private.support_operator_execute_begin(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_principal text := private.support_operator_principal('execute'); a private.support_approvals; v_proposal uuid;
BEGIN
 BEGIN
  v_proposal := (p_command->>'proposalId')::uuid;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END;
 SELECT * INTO a FROM private.support_approvals WHERE proposal_id = v_proposal;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED'; END IF;
 IF a.channel <> 'operator' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED'; END IF;
 PERFORM private.support_operator_human(a.authoriser, ARRAY['support.repair.approve']);
 RETURN private.support_execute_begin_core(a.authoriser, v_principal, p_command);
END $$;

-- Commit an attested repair with this operation's own fresh check. The command must be exactly the one started.
CREATE FUNCTION private.support_operator_execute(p_command jsonb, p_observation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_principal text := private.support_operator_principal('execute'); o private.support_operations; v_op uuid;
BEGIN
 BEGIN
  v_op := (p_command->>'operationId')::uuid;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END;
 SELECT * INTO o FROM private.support_operations WHERE operation_id = v_op;
 IF NOT FOUND OR o.executor_principal IS DISTINCT FROM v_principal THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF o.command <> p_command THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 PERFORM private.support_operator_human(o.actor, ARRAY['support.repair.approve']);
 RETURN private.support_execute_core(o.actor, v_principal, v_op, p_observation_id);
END $$;

-- An operation this login ran.
CREATE FUNCTION private.support_operator_operation(p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_principal text := private.support_operator_principal('any'); o private.support_operations;
BEGIN
 SELECT * INTO o FROM private.support_operations WHERE operation_id = p_operation_id AND executor_principal = v_principal;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 RETURN private.support_operation_status(o);
END $$;

DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mch_support_operator') THEN
  CREATE ROLE mch_support_operator NOLOGIN;
 END IF;
END $$;
GRANT USAGE ON SCHEMA private TO mch_support_operator;

REVOKE ALL ON FUNCTION private.support_operator_principal(text), private.support_operator_register(text,text,uuid,boolean,boolean),
 private.support_operator_revoke(text), private.support_operator_human(uuid,text[]), private.support_operator_prepare(jsonb),
 private.support_operator_preview(uuid), private.support_operator_attest(uuid,text,uuid,text),
 private.support_operator_execute_begin(jsonb), private.support_operator_execute(jsonb,uuid), private.support_operator_operation(uuid)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.support_operator_prepare(jsonb), private.support_operator_preview(uuid),
 private.support_operator_attest(uuid,text,uuid,text), private.support_operator_execute_begin(jsonb),
 private.support_operator_execute(jsonb,uuid), private.support_operator_operation(uuid) TO mch_support_operator;
