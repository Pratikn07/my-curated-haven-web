-- Phase 3: applying an approved repair, with a durable receipt.
--
-- Execution has two steps under the staff member's own session. `admin_support_execute_begin` checks the live
-- approval and opens an execution-purpose provider check; the server's registered verifier then reads Stripe again
-- and records it. `admin_support_execute` commits: it re-checks the executor, the approver's current authority, the
-- approval, the order and its owner, and requires the fresh evidence to be materially identical to what was approved.
-- A reconciliation goes through the shared writer; a projection rebuild only reprojects. Either the approved effect
-- is applied, or the rights are already exactly what was approved; anything else rolls back. The receipt is stored
-- with the operation, so a lost response is recovered by reading it, never by repairing again.

CREATE TABLE private.support_operations (
 operation_id uuid PRIMARY KEY,
 actor uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 proposal_id uuid NOT NULL REFERENCES private.support_proposals(id) ON DELETE RESTRICT,
 approval_id uuid NOT NULL REFERENCES private.support_approvals(id) ON DELETE RESTRICT,
 case_id uuid REFERENCES private.support_cases(id) ON DELETE RESTRICT,
 command jsonb NOT NULL,
 job_id uuid NOT NULL REFERENCES private.commerce_verification_jobs(id) ON DELETE RESTRICT,
 -- The registered operator login that ran it for the human (agent runs), or NULL when the human ran it in the browser.
 executor_principal text CHECK (executor_principal IS NULL OR executor_principal ~ '^[a-z_][a-z0-9_]{0,62}$'),
 state text NOT NULL DEFAULT 'checking' CHECK (state IN ('checking','committed')),
 receipt jsonb,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 committed_at timestamptz,
 CHECK ((state = 'committed') = (receipt IS NOT NULL))
);
CREATE INDEX support_operations_proposal ON private.support_operations(proposal_id);
-- A committed operation never changes again.
CREATE FUNCTION private.support_operation_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP = 'DELETE' OR OLD.state = 'committed' OR NEW.operation_id <> OLD.operation_id OR NEW.actor <> OLD.actor
   OR NEW.proposal_id <> OLD.proposal_id OR NEW.approval_id <> OLD.approval_id OR NEW.case_id IS DISTINCT FROM OLD.case_id
   OR NEW.command <> OLD.command OR NEW.job_id <> OLD.job_id OR NEW.executor_principal IS DISTINCT FROM OLD.executor_principal THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_IMMUTABLE';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER support_operations_guard BEFORE UPDATE OR DELETE ON private.support_operations
 FOR EACH ROW EXECUTE FUNCTION private.support_operation_guard();
ALTER TABLE private.support_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.support_operations FROM PUBLIC, anon, authenticated;

-- The current rights an effect describes: whether the order's purchase source is eligible (no source counts as not
-- eligible) and whether the customer has the collection.
CREATE FUNCTION private.support_effect_now(p_order private.purchase_orders) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('eligible', coalesce((SELECT is_eligible FROM private.access_sources WHERE source_kind = 'stripe_purchase'
   AND source_id = p_order.id::text AND release_id = p_order.release_id), false),
  'effective', CASE WHEN private.collection_has_access(p_order.user_id, private.support_order_collection(p_order))
   THEN 'active' ELSE 'denied' END)
$$;

-- Status as the API reports it: the receipt once committed, otherwise where the operation stands.
CREATE FUNCTION private.support_operation_status(o private.support_operations) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_job private.commerce_verification_jobs;
BEGIN
 IF o.state = 'committed' THEN RETURN o.receipt; END IF;
 SELECT * INTO v_job FROM private.commerce_verification_jobs WHERE id = o.job_id;
 IF v_job.state = 'failed' THEN
  RETURN jsonb_build_object('operationId', o.operation_id, 'state', 'failed_no_commit', 'reasonCode', v_job.failure_code);
 END IF;
 IF EXISTS (SELECT 1 FROM private.support_approvals a WHERE a.id = o.approval_id AND a.expires_at <= clock_timestamp()) THEN
  RETURN jsonb_build_object('operationId', o.operation_id, 'state', 'blocked', 'reasonCode', 'APPROVAL_EXPIRED');
 END IF;
 RETURN jsonb_build_object('operationId', o.operation_id, 'state', 'checking', 'reasonCode', NULL);
END $$;

-- Command: {operationId, proposalId, expectedDigest, caseId}. Returns {status, jobId}. Shared by the browser (actor is
-- the signed-in executor, no principal) and the operator channel (actor is the approving human, principal the login).
CREATE FUNCTION private.support_execute_begin_core(p_actor uuid, p_principal text, p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := p_actor; v_op uuid; v_existing private.support_operations; p private.support_proposals; a private.support_approvals;
 v_order private.purchase_orders; v_job uuid; o private.support_operations;
BEGIN
 IF p_command IS NULL OR jsonb_typeof(p_command) <> 'object'
   OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p_command) k) <> ARRAY['caseId','expectedDigest','operationId','proposalId']
   OR (p_command->>'operationId') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR (p_command->>'proposalId') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR (p_command->>'expectedDigest') !~ '^[0-9a-f]{64}$'
   OR (p_command->'caseId' <> 'null' AND (p_command->>'caseId') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 v_op := (p_command->>'operationId')::uuid;
 SELECT * INTO v_existing FROM private.support_operations WHERE operation_id = v_op FOR UPDATE;
 IF FOUND THEN
  -- The same executor repeating the same command gets the same operation; anything else under this id is refused.
  IF v_existing.actor <> actor OR v_existing.executor_principal IS DISTINCT FROM p_principal OR v_existing.command <> p_command THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
  RETURN jsonb_build_object('status', private.support_operation_status(v_existing), 'jobId', v_existing.job_id);
 END IF;
 SELECT * INTO p FROM private.support_proposals WHERE id = (p_command->>'proposalId')::uuid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 SELECT * INTO a FROM private.support_approvals WHERE proposal_id = p.id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED'; END IF;
 IF p.digest <> p_command->>'expectedDigest' OR a.digest <> p.digest OR a.expires_at <= clock_timestamp()
   OR NOT private.support_has(a.authoriser, 'support.repair.approve') THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 IF EXISTS (SELECT 1 FROM private.support_operations WHERE proposal_id = p.id) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 IF p_command->'caseId' <> 'null' AND NOT EXISTS (SELECT 1 FROM private.support_cases WHERE id = (p_command->>'caseId')::uuid
   AND order_id = p.order_id) THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 SELECT * INTO v_order FROM private.purchase_orders WHERE id = p.order_id;
 IF v_order.version <> (p.proposal->>'expectedOrderVersion')::int OR v_order.user_id IS DISTINCT FROM (p.proposal->>'userId')::uuid THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 -- Fresh evidence for this execution; a live check of the order for another purpose makes the caller wait.
 IF EXISTS (SELECT 1 FROM private.commerce_verification_jobs WHERE order_id = p.order_id AND state IN ('pending','claimed')) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 INSERT INTO private.commerce_verification_jobs(order_id, purpose, requested_by, operation_id, expected_order_version)
 VALUES (p.order_id, 'execution', actor, v_op, v_order.version) RETURNING id INTO v_job;
 INSERT INTO private.support_operations(operation_id, actor, proposal_id, approval_id, case_id, command, job_id, executor_principal)
 VALUES (v_op, actor, p.id, a.id, (p_command->>'caseId')::uuid, p_command, v_job, p_principal) RETURNING * INTO o;
 RETURN jsonb_build_object('status', private.support_operation_status(o), 'jobId', v_job);
END $$;

CREATE FUNCTION public.admin_support_execute_begin(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 RETURN private.support_execute_begin_core(private.support_assert('support.repair.execute', 'repair'), NULL, p_command);
END $$;

CREATE FUNCTION private.support_execute_core(p_actor uuid, p_principal text, p_operation_id uuid, p_observation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := p_actor; o private.support_operations; p private.support_proposals; a private.support_approvals;
 v_obs private.commerce_provider_observations; v_order private.purchase_orders; v_collection uuid; v_now jsonb; v_after jsonb;
 v_core jsonb; v_state text; v_effects jsonb; v_audit uuid; v_receipt jsonb; v_lock uuid;
BEGIN
 IF p_operation_id IS NULL OR p_observation_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 SELECT * INTO o FROM private.support_operations WHERE operation_id = p_operation_id FOR UPDATE;
 IF NOT FOUND OR o.actor <> actor OR o.executor_principal IS DISTINCT FROM p_principal THEN
  RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND';
 END IF;
 IF o.state = 'committed' THEN RETURN private.support_operation_status(o); END IF;
 SELECT * INTO p FROM private.support_proposals WHERE id = o.proposal_id;
 SELECT * INTO a FROM private.support_approvals WHERE id = o.approval_id;
 -- The approval must still be live and its approver must still hold approval authority now.
 IF a.expires_at <= clock_timestamp() OR a.digest <> p.digest OR NOT private.support_has(a.authoriser, 'support.repair.approve') THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 -- Only this operation's own fresh check counts; a diagnosis from before approval is not execution evidence.
 SELECT * INTO v_obs FROM private.commerce_provider_observations WHERE id = p_observation_id AND job_id = o.job_id;
 IF NOT FOUND OR v_obs.purpose <> 'execution' THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;

 -- Collection, then order: the shared lock order.
 SELECT r.collection_id INTO v_collection FROM private.purchase_orders po JOIN public.collection_releases r ON r.id = po.release_id
 WHERE po.id = p.order_id;
 SELECT id INTO v_lock FROM public.recipe_collections WHERE id = v_collection FOR UPDATE;
 SELECT * INTO v_order FROM private.purchase_orders WHERE id = p.order_id FOR UPDATE;
 -- A newly verified refund, dispute or payment change needs another preview and approval.
 IF NOT v_obs.complete OR v_obs.material_digest <> p.proposal->>'materialDigest'
   OR v_order.version <> (p.proposal->>'expectedOrderVersion')::int OR v_order.user_id IS DISTINCT FROM (p.proposal->>'userId')::uuid
   OR EXISTS (SELECT 1 FROM private.commerce_provider_observations n WHERE n.order_id = v_order.id AND n.complete AND n.fence > v_obs.fence) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;

 v_after := (SELECT jsonb_build_object('eligible', (e->>'afterEligible')::boolean, 'effective', e->>'afterEffective')
  FROM jsonb_array_elements(p.proposal->'effects') e LIMIT 1);
 v_now := private.support_effect_now(v_order);
 IF v_now = v_after THEN
  -- Someone (a webhook, another repair) already produced exactly the approved rights.
  v_state := 'already_satisfied';
  v_effects := p.proposal->'effects';
 ELSIF private.support_access_explanation(v_order.user_id, v_collection)->>'dependencyToken' <> p.proposal->>'dependencyToken' THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 ELSIF p.kind = 'reconcile_order' THEN
  v_core := private.commerce_reconcile_core(jsonb_build_object('actor', 'human', 'actorId', actor, 'approvalId', a.id,
   'eventId', NULL, 'fence', v_obs.fence, 'orderId', v_order.id, 'purpose', 'execution'), v_obs.id, p_operation_id);
  -- The writer must do exactly what was approved; anything else rolls the whole repair back.
  IF v_core->>'state' <> 'applied' OR v_core->'effects' <> p.proposal->'effects' THEN
   RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
  END IF;
  v_state := 'applied';
  v_effects := v_core->'effects';
  v_audit := (v_core->>'auditId')::uuid;
 ELSE
  -- Projection only: purchase sources and payment facts are not touched.
  PERFORM private.project_user_entitlement(v_order.user_id, v_order.release_id);
  IF private.support_effect_now(v_order) <> v_after THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE'; END IF;
  v_state := 'applied';
  v_effects := p.proposal->'effects';
 END IF;
 IF v_audit IS NULL THEN
  INSERT INTO private.access_events(actor_type, actor_id, event_type, metadata)
  VALUES ('human', actor, 'support_repair', jsonb_build_object('operationId', p_operation_id, 'proposalId', p.id, 'approvalId', a.id,
   'observationId', v_obs.id, 'orderId', v_order.id, 'kind', p.kind, 'state', v_state, 'effects', v_effects,
   'executor', coalesce('operator:' || p_principal, 'web')))
  RETURNING id INTO v_audit;
 END IF;
 v_receipt := jsonb_build_object('operationId', p_operation_id, 'orderId', v_order.id, 'state', v_state, 'effects', v_effects,
  'auditId', v_audit, 'committedAt', private.commerce_utc(clock_timestamp()), 'proposalId', p.id, 'verification', 'pending');
 UPDATE private.support_operations SET state = 'committed', receipt = v_receipt, committed_at = clock_timestamp()
 WHERE operation_id = p_operation_id;
 RETURN v_receipt;
END $$;

CREATE FUNCTION public.admin_support_execute(p_operation_id uuid, p_observation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 RETURN private.support_execute_core(private.support_assert('support.repair.execute', 'repair'), NULL, p_operation_id,
  p_observation_id);
END $$;

-- An operation's status for its executor or anyone who may approve repairs; revoked staff read nothing.
CREATE FUNCTION public.admin_support_operation(p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; o private.support_operations;
BEGIN
 actor := private.support_assert('support.read', 'inspection');
 SELECT * INTO o FROM private.support_operations WHERE operation_id = p_operation_id;
 IF NOT FOUND OR (o.actor <> actor AND NOT private.support_has(actor, 'support.repair.approve')) THEN
  RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND';
 END IF;
 RETURN private.support_operation_status(o);
END $$;

REVOKE ALL ON FUNCTION private.support_operation_guard(), private.support_effect_now(private.purchase_orders),
 private.support_execute_begin_core(uuid,text,jsonb), private.support_execute_core(uuid,text,uuid,uuid),
 private.support_operation_status(private.support_operations) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_support_execute_begin(jsonb), public.admin_support_execute(uuid,uuid),
 public.admin_support_operation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_support_execute_begin(jsonb), public.admin_support_execute(uuid,uuid),
 public.admin_support_operation(uuid) TO authenticated;
