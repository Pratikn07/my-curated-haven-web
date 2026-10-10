-- Phase 3: submitting an approved refund once, and recovering its outcome (Task 24).
--
-- The owner starts a fresh provider check for the reserved refund; the server's registered verifier records it. The
-- owner's session then claims dispatch: refund switch on, approval live, the approver still the owner, and the fresh
-- evidence materially identical to what was approved. The claim lasts ten seconds at most and is written before any
-- request leaves the server. The verifier login reads the frozen request under that claim and records what the
-- provider answered. A timeout or ambiguous answer is "outcome unknown" and keeps the money reserved; an ordinary
-- retry only reads status. There is no automatic resend: once a request may have left, recovery only reads the
-- provider. A provider refund strongly bound to this operation is recorded even when it arrives after its claim.

ALTER TABLE private.commerce_verification_jobs ADD COLUMN refund_operation_id uuid;

-- The owner asks for the fresh check a dispatch needs.
CREATE FUNCTION public.admin_support_refund_dispatch_check(p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; r private.support_refund_intents; o private.purchase_orders; job private.commerce_verification_jobs;
BEGIN
 actor := private.support_refund_actor('support.refund.execute', 'repair');
 SELECT * INTO r FROM private.support_refund_intents WHERE operation_id = p_operation_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF r.state <> 'reserved' THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT'; END IF;
 IF NOT private.support_consume_budget(actor, 'provider_check') THEN RAISE EXCEPTION USING ERRCODE='PT429', MESSAGE='ADM_RATE_LIMITED'; END IF;
 SELECT * INTO job FROM private.commerce_verification_jobs WHERE order_id = r.order_id AND state IN ('pending','claimed') FOR UPDATE;
 IF FOUND THEN
  IF job.purpose = 'refund_dispatch' AND job.refund_operation_id = r.operation_id THEN RETURN jsonb_build_object('jobId', job.id); END IF;
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 SELECT * INTO o FROM private.purchase_orders WHERE id = r.order_id;
 INSERT INTO private.commerce_verification_jobs(order_id, purpose, requested_by, operation_id, refund_operation_id, expected_order_version)
 VALUES (r.order_id, 'refund_dispatch', actor, gen_random_uuid(), r.operation_id, o.version) RETURNING * INTO job;
 RETURN jsonb_build_object('jobId', job.id);
END $$;

-- Claim the single dispatch of this refund, at the last authenticated boundary before the request leaves.
CREATE FUNCTION public.admin_support_refund_dispatch_claim(p_command jsonb, p_observation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; r private.support_refund_intents; a private.support_refund_approvals; p private.support_refund_proposals;
 v_obs private.commerce_provider_observations; v_job private.commerce_verification_jobs; o private.purchase_orders; v_collection uuid;
BEGIN
 actor := private.support_refund_actor('support.refund.execute', 'repair');
 IF NOT (SELECT refund_submission_enabled FROM private.support_workspace_settings WHERE singleton) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DISABLED';
 END IF;
 IF p_command IS NULL OR jsonb_typeof(p_command) <> 'object' OR p_observation_id IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 SELECT * INTO r FROM private.support_refund_intents WHERE operation_id = (SELECT (p_command->>'operationId')::uuid) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF r.command <> p_command THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 -- One dispatch only. A request that may have left is never sent again from here.
 IF r.state <> 'reserved' THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT'; END IF;
 SELECT * INTO a FROM private.support_refund_approvals WHERE id = r.approval_id;
 SELECT * INTO p FROM private.support_refund_proposals WHERE id = r.proposal_id;
 IF a.expires_at <= clock_timestamp()
   OR NOT EXISTS (SELECT 1 FROM private.admin_memberships WHERE user_id = a.authoriser AND role = 'owner' AND active)
   OR NOT private.support_has(a.authoriser, 'support.refund.approve') THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 SELECT * INTO v_obs FROM private.commerce_provider_observations WHERE id = p_observation_id;
 SELECT * INTO v_job FROM private.commerce_verification_jobs WHERE id = v_obs.job_id;
 IF v_obs.id IS NULL OR v_obs.purpose <> 'refund_dispatch' OR v_job.refund_operation_id IS DISTINCT FROM r.operation_id THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 SELECT r2.collection_id INTO v_collection FROM private.purchase_orders po JOIN public.collection_releases r2 ON r2.id = po.release_id
 WHERE po.id = r.order_id;
 PERFORM 1 FROM public.recipe_collections WHERE id = v_collection FOR UPDATE;
 SELECT * INTO o FROM private.purchase_orders WHERE id = r.order_id FOR UPDATE;
 -- The fresh evidence must say exactly what the approved evidence said.
 IF NOT v_obs.complete OR v_obs.material_digest <> (SELECT material_digest FROM private.commerce_provider_observations WHERE id = p.observation_id)
   OR o.version <> (p.proposal->>'expectedOrderVersion')::int
   OR EXISTS (SELECT 1 FROM private.commerce_provider_observations n WHERE n.order_id = o.id AND n.complete AND n.fence > v_obs.fence) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 UPDATE private.support_refund_intents SET state = 'dispatching', fence = nextval('private.commerce_verification_fence'),
  attempts = attempts + 1, first_dispatched_at = coalesce(first_dispatched_at, clock_timestamp()),
  retry_until = coalesce(retry_until, coalesce(first_dispatched_at, clock_timestamp()) + interval '23 hours'),
  claim_until = least(clock_timestamp() + interval '10 seconds', a.expires_at), updated_at = clock_timestamp()
 WHERE operation_id = r.operation_id RETURNING * INTO r;
 INSERT INTO private.access_events(actor_type, actor_id, event_type, metadata)
 VALUES ('human', actor, 'support_refund_dispatch', jsonb_build_object('operationId', r.operation_id, 'fence', r.fence, 'orderId', r.order_id));
 RETURN jsonb_build_object('operationId', r.operation_id, 'fence', r.fence, 'expiresAt', private.commerce_utc(r.claim_until));
END $$;

-- The frozen request for the verifier login, only under the live claim.
CREATE FUNCTION private.support_refund_dispatch_payload(p_operation_id uuid, p_fence bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); r private.support_refund_intents; a private.support_refund_approvals;
BEGIN
 SELECT * INTO r FROM private.support_refund_intents WHERE operation_id = p_operation_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF r.state <> 'dispatching' OR r.fence <> p_fence OR r.claim_until <= clock_timestamp() THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 SELECT * INTO a FROM private.support_refund_approvals WHERE id = r.approval_id;
 RETURN jsonb_build_object('command', r.command, 'approvalId', r.approval_id, 'humanAuthoriser', a.authoriser, 'accountId', r.account_id,
  'mode', r.mode, 'paymentIntentId', r.payment_intent_id, 'chargeId', r.charge_id, 'amountMinor', r.amount_minor, 'currency', r.currency,
  'providerReason', r.provider_reason, 'exceptionCategory', r.exception_category, 'providerKey', r.idempotency_key,
  'requestDigest', r.request_digest, 'state', r.state, 'reservedMinor', CASE WHEN r.reserved THEN r.amount_minor ELSE 0 END,
  'firstDispatchedAt', private.commerce_utc(r.first_dispatched_at), 'retryUntil', private.commerce_utc(r.retry_until), 'fence', r.fence);
END $$;

-- Record what the provider answered. Result: {kind 'known', fact} | {kind 'unknown', code} | {kind 'not_executed', code}.
-- A known refund strongly bound to this operation (charge, payment, amount, currency) is kept even after its claim
-- ended; unknown and not-executed answers only count under the current claim.
CREATE FUNCTION private.support_refund_result_record(p_operation_id uuid, p_fence bigint, p_result jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); r private.support_refund_intents; f jsonb := p_result->'fact'; v_current boolean;
BEGIN
 SELECT * INTO r FROM private.support_refund_intents WHERE operation_id = p_operation_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 v_current := r.state = 'dispatching' AND r.fence = p_fence;
 IF p_result->>'kind' = 'known' THEN
  IF jsonb_typeof(f) <> 'object' OR (f->>'id') !~ '^re_[A-Za-z0-9_]{1,255}$' OR f->>'chargeId' <> r.charge_id
    OR f->>'paymentIntentId' <> r.payment_intent_id OR (f->>'amountMinor')::bigint <> r.amount_minor OR f->>'currency' <> r.currency
    OR f->>'status' NOT IN ('pending','requires_action','succeeded','failed','canceled') THEN
   RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
  END IF;
  IF r.provider_refund_id IS NOT NULL AND r.provider_refund_id <> f->>'id' THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT'; END IF;
  IF r.state NOT IN ('dispatching','outcome_unknown','submitted') THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE'; END IF;
  UPDATE private.support_refund_intents SET state = 'submitted', provider_refund_id = f->>'id', provider_status = f->>'status',
   reconciliation = CASE WHEN reconciliation = 'applied' AND provider_status = f->>'status' THEN 'applied' ELSE 'pending' END,
   reason_code = NULL, claim_until = NULL, updated_at = clock_timestamp()
  WHERE operation_id = r.operation_id RETURNING * INTO r;
 ELSIF p_result->>'kind' IN ('unknown','not_executed') AND (p_result->>'code') ~ '^[A-Z][A-Z0-9_]{1,63}$' THEN
  IF NOT v_current THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE'; END IF;
  UPDATE private.support_refund_intents SET state = CASE p_result->>'kind' WHEN 'unknown' THEN 'outcome_unknown' ELSE 'rejected' END,
   reserved = p_result->>'kind' = 'unknown', reason_code = p_result->>'code', claim_until = NULL, updated_at = clock_timestamp()
  WHERE operation_id = r.operation_id RETURNING * INTO r;
 ELSE
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 INSERT INTO private.access_events(actor_type, actor_id, event_type, metadata)
 VALUES ('system', NULL, 'support_refund_result', jsonb_build_object('operationId', r.operation_id, 'orderId', r.order_id, 'state', r.state,
  'providerStatus', r.provider_status, 'reasonCode', r.reason_code, 'fence', p_fence));
 RETURN private.support_refund_receipt(r);
END $$;

-- What recovery may read for an operation whose outcome is not yet known (any stage, any switch position).
CREATE FUNCTION private.support_refund_recovery_target(p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); r private.support_refund_intents;
BEGIN
 SELECT * INTO r FROM private.support_refund_intents WHERE operation_id = p_operation_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 RETURN jsonb_build_object('operationId', r.operation_id, 'state', r.state, 'accountId', r.account_id, 'mode', r.mode,
  'paymentIntentId', r.payment_intent_id, 'chargeId', r.charge_id, 'amountMinor', r.amount_minor, 'currency', r.currency,
  'providerRefundId', r.provider_refund_id, 'fence', r.fence, 'orderId', r.order_id,
  'claimExpired', r.state = 'dispatching' AND r.claim_until <= clock_timestamp());
END $$;

-- A dispatch whose claim ended without any recorded answer may have reached the provider: it becomes unknown.
CREATE FUNCTION private.support_refund_expire_claim(p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); r private.support_refund_intents;
BEGIN
 UPDATE private.support_refund_intents SET state = 'outcome_unknown', reason_code = 'CLAIM_EXPIRED', claim_until = NULL,
  updated_at = clock_timestamp()
 WHERE operation_id = p_operation_id AND state = 'dispatching' AND claim_until <= clock_timestamp() RETURNING * INTO r;
 IF NOT FOUND THEN SELECT * INTO r FROM private.support_refund_intents WHERE operation_id = p_operation_id; END IF;
 RETURN private.support_refund_receipt(r);
END $$;

-- After the shared writer has applied (or could not apply) the provider's refund to access.
CREATE FUNCTION private.support_refund_reconciled(p_operation_id uuid, p_applied boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); r private.support_refund_intents;
BEGIN
 UPDATE private.support_refund_intents SET reconciliation = CASE WHEN p_applied THEN 'applied' ELSE 'unavailable' END, updated_at = clock_timestamp()
 WHERE operation_id = p_operation_id AND state = 'submitted' RETURNING * INTO r;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE'; END IF;
 RETURN private.support_refund_receipt(r);
END $$;

REVOKE ALL ON FUNCTION private.support_refund_dispatch_payload(uuid,bigint), private.support_refund_result_record(uuid,bigint,jsonb),
 private.support_refund_recovery_target(uuid), private.support_refund_expire_claim(uuid), private.support_refund_reconciled(uuid,boolean)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.support_refund_dispatch_payload(uuid,bigint), private.support_refund_result_record(uuid,bigint,jsonb),
 private.support_refund_recovery_target(uuid), private.support_refund_expire_claim(uuid), private.support_refund_reconciled(uuid,boolean)
 TO mch_commerce_verifier;
REVOKE ALL ON FUNCTION public.admin_support_refund_dispatch_check(uuid), public.admin_support_refund_dispatch_claim(jsonb,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_support_refund_dispatch_check(uuid), public.admin_support_refund_dispatch_claim(jsonb,uuid) TO authenticated;
