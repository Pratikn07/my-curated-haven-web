-- Phase 3: owner-approved refund proposals, approvals and reservations (Task 23).
--
-- Refunds are exceptions the owner approves one exact amount at a time; nothing here promises customers a refund.
-- Only the owner, signed in with MFA, may check, prepare, approve or reserve a refund; Support and registered agents
-- never can. The database works out what can still be refunded from a fresh owner-requested provider check and the
-- local reservations not yet visible at the provider, counting a refund known in both places once. A proposal fixes
-- the amount, reasons and access consequences under a digest; the approval lasts five minutes at most; a reservation
-- is taken under the shared order lock so two refunds cannot together exceed what was captured. No money moves here;
-- submission is Task 24 and needs the separate refund switch, which is off by default.

ALTER TABLE private.support_workspace_settings ADD COLUMN refund_submission_enabled boolean NOT NULL DEFAULT false;

-- The signed-in owner with this refund right at aal2 while the support stage is at least p_stage.
CREATE FUNCTION private.support_refund_actor(p_permission text, p_stage text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := private.support_assert(p_permission, p_stage);
BEGIN
 IF NOT EXISTS (SELECT 1 FROM private.admin_memberships WHERE user_id = actor AND role = 'owner' AND active) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED';
 END IF;
 RETURN actor;
END $$;

CREATE TABLE private.support_refund_proposals (
 id uuid PRIMARY KEY,
 actor uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 operation_id uuid NOT NULL,
 order_id uuid NOT NULL REFERENCES private.purchase_orders(id) ON DELETE RESTRICT,
 observation_id uuid NOT NULL REFERENCES private.commerce_provider_observations(id) ON DELETE RESTRICT,
 proposal jsonb NOT NULL,
 digest text NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
 blocked boolean NOT NULL,
 prepared_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL,
 UNIQUE (actor, operation_id)
);
CREATE TABLE private.support_refund_approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 proposal_id uuid NOT NULL UNIQUE REFERENCES private.support_refund_proposals(id) ON DELETE RESTRICT,
 digest text NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
 authoriser uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 approved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL
);
CREATE TRIGGER support_refund_proposals_immutable BEFORE UPDATE OR DELETE ON private.support_refund_proposals
 FOR EACH ROW EXECUTE FUNCTION private.support_reason_guard('internalReason');
CREATE TRIGGER support_refund_approvals_immutable BEFORE UPDATE OR DELETE ON private.support_refund_approvals
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();

-- One refund intent per approved proposal: what will be asked of the provider, frozen, and where it stands.
CREATE TABLE private.support_refund_intents (
 operation_id uuid PRIMARY KEY,
 proposal_id uuid NOT NULL UNIQUE REFERENCES private.support_refund_proposals(id) ON DELETE RESTRICT,
 approval_id uuid NOT NULL REFERENCES private.support_refund_approvals(id) ON DELETE RESTRICT,
 actor uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 order_id uuid NOT NULL REFERENCES private.purchase_orders(id) ON DELETE RESTRICT,
 case_id uuid REFERENCES private.support_cases(id) ON DELETE RESTRICT,
 command jsonb NOT NULL,
 account_id text NOT NULL,
 mode text NOT NULL CHECK (mode IN ('test','live')),
 payment_intent_id text NOT NULL,
 charge_id text NOT NULL,
 amount_minor integer NOT NULL CHECK (amount_minor > 0),
 currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
 provider_reason text NOT NULL CHECK (provider_reason IN ('requested_by_customer','duplicate')),
 exception_category text NOT NULL CHECK (exception_category IN ('duplicate_charge','billing_error','unresolved_delivery','required_remedy')),
 idempotency_key text NOT NULL UNIQUE,
 request_digest text NOT NULL CHECK (request_digest ~ '^[0-9a-f]{64}$'),
 state text NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved','dispatching','outcome_unknown','submitted','rejected')),
 reserved boolean NOT NULL DEFAULT true,
 provider_refund_id text,
 provider_status text CHECK (provider_status IS NULL OR provider_status IN ('pending','requires_action','succeeded','failed','canceled')),
 reconciliation text NOT NULL DEFAULT 'not_started' CHECK (reconciliation IN ('not_started','pending','applied','unavailable')),
 reason_code text CHECK (reason_code IS NULL OR reason_code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
 audit_id uuid NOT NULL,
 fence bigint NOT NULL DEFAULT 0,
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 2),
 claim_until timestamptz,
 first_dispatched_at timestamptz,
 retry_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 -- A refund the provider never executed holds nothing back.
 CHECK (state <> 'rejected' OR NOT reserved)
);
CREATE INDEX support_refund_intents_charge ON private.support_refund_intents(account_id, mode, charge_id);
-- What will be asked of the provider never changes; only where the intent stands may. Intents are never deleted.
CREATE FUNCTION private.support_refund_intent_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP = 'DELETE' OR to_jsonb(NEW) - ARRAY['state','reserved','provider_refund_id','provider_status','reconciliation','reason_code',
     'fence','attempts','claim_until','first_dispatched_at','retry_until','updated_at']
   IS DISTINCT FROM to_jsonb(OLD) - ARRAY['state','reserved','provider_refund_id','provider_status','reconciliation','reason_code',
     'fence','attempts','claim_until','first_dispatched_at','retry_until','updated_at']
   OR (OLD.provider_refund_id IS NOT NULL AND NEW.provider_refund_id IS DISTINCT FROM OLD.provider_refund_id)
   OR (OLD.first_dispatched_at IS NOT NULL AND NEW.first_dispatched_at IS DISTINCT FROM OLD.first_dispatched_at)
   OR (OLD.retry_until IS NOT NULL AND NEW.retry_until IS DISTINCT FROM OLD.retry_until) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_IMMUTABLE';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER support_refund_intents_guard BEFORE UPDATE OR DELETE ON private.support_refund_intents
 FOR EACH ROW EXECUTE FUNCTION private.support_refund_intent_guard();

ALTER TABLE private.support_refund_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.support_refund_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.support_refund_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.support_refund_proposals, private.support_refund_approvals, private.support_refund_intents
 FROM PUBLIC, anon, authenticated;

-- What can still be refunded on one payment (TypeScript twin: refundCapacity). Reservations are this database's
-- intents for the same account, mode and charge that are still reserved; one already visible at the provider (same
-- refund id) is counted once, from the provider's facts. An intent that was never sent and whose approval has expired
-- can never be sent (the dispatch claim needs a live approval), so it holds nothing back.
CREATE FUNCTION private.support_refund_lapsed(r private.support_refund_intents) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT r.state = 'reserved' AND EXISTS (SELECT 1 FROM private.support_refund_approvals a
  WHERE a.id = r.approval_id AND a.expires_at <= clock_timestamp())
$$;
REVOKE ALL ON FUNCTION private.support_refund_lapsed(private.support_refund_intents) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.support_refund_capacity(p_facts jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_captured bigint; v_successful bigint; v_pending bigint; v_reserved bigint; v_available bigint; v_blockers text[] := '{}';
BEGIN
 IF p_facts->>'paymentState' IS DISTINCT FROM 'paid' OR p_facts->'capturedMinor' = 'null' OR p_facts->'chargeId' = 'null'
   OR p_facts->'currency' = 'null' THEN
  RETURN jsonb_build_object('capturedMinor', 0, 'successfulMinor', 0, 'pendingMinor', 0, 'reservedMinor', 0, 'availableMinor', 0,
   'blockers', '["payment_not_refundable"]'::jsonb);
 END IF;
 v_captured := (p_facts->>'capturedMinor')::bigint;
 WITH refunds AS (SELECT DISTINCT ON (x->>'id') x FROM jsonb_array_elements(p_facts->'refunds') x ORDER BY x->>'id')
 SELECT coalesce(sum((x->>'amountMinor')::bigint) FILTER (WHERE x->>'status' = 'succeeded'), 0),
  coalesce(sum((x->>'amountMinor')::bigint) FILTER (WHERE x->>'status' IN ('pending','requires_action')), 0)
 INTO v_successful, v_pending FROM refunds;
 SELECT coalesce(sum(i.amount_minor), 0) INTO v_reserved FROM private.support_refund_intents i
 WHERE i.reserved AND i.account_id = p_facts->>'accountId' AND i.mode = p_facts->>'mode' AND i.charge_id = p_facts->>'chargeId'
   AND (i.provider_refund_id IS NULL OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_facts->'refunds') x WHERE x->>'id' = i.provider_refund_id))
  AND NOT private.support_refund_lapsed(i);
 v_available := greatest(0, v_captured - v_successful - v_pending - v_reserved);
 IF v_pending > 0 OR v_reserved > 0 THEN v_blockers := v_blockers || 'refund_in_flight'::text; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_facts->'disputes') d WHERE d->>'classification' = 'formal'
   AND d->>'status' IN ('needs_response','under_review')) THEN v_blockers := v_blockers || 'dispute_open'::text; END IF;
 IF v_available = 0 AND cardinality(v_blockers) = 0 THEN v_blockers := v_blockers || 'nothing_to_refund'::text; END IF;
 RETURN jsonb_build_object('capturedMinor', v_captured, 'successfulMinor', v_successful, 'pendingMinor', v_pending,
  'reservedMinor', v_reserved, 'availableMinor', v_available,
  'blockers', (SELECT coalesce(jsonb_agg(b ORDER BY b), '[]') FROM unnest(v_blockers) b));
END $$;

-- The owner asks for a fresh provider check before preparing a refund.
CREATE FUNCTION public.admin_support_refund_check_begin(p_order_id uuid, p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; v_receipt jsonb; o private.purchase_orders; job private.commerce_verification_jobs;
BEGIN
 actor := private.support_refund_actor('support.refund.prepare', 'diagnosis');
 IF p_order_id IS NULL OR p_operation_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 v_receipt := private.admin_begin_operation(actor, p_operation_id, 'support.refund.check', p_order_id, '{}'::jsonb);
 IF v_receipt IS NOT NULL THEN RETURN v_receipt; END IF;
 SELECT * INTO o FROM private.purchase_orders WHERE id = p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF NOT private.support_consume_budget(actor, 'provider_check') THEN RAISE EXCEPTION USING ERRCODE='PT429', MESSAGE='ADM_RATE_LIMITED'; END IF;
 SELECT * INTO job FROM private.commerce_verification_jobs WHERE order_id = p_order_id AND state IN ('pending','claimed') FOR UPDATE;
 IF FOUND AND job.purpose <> 'refund_prepare' THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT'; END IF;
 IF NOT FOUND THEN
  INSERT INTO private.commerce_verification_jobs(order_id, purpose, requested_by, operation_id, expected_order_version)
  VALUES (p_order_id, 'refund_prepare', actor, p_operation_id, o.version) RETURNING * INTO job;
 END IF;
 v_receipt := jsonb_build_object('jobId', job.id);
 PERFORM private.admin_finish_operation(actor, p_operation_id, v_receipt);
 RETURN v_receipt;
END $$;

-- Input: {orderId, caseId, amount {kind 'full_remaining'} | {kind 'partial', amountMinor}, providerReason,
-- exceptionCategory, internalReason, operationId}. The database fixes the amount and works out every consequence.
CREATE FUNCTION public.admin_support_refund_prepare(p_input jsonb, p_observation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 actor uuid; i jsonb := p_input; v_op uuid; v_order_id uuid; v_case uuid; v_receipt jsonb; o private.purchase_orders;
 v_obs private.commerce_provider_observations; v_job private.commerce_verification_jobs; v_binding jsonb; v_policy jsonb;
 v_facts jsonb; v_capacity jsonb; v_amount bigint; v_blockers text[] := '{}'; v_effects jsonb := '[]'; v_source private.access_sources;
 v_collection uuid; v_before boolean; v_after_eligible boolean; v_hyp jsonb; v_eval jsonb; v_other boolean; v_reason text;
 v_id uuid := gen_random_uuid(); v_now timestamptz := clock_timestamp(); v_proposal jsonb; v_digest text;
BEGIN
 actor := private.support_refund_actor('support.refund.prepare', 'diagnosis');
 IF i IS NULL OR jsonb_typeof(i) <> 'object' OR p_observation_id IS NULL
   OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(i) k)
     <> ARRAY['amount','caseId','exceptionCategory','internalReason','operationId','orderId','providerReason']
   OR i->>'providerReason' NOT IN ('requested_by_customer','duplicate')
   OR i->>'exceptionCategory' NOT IN ('duplicate_charge','billing_error','unresolved_delivery','required_remedy')
   OR jsonb_typeof(i->'amount') <> 'object'
   OR NOT ((i->'amount' = '{"kind":"full_remaining"}'::jsonb)
     OR ((SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(i->'amount') k) = ARRAY['amountMinor','kind']
       AND i->'amount'->>'kind' = 'partial' AND jsonb_typeof(i->'amount'->'amountMinor') = 'number'
       AND (i->'amount'->>'amountMinor') ~ '^[1-9][0-9]{0,9}$')) THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 BEGIN
  v_op := (i->>'operationId')::uuid; v_order_id := (i->>'orderId')::uuid;
  v_case := CASE WHEN i->'caseId' = 'null' THEN NULL ELSE (i->>'caseId')::uuid END;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END;
 v_reason := btrim(i->>'internalReason');
 IF v_op IS NULL OR v_order_id IS NULL OR v_reason IS NULL OR length(v_reason) NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 v_receipt := private.admin_begin_operation(actor, v_op, 'support.refund.prepare', v_order_id,
  (i - 'operationId') || jsonb_build_object('observationId', p_observation_id));
 IF v_receipt IS NOT NULL THEN
  RETURN (SELECT proposal FROM private.support_refund_proposals WHERE id = (v_receipt->>'proposalId')::uuid);
 END IF;
 IF NOT private.support_consume_budget(actor, 'refund_prepare') THEN RAISE EXCEPTION USING ERRCODE='PT429', MESSAGE='ADM_RATE_LIMITED'; END IF;
 SELECT * INTO o FROM private.purchase_orders WHERE id = v_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF v_case IS NOT NULL AND NOT EXISTS (SELECT 1 FROM private.support_cases WHERE id = v_case AND order_id = o.id) THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 SELECT * INTO v_obs FROM private.commerce_provider_observations WHERE id = p_observation_id AND order_id = o.id;
 IF NOT FOUND OR v_obs.purpose <> 'refund_prepare' THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 SELECT * INTO v_job FROM private.commerce_verification_jobs WHERE id = v_obs.job_id;
 IF v_job.expected_order_version <> o.version OR EXISTS (SELECT 1 FROM private.commerce_provider_observations n
   WHERE n.order_id = o.id AND n.complete AND n.fence > v_obs.fence) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;

 v_binding := private.commerce_order_binding(o.id);
 v_policy := private.commerce_policy_for(v_binding->>'refundPolicyVersion', v_binding->>'accessPolicyVersion');
 v_facts := v_obs.facts;
 IF NOT v_obs.complete THEN v_blockers := v_blockers || 'evidence_incomplete'::text; END IF;
 IF v_policy IS NULL THEN v_blockers := v_blockers || 'policy_missing'::text; END IF;
 IF v_facts->>'accountId' IS DISTINCT FROM v_binding->>'accountId' OR v_facts->>'mode' IS DISTINCT FROM v_binding->>'mode'
   OR v_facts->>'currency' IS DISTINCT FROM v_binding->>'currency'
   OR (v_facts->>'capturedMinor')::bigint IS DISTINCT FROM (v_binding->>'expectedCapturedMinor')::bigint THEN
  v_blockers := v_blockers || 'binding_mismatch'::text;
 END IF;
 v_capacity := private.support_refund_capacity(v_facts);
 v_blockers := v_blockers || ARRAY(SELECT jsonb_array_elements_text(v_capacity->'blockers'));
 IF i->'amount'->>'kind' = 'partial' THEN
  v_amount := (i->'amount'->>'amountMinor')::bigint;
  IF v_amount > (v_capacity->>'availableMinor')::bigint AND NOT v_capacity->'blockers' ? 'payment_not_refundable' THEN
   RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
  END IF;
 ELSE
  v_amount := (v_capacity->>'availableMinor')::bigint;
 END IF;

 -- What the refund would do to the customer's access, judged by the approved policy with this refund succeeded.
 IF o.user_id IS NOT NULL AND v_policy IS NOT NULL AND v_amount > 0 THEN
  v_collection := private.support_order_collection(o);
  SELECT * INTO v_source FROM private.access_sources WHERE source_kind = 'stripe_purchase' AND source_id = o.id::text AND release_id = o.release_id;
  v_before := private.collection_has_access(o.user_id, v_collection);
  v_hyp := jsonb_set(v_facts, '{refunds}', (v_facts->'refunds') || jsonb_build_array(jsonb_build_object('id', 'proposed',
   'paymentIntentId', v_facts->>'paymentIntentId', 'chargeId', v_facts->>'chargeId', 'amountMinor', v_amount, 'currency', v_facts->>'currency',
   'status', 'succeeded', 'occurredAt', private.commerce_utc(v_now))));
  v_eval := private.commerce_evaluate(jsonb_build_object('facts', v_hyp, 'binding', v_binding, 'policy', v_policy,
   'accountActive', private.support_account_state(o.user_id) IN ('active','unconfirmed'), 'manualHold', false, 'now', v_now));
  IF v_eval->>'state' = 'blocked' THEN v_blockers := v_blockers || 'access_unknown'::text; END IF;
  v_after_eligible := v_eval->>'state' = 'eligible';
  SELECT EXISTS (SELECT 1 FROM private.access_sources s JOIN public.collection_releases r ON r.id = s.release_id
   WHERE s.user_id = o.user_id AND r.collection_id = v_collection AND s.is_eligible AND s.valid_from <= now()
     AND (s.expires_at IS NULL OR s.expires_at > now()) AND NOT (s.source_kind = 'stripe_purchase' AND s.source_id = o.id::text))
  INTO v_other;
  v_effects := jsonb_build_array(jsonb_build_object('sourceId', o.id,
   'beforeEligible', CASE WHEN v_source.id IS NULL THEN NULL ELSE v_source.is_eligible END, 'afterEligible', v_after_eligible,
   'beforeEffective', CASE WHEN v_before THEN 'active' ELSE 'denied' END,
   'afterEffective', CASE WHEN v_after_eligible OR v_other THEN 'active' ELSE 'denied' END,
   'recipeIds', (SELECT coalesce(jsonb_agg(cr.recipe_id ORDER BY cr.position), '[]') FROM public.collection_recipes cr WHERE cr.release_id = o.release_id),
   'notification', 'none'));
 END IF;

 SELECT coalesce(array_agg(DISTINCT b ORDER BY b), '{}') INTO v_blockers FROM unnest(v_blockers) b;
 v_proposal := jsonb_build_object('id', v_id, 'orderId', o.id, 'ownerPrincipal', o.owner_principal, 'binding', v_binding,
  'paymentIntentId', coalesce(v_facts->>'paymentIntentId', ''), 'chargeId', coalesce(v_facts->>'chargeId', ''), 'observationId', v_obs.id,
  'expectedOrderVersion', o.version, 'amountMinor', v_amount, 'currency', coalesce(v_facts->>'currency', v_binding->>'currency'),
  'providerReason', i->>'providerReason', 'exceptionCategory', i->>'exceptionCategory', 'internalReason', v_reason,
  'capacity', v_capacity, 'policyVersion', coalesce(v_policy->>'version', 'none'),
  'dependencyToken', CASE WHEN o.user_id IS NULL THEN private.support_digest(jsonb_build_object('closed', o.id))
    ELSE private.support_access_explanation(o.user_id, private.support_order_collection(o))->>'dependencyToken' END,
  'effects', v_effects, 'blockers', to_jsonb(v_blockers), 'expiresAt', private.commerce_utc(v_now + interval '300 seconds'));
 v_digest := private.support_digest(v_proposal - 'id' - 'observationId' - 'expiresAt');
 v_proposal := v_proposal || jsonb_build_object('digest', v_digest);
 INSERT INTO private.support_refund_proposals(id, actor, operation_id, order_id, observation_id, proposal, digest, blocked, prepared_at, expires_at)
 VALUES (v_id, actor, v_op, o.id, v_obs.id, v_proposal, v_digest, cardinality(v_blockers) > 0 OR v_amount < 1, v_now, v_now + interval '300 seconds');
 PERFORM private.admin_finish_operation(actor, v_op, jsonb_build_object('proposalId', v_id));
 RETURN v_proposal;
END $$;

CREATE FUNCTION private.support_refund_approval_json(a private.support_refund_approvals) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id', a.id, 'proposalId', a.proposal_id, 'digest', a.digest, 'humanAuthoriser', a.authoriser,
  'approvedAt', private.commerce_utc(a.approved_at), 'expiresAt', private.commerce_utc(a.expires_at), 'channel', 'web')
$$;

-- Whether a refund proposal still describes the order and its money as they are now.
CREATE FUNCTION private.support_refund_proposal_current(p private.support_refund_proposals) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE o private.purchase_orders; v_obs private.commerce_provider_observations;
BEGIN
 SELECT * INTO o FROM private.purchase_orders WHERE id = p.order_id;
 SELECT * INTO v_obs FROM private.commerce_provider_observations WHERE id = p.observation_id;
 RETURN o.version = (p.proposal->>'expectedOrderVersion')::int
  AND NOT EXISTS (SELECT 1 FROM private.commerce_provider_observations n WHERE n.order_id = p.order_id AND n.complete AND n.fence > v_obs.fence)
  AND private.support_refund_capacity(v_obs.facts) = p.proposal->'capacity'
  AND (CASE WHEN o.user_id IS NULL THEN private.support_digest(jsonb_build_object('closed', o.id))
    ELSE private.support_access_explanation(o.user_id, private.support_order_collection(o))->>'dependencyToken' END) = p.proposal->>'dependencyToken';
END $$;

-- The owner approves exactly this refund. The approval lasts five minutes or until the proposal expires, if sooner.
CREATE FUNCTION public.admin_support_refund_approve(p_proposal_id uuid, p_digest text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; p private.support_refund_proposals; a private.support_refund_approvals;
BEGIN
 actor := private.support_refund_actor('support.refund.approve', 'diagnosis');
 IF p_proposal_id IS NULL OR p_digest IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 SELECT * INTO p FROM private.support_refund_proposals WHERE id = p_proposal_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 SELECT * INTO a FROM private.support_refund_approvals WHERE proposal_id = p.id;
 IF FOUND THEN
  IF a.authoriser = actor AND a.digest = p_digest THEN RETURN private.support_refund_approval_json(a); END IF;
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 IF p.digest IS DISTINCT FROM p_digest OR p.expires_at <= clock_timestamp() THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE'; END IF;
 IF p.blocked THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED'; END IF;
 IF NOT private.support_refund_proposal_current(p) THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE'; END IF;
 INSERT INTO private.support_refund_approvals(proposal_id, digest, authoriser, expires_at)
 VALUES (p.id, p.digest, actor, least(p.expires_at, clock_timestamp() + interval '5 minutes')) RETURNING * INTO a;
 RETURN private.support_refund_approval_json(a);
END $$;

CREATE FUNCTION private.support_refund_receipt(r private.support_refund_intents) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('operationId', r.operation_id, 'proposalId', r.proposal_id, 'orderId', r.order_id, 'amountMinor', r.amount_minor,
  'currency', r.currency, 'state', CASE WHEN private.support_refund_lapsed(r) THEN 'expired' ELSE r.state END, 'providerRefundId', r.provider_refund_id, 'providerStatus', r.provider_status,
  'reconciliation', r.reconciliation, 'auditId', r.audit_id, 'reasonCode', r.reason_code,
  'firstDispatchedAt', CASE WHEN r.first_dispatched_at IS NULL THEN NULL ELSE private.commerce_utc(r.first_dispatched_at) END,
  'checkedAt', private.commerce_utc(clock_timestamp()))
$$;

-- Reserve the approved amount. Command: {operationId, proposalId, expectedDigest, caseId}. Repeating the same command
-- returns the same reservation; a different command under that id, a second reservation for the proposal or an
-- amount beyond what is still available is refused.
CREATE FUNCTION public.admin_support_refund_reserve(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; c jsonb := p_command; v_op uuid; r private.support_refund_intents; p private.support_refund_proposals;
 a private.support_refund_approvals; o private.purchase_orders; v_obs private.commerce_provider_observations; v_capacity jsonb;
 v_collection uuid; v_audit uuid; v_request jsonb;
BEGIN
 actor := private.support_refund_actor('support.refund.execute', 'repair');
 IF c IS NULL OR jsonb_typeof(c) <> 'object'
   OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(c) k) <> ARRAY['caseId','expectedDigest','operationId','proposalId']
   OR (c->>'expectedDigest') !~ '^[0-9a-f]{64}$' THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 BEGIN
  v_op := (c->>'operationId')::uuid;
  PERFORM (c->>'proposalId')::uuid, CASE WHEN c->'caseId' = 'null' THEN NULL ELSE (c->>'caseId')::uuid END;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END;
 SELECT * INTO r FROM private.support_refund_intents WHERE operation_id = v_op;
 IF FOUND THEN
  IF r.actor <> actor OR r.command <> c THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
  RETURN private.support_refund_receipt(r);
 END IF;
 -- A new money operation needs refund sending switched on; with it off, existing ones can still be read and recovered.
 IF NOT (SELECT refund_submission_enabled FROM private.support_workspace_settings WHERE singleton) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DISABLED';
 END IF;
 SELECT * INTO p FROM private.support_refund_proposals WHERE id = (c->>'proposalId')::uuid;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 SELECT * INTO a FROM private.support_refund_approvals WHERE proposal_id = p.id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED'; END IF;
 IF p.digest <> c->>'expectedDigest' OR a.digest <> p.digest OR a.expires_at <= clock_timestamp()
   OR NOT EXISTS (SELECT 1 FROM private.admin_memberships WHERE user_id = a.authoriser AND role = 'owner' AND active)
   OR NOT private.support_has(a.authoriser, 'support.refund.approve') THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 IF c->'caseId' <> 'null' AND NOT EXISTS (SELECT 1 FROM private.support_cases WHERE id = (c->>'caseId')::uuid AND order_id = p.order_id) THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 -- Collection, then order: the shared lock order. Concurrent reservations for the payment wait here.
 SELECT r2.collection_id INTO v_collection FROM private.purchase_orders po JOIN public.collection_releases r2 ON r2.id = po.release_id
 WHERE po.id = p.order_id;
 PERFORM 1 FROM public.recipe_collections WHERE id = v_collection FOR UPDATE;
 SELECT * INTO o FROM private.purchase_orders WHERE id = p.order_id FOR UPDATE;
 -- The same command sent twice at once: the second waits above, then returns the first one's reservation.
 SELECT * INTO r FROM private.support_refund_intents WHERE operation_id = v_op;
 IF FOUND THEN
  IF r.actor <> actor OR r.command <> c THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
  RETURN private.support_refund_receipt(r);
 END IF;
 IF EXISTS (SELECT 1 FROM private.support_refund_intents WHERE proposal_id = p.id) THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT'; END IF;
 -- Only a new money operation spends the budget; repeating one returns its receipt.
 IF NOT private.support_consume_budget(actor, 'refund_submit') THEN RAISE EXCEPTION USING ERRCODE='PT429', MESSAGE='ADM_RATE_LIMITED'; END IF;
 SELECT * INTO v_obs FROM private.commerce_provider_observations WHERE id = p.observation_id;
 IF NOT private.support_refund_proposal_current(p) THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE'; END IF;
 v_capacity := private.support_refund_capacity(v_obs.facts);
 IF (p.proposal->>'amountMinor')::bigint > (v_capacity->>'availableMinor')::bigint THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;
 v_request := jsonb_build_object('charge', p.proposal->>'chargeId', 'amount', (p.proposal->>'amountMinor')::bigint,
  'reason', p.proposal->>'providerReason', 'metadata', jsonb_build_object('support_refund_operation', v_op));
 INSERT INTO private.access_events(actor_type, actor_id, event_type, metadata)
 VALUES ('human', actor, 'support_refund_reserved', jsonb_build_object('operationId', v_op, 'proposalId', p.id, 'approvalId', a.id,
  'orderId', o.id, 'amountMinor', (p.proposal->>'amountMinor')::bigint, 'currency', p.proposal->>'currency'))
 RETURNING id INTO v_audit;
 INSERT INTO private.support_refund_intents(operation_id, proposal_id, approval_id, actor, order_id, case_id, command, account_id, mode,
  payment_intent_id, charge_id, amount_minor, currency, provider_reason, exception_category, idempotency_key, request_digest, audit_id)
 VALUES (v_op, p.id, a.id, actor, o.id, CASE WHEN c->'caseId' = 'null' THEN NULL ELSE (c->>'caseId')::uuid END, c,
  p.proposal->'binding'->>'accountId', p.proposal->'binding'->>'mode', p.proposal->>'paymentIntentId', p.proposal->>'chargeId',
  (p.proposal->>'amountMinor')::int, p.proposal->>'currency', p.proposal->>'providerReason', p.proposal->>'exceptionCategory',
  'mch-support-refund-' || v_op, private.support_digest(v_request), v_audit)
 RETURNING * INTO r;
 RETURN private.support_refund_receipt(r);
END $$;

-- A refund's receipt, for the owner, in any support stage (results must stay readable while refunds are off).
CREATE FUNCTION public.admin_support_refund_operation(p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; r private.support_refund_intents;
BEGIN
 actor := private.support_refund_actor('support.refund.prepare', 'inspection');
 SELECT * INTO r FROM private.support_refund_intents WHERE operation_id = p_operation_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 RETURN private.support_refund_receipt(r);
END $$;

REVOKE ALL ON FUNCTION private.support_refund_actor(text,text), private.support_refund_intent_guard(), private.support_refund_capacity(jsonb),
 private.support_refund_approval_json(private.support_refund_approvals), private.support_refund_proposal_current(private.support_refund_proposals),
 private.support_refund_receipt(private.support_refund_intents) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_support_refund_check_begin(uuid,uuid), public.admin_support_refund_prepare(jsonb,uuid),
 public.admin_support_refund_approve(uuid,text), public.admin_support_refund_reserve(jsonb), public.admin_support_refund_operation(uuid)
 FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_support_refund_check_begin(uuid,uuid), public.admin_support_refund_prepare(jsonb,uuid),
 public.admin_support_refund_approve(uuid,text), public.admin_support_refund_reserve(jsonb), public.admin_support_refund_operation(uuid)
 TO authenticated;
