-- Phase 3: one policy-aware writer for verified payment evidence.
--
-- private.commerce_reconcile_core applies one complete provider observation to its order: it records the payment,
-- refunds and disputes the provider reported, judges the purchase source under the order's approved policy, updates
-- the source and the projected entitlement, and writes audit and notifications in one transaction. No network call
-- happens inside it. Automated processing enters through private.commerce_reconcile_system (registered verifier
-- logins only); approved manual repairs will enter the same core later. The older payment and refund procedures stay
-- for their current callers, with guards: a replayed success can no longer re-enable an excluded source, and a refund
-- must belong to its payment's order and currency.

-- Bindings: a refund or dispute belongs to its payment's order. Provider refund and dispute ids stay globally unique,
-- which is stricter than per account and mode.
ALTER TABLE private.provider_payments ADD CONSTRAINT provider_payments_id_order_uniq UNIQUE (id, order_id);
ALTER TABLE private.payment_refunds ADD CONSTRAINT payment_refunds_payment_order_fk
 FOREIGN KEY (payment_id, order_id) REFERENCES private.provider_payments(id, order_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE private.payment_refunds VALIDATE CONSTRAINT payment_refunds_payment_order_fk;
ALTER TABLE private.payment_disputes ADD CONSTRAINT payment_disputes_payment_order_fk
 FOREIGN KEY (payment_id, order_id) REFERENCES private.provider_payments(id, order_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE private.payment_disputes VALIDATE CONSTRAINT payment_disputes_payment_order_fk;

-- What a provider object is cannot change once recorded; only its status (and a missing charge id) may.
CREATE FUNCTION private.commerce_identity_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_TABLE_NAME = 'provider_payments' THEN
  IF NEW.order_id <> OLD.order_id OR NEW.provider_account_id <> OLD.provider_account_id OR NEW.provider_mode <> OLD.provider_mode
    OR NEW.payment_intent_id <> OLD.payment_intent_id OR NEW.captured_amount <> OLD.captured_amount OR NEW.currency <> OLD.currency
    OR (OLD.charge_id IS NOT NULL AND NEW.charge_id IS DISTINCT FROM OLD.charge_id) THEN
   RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='COMMERCE_IDENTITY_CONFLICT';
  END IF;
 ELSIF TG_TABLE_NAME = 'payment_refunds' THEN
  IF NEW.provider_refund_id <> OLD.provider_refund_id OR NEW.order_id <> OLD.order_id OR NEW.payment_id <> OLD.payment_id
    OR NEW.amount <> OLD.amount OR NEW.currency <> OLD.currency OR NEW.occurred_at <> OLD.occurred_at THEN
   RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='COMMERCE_IDENTITY_CONFLICT';
  END IF;
 ELSIF NEW.provider_dispute_id <> OLD.provider_dispute_id OR NEW.order_id <> OLD.order_id OR NEW.payment_id <> OLD.payment_id
   OR NEW.amount <> OLD.amount OR NEW.currency <> OLD.currency THEN
  RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='COMMERCE_IDENTITY_CONFLICT';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER provider_payments_identity BEFORE UPDATE ON private.provider_payments
 FOR EACH ROW EXECUTE FUNCTION private.commerce_identity_guard();
CREATE TRIGGER payment_refunds_identity BEFORE UPDATE ON private.payment_refunds
 FOR EACH ROW EXECUTE FUNCTION private.commerce_identity_guard();
CREATE TRIGGER payment_disputes_identity BEFORE UPDATE ON private.payment_disputes
 FOR EACH ROW EXECUTE FUNCTION private.commerce_identity_guard();

-- Every recorded status, from any writer, as an append-only history. Earlier statuses are never erased. No foreign
-- key: history outlives test and fixture rows.
CREATE TABLE private.commerce_adjustment_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK (kind IN ('payment','refund','dispute')),
 provider_id text NOT NULL,
 order_id uuid NOT NULL,
 from_status text,
 to_status text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX commerce_adjustment_history_order ON private.commerce_adjustment_history(order_id, recorded_at);
CREATE TRIGGER commerce_adjustment_history_immutable BEFORE UPDATE OR DELETE ON private.commerce_adjustment_history
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
ALTER TABLE private.commerce_adjustment_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.commerce_adjustment_history FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.commerce_record_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_kind text; v_provider_id text;
BEGIN
 IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NULL; END IF;
 -- Each table names its provider id differently; only the matching branch reads it.
 IF TG_TABLE_NAME = 'provider_payments' THEN
  v_kind := 'payment'; v_provider_id := NEW.payment_intent_id;
 ELSIF TG_TABLE_NAME = 'payment_refunds' THEN
  v_kind := 'refund'; v_provider_id := NEW.provider_refund_id;
 ELSE
  v_kind := 'dispute'; v_provider_id := NEW.provider_dispute_id;
 END IF;
 INSERT INTO private.commerce_adjustment_history(kind, provider_id, order_id, from_status, to_status)
 VALUES (v_kind, v_provider_id, NEW.order_id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END, NEW.status);
 RETURN NULL;
END $$;
CREATE TRIGGER provider_payments_status AFTER INSERT OR UPDATE OF status ON private.provider_payments
 FOR EACH ROW EXECUTE FUNCTION private.commerce_record_status();
CREATE TRIGGER payment_refunds_status AFTER INSERT OR UPDATE OF status ON private.payment_refunds
 FOR EACH ROW EXECUTE FUNCTION private.commerce_record_status();
CREATE TRIGGER payment_disputes_status AFTER INSERT OR UPDATE OF status ON private.payment_disputes
 FOR EACH ROW EXECUTE FUNCTION private.commerce_record_status();

-- Whether purchase confirmations are really delivered. Nothing sends the commerce outbox yet, so receipts and repair
-- proposals report no email until the owner turns this on for a verified delivery integration. Outbox rows are still
-- written with their dedupe keys either way.
CREATE TABLE private.commerce_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 purchase_confirmation_delivery boolean NOT NULL DEFAULT false
);
INSERT INTO private.commerce_settings DEFAULT VALUES;
ALTER TABLE private.commerce_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.commerce_settings FROM PUBLIC, anon, authenticated;

-- The one notification a change may carry (TypeScript twin: notificationEffect). Diagnosis and projection changes
-- never notify; a fulfilment notifies once, and only when delivery is approved.
CREATE FUNCTION private.commerce_notification_effect(p_kind text, p_already_queued boolean, p_delivery_approved boolean) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN p_kind = 'fulfilment' AND NOT p_already_queued AND p_delivery_approved THEN 'purchase_confirmation' ELSE 'none' END
$$;

-- What the recorded payment facts already exclude for an order's purchase source, or NULL.
CREATE FUNCTION private.commerce_recorded_exclusion(p_order_id uuid) RETURNS text
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT CASE
  WHEN EXISTS (SELECT 1 FROM private.provider_payments p WHERE p.order_id = p_order_id AND p.status = 'succeeded'
    AND (SELECT coalesce(sum(r.amount), 0) FROM private.payment_refunds r WHERE r.payment_id = p.id AND r.status = 'succeeded')
      >= p.captured_amount) THEN 'fully_refunded'
  WHEN EXISTS (SELECT 1 FROM private.payment_disputes d WHERE d.order_id = p_order_id AND d.access_effect = 'revoked') THEN 'dispute_lost'
  WHEN EXISTS (SELECT 1 FROM private.payment_disputes d WHERE d.order_id = p_order_id AND d.access_effect = 'held') THEN 'dispute_hold'
 END
$$;

-- The older payment and refund procedures, guarded. Their callers move to the shared writer once the
-- order's policy is approved; until then they keep working without re-enabling an excluded source.
CREATE OR REPLACE FUNCTION private.record_payment_and_grant_access(
  p_order_id UUID,
  p_provider_account_id TEXT,
  p_provider_mode TEXT,
  p_payment_intent_id TEXT,
  p_charge_id TEXT,
  p_captured_amount INT,
  p_currency TEXT,
  p_paid_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_payment_id UUID;
  v_entitlement_state TEXT;
  v_expected_amount INT;
  v_expected_currency TEXT;
  v_expected_mode TEXT;
  v_expected_provider_account_id TEXT;
  v_exclusion TEXT;
BEGIN
  -- Collection first, then the order: the lock order checkout reservation and publication also use.
  PERFORM 1
  FROM public.recipe_collections c
  JOIN public.collection_releases r ON r.collection_id = c.id
  JOIN private.purchase_orders po ON po.release_id = r.id
  WHERE po.id = p_order_id
  FOR UPDATE OF c;

  SELECT po.*
  INTO v_order
  FROM private.purchase_orders po
  WHERE po.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  BEGIN
    v_expected_amount := NULLIF(v_order.snapshot->>'price_minor', '')::INT;
  EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      v_expected_amount := NULL;
  END;
  v_expected_provider_account_id := NULLIF(v_order.snapshot->>'provider_account_id', '');
  v_expected_currency := lower(NULLIF(v_order.snapshot->>'currency', ''));
  v_expected_mode := NULLIF(v_order.snapshot->>'provider_mode', '');

  IF v_expected_amount IS NULL
     OR p_captured_amount IS DISTINCT FROM v_expected_amount
     OR v_expected_currency IS NULL
     OR lower(p_currency) IS DISTINCT FROM v_expected_currency
     OR v_expected_provider_account_id IS NULL
     OR p_provider_account_id IS DISTINCT FROM v_expected_provider_account_id
     OR p_provider_mode IS DISTINCT FROM v_expected_mode THEN
    UPDATE private.purchase_orders
    SET attempt_state = 'review', updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'order_id', p_order_id,
      'attempt_state', 'review',
      'reason', 'payment_snapshot_mismatch'
    );
  END IF;

  INSERT INTO private.provider_payments AS existing_payment (
    order_id,
    provider_account_id,
    provider_mode,
    payment_intent_id,
    charge_id,
    status,
    captured_amount,
    currency,
    paid_at,
    verified_at
  )
  VALUES (
    p_order_id,
    p_provider_account_id,
    p_provider_mode,
    p_payment_intent_id,
    p_charge_id,
    'succeeded',
    p_captured_amount,
    lower(p_currency),
    p_paid_at,
    now()
  )
  ON CONFLICT (provider_account_id, provider_mode, payment_intent_id)
  DO UPDATE SET
    verified_at = now(),
    status = EXCLUDED.status
  WHERE existing_payment.order_id = EXCLUDED.order_id
  RETURNING id INTO v_payment_id;

  IF v_payment_id IS NULL THEN
    UPDATE private.purchase_orders
    SET attempt_state = 'review', updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'order_id', p_order_id,
      'attempt_state', 'review',
      'reason', 'payment_intent_already_bound'
    );
  END IF;

  IF v_order.user_id IS NOT NULL THEN
    -- A replayed success never re-enables a source that recorded refunds, disputes or a reconciliation already
    -- excluded; only the shared reconciliation writer can restore one, from verified evidence and approved policy.
    v_exclusion := private.commerce_recorded_exclusion(p_order_id);
    INSERT INTO private.access_sources (
      user_id,
      release_id,
      source_kind,
      source_id,
      is_eligible,
      ineligibility_reason,
      valid_from
    )
    VALUES (
      v_order.user_id,
      v_order.release_id,
      'stripe_purchase',
      p_order_id::text,
      v_exclusion IS NULL,
      v_exclusion,
      now()
    )
    ON CONFLICT (source_kind, source_id, release_id)
    DO UPDATE SET
      is_eligible = access_sources.is_eligible AND v_exclusion IS NULL,
      ineligibility_reason = CASE WHEN access_sources.is_eligible AND v_exclusion IS NULL THEN NULL
        ELSE coalesce(v_exclusion, access_sources.ineligibility_reason) END,
      updated_at = now();

    v_entitlement_state := private.project_user_entitlement(v_order.user_id, v_order.release_id);
  END IF;

  UPDATE private.purchase_orders
  SET attempt_state = 'closed', updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO private.commerce_outbox (
    idempotency_key,
    order_id,
    event_kind,
    payload
  )
  VALUES (
    'order-paid-' || p_order_id::text,
    p_order_id,
    'purchase_confirmed',
    jsonb_build_object(
      'order_id', p_order_id,
      'support_reference', v_order.support_reference,
      'amount', p_captured_amount,
      'currency', lower(p_currency),
      'paid_at', p_paid_at
    )
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'payment_id', v_payment_id,
    'entitlement_state', v_entitlement_state
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.record_refund_and_recompute_access(
  p_order_id UUID,
  p_provider_refund_id TEXT,
  p_payment_id UUID,
  p_amount INT,
  p_currency TEXT,
  p_status TEXT,
  p_reason TEXT,
  p_occurred_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_payment RECORD;
  v_total_refunded INT;
  v_entitlement_state TEXT;
BEGIN
  -- Collection, order, then payment: the lock order every payment and access writer uses.
  PERFORM 1
  FROM public.recipe_collections c
  JOIN public.collection_releases r ON r.collection_id = c.id
  JOIN private.purchase_orders po ON po.release_id = r.id
  WHERE po.id = p_order_id
  FOR UPDATE OF c;

  SELECT * INTO v_order FROM private.purchase_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  SELECT * INTO v_payment FROM private.provider_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  -- A refund belongs to its payment's order and currency; nothing is relinked.
  IF v_payment.order_id <> p_order_id OR lower(p_currency) IS DISTINCT FROM v_payment.currency THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'COMMERCE_BINDING_MISMATCH';
  END IF;

  -- Record refund
  INSERT INTO private.payment_refunds (
    provider_refund_id,
    order_id,
    payment_id,
    amount,
    currency,
    status,
    reason,
    occurred_at,
    verified_at
  )
  VALUES (
    p_provider_refund_id,
    p_order_id,
    p_payment_id,
    p_amount,
    lower(p_currency),
    p_status,
    p_reason,
    p_occurred_at,
    now()
  )
  ON CONFLICT (provider_refund_id) DO UPDATE SET
    status = EXCLUDED.status,
    verified_at = now();

  -- Sum all successful refunds for this payment
  SELECT COALESCE(sum(amount), 0)::int
  INTO v_total_refunded
  FROM private.payment_refunds
  WHERE payment_id = p_payment_id
    AND status = 'succeeded';

  -- If full refund reached, mark access source ineligible
  IF v_total_refunded >= v_payment.captured_amount AND v_order.user_id IS NOT NULL THEN
    UPDATE private.access_sources
    SET is_eligible = false,
        ineligibility_reason = 'fully_refunded',
        updated_at = now()
    WHERE user_id = v_order.user_id
      AND release_id = v_order.release_id
      AND source_kind = 'stripe_purchase'
      AND source_id = p_order_id::text;

    -- Re-project entitlement
    v_entitlement_state := private.project_user_entitlement(v_order.user_id, v_order.release_id);
  END IF;

  -- Enqueue outbox notification
  INSERT INTO private.commerce_outbox (
    idempotency_key,
    order_id,
    event_kind,
    payload
  )
  VALUES (
    'refund-confirmed-' || p_provider_refund_id,
    p_order_id,
    'refund_confirmed',
    jsonb_build_object(
      'order_id', p_order_id,
      'refund_id', p_provider_refund_id,
      'amount', p_amount,
      'currency', p_currency,
      'total_refunded', v_total_refunded
    )
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'total_refunded', v_total_refunded,
    'captured_amount', v_payment.captured_amount,
    'entitlement_state', v_entitlement_state
  );
END;
$$;

-- One receipt per operation: repeating an operation returns its first answer; reusing its id for anything else is a
-- conflict.
CREATE TABLE private.commerce_reconcile_receipts (
 operation_id uuid PRIMARY KEY,
 observation_id uuid NOT NULL REFERENCES private.commerce_provider_observations(id) ON DELETE RESTRICT,
 order_id uuid NOT NULL,
 context jsonb NOT NULL,
 receipt jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER commerce_reconcile_receipts_immutable BEFORE UPDATE OR DELETE ON private.commerce_reconcile_receipts
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
ALTER TABLE private.commerce_reconcile_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.commerce_reconcile_receipts FROM PUBLIC, anon, authenticated;

-- Context: {actor 'system'|'human', actorId, approvalId, eventId, fence, orderId, purpose}. Built only by the entry
-- points below (and later by approved repair); never accepted from a browser.
CREATE FUNCTION private.commerce_reconcile_core(p_context jsonb, p_observation_id uuid, p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_obs private.commerce_provider_observations; v_job private.commerce_verification_jobs; v_order private.purchase_orders;
 v_prior private.commerce_reconcile_receipts; v_payment private.provider_payments; v_source private.access_sources;
 v_facts jsonb; v_eval jsonb; v_x jsonb; v_collection uuid; v_conflicts text[] := '{}'; v_reasons text[];
 v_old_status text; v_changed boolean := false; v_new_payment boolean := false; v_before_eligible boolean;
 v_after_eligible boolean; v_before_access boolean; v_after_access boolean; v_effects jsonb := '[]'; v_state text;
 v_audit uuid; v_receipt jsonb; v_effect text; v_total int; v_pay_status text;
BEGIN
 PERFORM set_config('lock_timeout', '5000', true);
 IF p_context IS NULL OR jsonb_typeof(p_context) <> 'object' OR p_observation_id IS NULL OR p_operation_id IS NULL
   OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p_context) k)
     <> ARRAY['actor','actorId','approvalId','eventId','fence','orderId','purpose']
   OR p_context->>'actor' NOT IN ('system','human')
   -- System runs name no person and no approval; human runs name both.
   OR (p_context->>'actor' = 'system' AND (p_context->'actorId' <> 'null' OR p_context->'approvalId' <> 'null'))
   OR (p_context->>'actor' = 'human' AND (p_context->'actorId' = 'null' OR p_context->'approvalId' = 'null')) THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 SELECT * INTO v_obs FROM private.commerce_provider_observations WHERE id = p_observation_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF v_obs.order_id::text <> p_context->>'orderId' OR v_obs.purpose <> p_context->>'purpose' OR v_obs.fence::text <> p_context->>'fence' THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;

 -- Collection, order, then payment and source rows: the lock order checkout, publication and payment recording use.
 SELECT r.collection_id INTO v_collection FROM private.purchase_orders po JOIN public.collection_releases r ON r.id = po.release_id
 WHERE po.id = v_obs.order_id;
 PERFORM 1 FROM public.recipe_collections WHERE id = v_collection FOR UPDATE;
 SELECT * INTO v_order FROM private.purchase_orders WHERE id = v_obs.order_id FOR UPDATE;
 PERFORM 1 FROM private.provider_payments WHERE order_id = v_order.id ORDER BY id FOR UPDATE;
 PERFORM 1 FROM private.access_sources WHERE source_kind = 'stripe_purchase' AND source_id = v_order.id::text ORDER BY id FOR UPDATE;

 SELECT * INTO v_prior FROM private.commerce_reconcile_receipts WHERE operation_id = p_operation_id;
 IF FOUND THEN
  IF v_prior.observation_id = p_observation_id AND v_prior.context = p_context THEN RETURN v_prior.receipt; END IF;
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;

 -- The evidence must describe the order as it is now, and no newer complete answer may exist: an older answer
 -- never overwrites a later one.
 SELECT * INTO v_job FROM private.commerce_verification_jobs WHERE id = v_obs.job_id;
 IF v_job.expected_order_version <> v_order.version OR EXISTS (SELECT 1 FROM private.commerce_provider_observations n
   WHERE n.order_id = v_order.id AND n.complete AND n.fence > v_obs.fence) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;

 v_facts := v_obs.facts;
 IF NOT v_obs.complete THEN
  v_conflicts := v_conflicts || 'observation_incomplete'::text;
 ELSE
  -- Provider ids recorded for something else, or with different amounts, block everything; nothing is relinked.
  SELECT * INTO v_payment FROM private.provider_payments WHERE provider_account_id = v_facts->>'accountId'
   AND provider_mode = v_facts->>'mode' AND payment_intent_id = v_facts->>'paymentIntentId';
  IF FOUND AND (v_payment.order_id <> v_order.id OR v_payment.captured_amount IS DISTINCT FROM (v_facts->>'capturedMinor')::int
    OR v_payment.currency IS DISTINCT FROM v_facts->>'currency'
    OR (v_payment.charge_id IS NOT NULL AND v_payment.charge_id IS DISTINCT FROM v_facts->>'chargeId')) THEN
   v_conflicts := v_conflicts || 'payment_conflict'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM private.provider_payments p WHERE p.order_id = v_order.id
    AND (p.provider_account_id, p.provider_mode, p.payment_intent_id)
      IS DISTINCT FROM (v_facts->>'accountId', v_facts->>'mode', v_facts->>'paymentIntentId')) THEN
   v_conflicts := v_conflicts || 'payment_conflict'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_facts->'refunds') x JOIN private.payment_refunds r ON r.provider_refund_id = x->>'id'
    WHERE r.order_id <> v_order.id OR r.payment_id IS DISTINCT FROM v_payment.id OR r.amount <> (x->>'amountMinor')::int
      OR r.currency <> x->>'currency') THEN
   v_conflicts := v_conflicts || 'refund_conflict'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_facts->'disputes') x JOIN private.payment_disputes d ON d.provider_dispute_id = x->>'id'
    WHERE d.order_id <> v_order.id OR d.payment_id IS DISTINCT FROM v_payment.id OR d.amount <> (x->>'amountMinor')::int
      OR d.currency <> x->>'currency') THEN
   v_conflicts := v_conflicts || 'dispute_conflict'::text;
  END IF;
  IF (jsonb_array_length(v_facts->'refunds') > 0 OR jsonb_array_length(v_facts->'disputes') > 0)
    AND (v_facts->>'paymentState' <> 'paid' OR v_facts->'paymentIntentId' = 'null') THEN
   v_conflicts := v_conflicts || 'payment_incomplete'::text;
  END IF;
 END IF;

 IF cardinality(v_conflicts) = 0 THEN
  v_eval := private.commerce_evaluate_purchase(v_order.id, v_obs.id);
  -- Facts are recorded when they are bound to this order. A missing approved policy still allows that; exclusions and
  -- notes are outcomes, not binding problems. Any other blocker (including one added later) stops all writes.
  SELECT coalesce(array_agg(r), '{}') INTO v_conflicts FROM jsonb_array_elements_text(v_eval->'reasons') r
   WHERE v_eval->>'state' = 'blocked' AND r NOT IN ('policy_missing', 'not_paid', 'fully_refunded', 'dispute_lost', 'dispute_hold',
    'account_inactive', 'manual_hold', 'expired', 'dispute_open');
 END IF;

 IF cardinality(v_conflicts) > 0 THEN
  v_state := 'blocked';
  SELECT array_agg(DISTINCT r ORDER BY r) INTO v_reasons FROM unnest(v_conflicts) r;
 ELSE
  -- The payment, refunds and disputes as the provider reported them now.
  v_pay_status := CASE v_facts->>'paymentState' WHEN 'paid' THEN 'succeeded' WHEN 'failed' THEN 'failed'
   WHEN 'processing' THEN 'processing' ELSE 'requires_payment' END;
  IF v_facts->>'paymentState' = 'paid' AND v_facts->'paymentIntentId' <> 'null' THEN
   IF v_payment.id IS NULL THEN
    INSERT INTO private.provider_payments(order_id, provider_account_id, provider_mode, payment_intent_id, charge_id, status,
     captured_amount, currency, paid_at, verified_at)
    VALUES (v_order.id, v_facts->>'accountId', v_facts->>'mode', v_facts->>'paymentIntentId', v_facts->>'chargeId', 'succeeded',
     (v_facts->>'capturedMinor')::int, v_facts->>'currency', (v_facts->>'paidAt')::timestamptz, now())
    RETURNING * INTO v_payment;
    v_new_payment := true;
    v_changed := true;
   ELSE
    IF v_payment.status <> 'succeeded' THEN v_changed := true; END IF;
    UPDATE private.provider_payments SET status = 'succeeded', charge_id = coalesce(charge_id, v_facts->>'chargeId'), verified_at = now()
    WHERE id = v_payment.id;
   END IF;
  ELSIF v_payment.id IS NOT NULL AND v_payment.status <> v_pay_status THEN
   UPDATE private.provider_payments SET verified_at = now(), status = v_pay_status WHERE id = v_payment.id;
   v_changed := true;
  END IF;

  FOR v_x IN SELECT x FROM jsonb_array_elements(v_facts->'refunds') x ORDER BY x->>'id' COLLATE "C" LOOP
   SELECT status INTO v_old_status FROM private.payment_refunds WHERE provider_refund_id = v_x->>'id';
   INSERT INTO private.payment_refunds(provider_refund_id, order_id, payment_id, amount, currency, status, occurred_at, verified_at)
   VALUES (v_x->>'id', v_order.id, v_payment.id, (v_x->>'amountMinor')::int, v_x->>'currency', v_x->>'status',
    (v_x->>'occurredAt')::timestamptz, now())
   ON CONFLICT (provider_refund_id) DO UPDATE SET status = EXCLUDED.status, verified_at = now();
   IF v_old_status IS DISTINCT FROM v_x->>'status' THEN
    v_changed := true;
    IF v_x->>'status' = 'succeeded' THEN
     SELECT coalesce(sum(amount), 0)::int INTO v_total FROM private.payment_refunds WHERE payment_id = v_payment.id AND status = 'succeeded';
     INSERT INTO private.commerce_outbox(idempotency_key, order_id, event_kind, payload)
     VALUES ('refund-confirmed-' || (v_x->>'id'), v_order.id, 'refund_confirmed', jsonb_build_object('order_id', v_order.id,
      'refund_id', v_x->>'id', 'amount', (v_x->>'amountMinor')::int, 'currency', v_x->>'currency', 'total_refunded', v_total))
     ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
   END IF;
  END LOOP;

  FOR v_x IN SELECT x FROM jsonb_array_elements(v_facts->'disputes') x ORDER BY x->>'id' COLLATE "C" LOOP
   v_effect := CASE WHEN v_x->>'classification' <> 'formal' THEN 'none' WHEN v_x->>'status' = 'lost' THEN 'revoked'
    WHEN v_x->>'status' IN ('needs_response','under_review') THEN 'held' ELSE 'none' END;
   SELECT status INTO v_old_status FROM private.payment_disputes WHERE provider_dispute_id = v_x->>'id';
   INSERT INTO private.payment_disputes(provider_dispute_id, order_id, payment_id, amount, currency, status, access_effect)
   VALUES (v_x->>'id', v_order.id, v_payment.id, (v_x->>'amountMinor')::int, v_x->>'currency', v_x->>'status', v_effect)
   ON CONFLICT (provider_dispute_id) DO UPDATE SET status = EXCLUDED.status, access_effect = EXCLUDED.access_effect, updated_at = now();
   IF v_old_status IS DISTINCT FROM v_x->>'status' THEN v_changed := true; END IF;
  END LOOP;

  SELECT array_agg(r ORDER BY r) INTO v_reasons FROM jsonb_array_elements_text(v_eval->'reasons') r;
  v_reasons := coalesce(v_reasons, '{}');
  IF v_eval->>'state' = 'blocked' THEN
   v_state := 'blocked';
  ELSIF v_order.user_id IS NOT NULL THEN
   -- Judge the order's purchase source. Other sources (app purchases, grants) are never touched.
   SELECT * INTO v_source FROM private.access_sources WHERE source_kind = 'stripe_purchase' AND source_id = v_order.id::text
    AND release_id = v_order.release_id;
   v_before_eligible := CASE WHEN v_source.id IS NULL THEN NULL ELSE v_source.is_eligible END;
   v_before_access := private.collection_has_access(v_order.user_id, v_collection);
   v_after_eligible := v_eval->>'state' = 'eligible';
   IF v_after_eligible THEN
    INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, ineligibility_reason, valid_from, expires_at)
    VALUES (v_order.user_id, v_order.release_id, 'stripe_purchase', v_order.id::text, true, NULL,
     coalesce((v_eval->>'validFrom')::timestamptz, now()), (v_eval->>'expiresAt')::timestamptz)
    ON CONFLICT (source_kind, source_id, release_id) DO UPDATE SET is_eligible = true, ineligibility_reason = NULL,
     valid_from = LEAST(access_sources.valid_from, EXCLUDED.valid_from), expires_at = EXCLUDED.expires_at, updated_at = now();
   ELSIF v_source.id IS NOT NULL THEN
    UPDATE private.access_sources SET is_eligible = false, ineligibility_reason = array_to_string(v_reasons, ','), updated_at = now()
    WHERE id = v_source.id AND (is_eligible OR ineligibility_reason IS DISTINCT FROM array_to_string(v_reasons, ','));
   END IF;
   IF v_before_eligible IS DISTINCT FROM v_after_eligible AND (v_source.id IS NOT NULL OR v_after_eligible) THEN
    PERFORM private.project_user_entitlement(v_order.user_id, v_order.release_id);
    v_changed := true;
   END IF;
   v_after_access := private.collection_has_access(v_order.user_id, v_collection);
   IF v_source.id IS NOT NULL OR v_after_eligible THEN
    v_effects := jsonb_build_array(jsonb_build_object('sourceId', v_order.id, 'beforeEligible', v_before_eligible,
     'afterEligible', v_after_eligible, 'beforeEffective', CASE WHEN v_before_access THEN 'active' ELSE 'denied' END,
     'afterEffective', CASE WHEN v_after_access THEN 'active' ELSE 'denied' END,
     'recipeIds', (SELECT coalesce(jsonb_agg(cr.recipe_id ORDER BY cr.position), '[]') FROM public.collection_recipes cr
       WHERE cr.release_id = v_order.release_id),
     'notification', private.commerce_notification_effect(CASE WHEN v_new_payment AND v_after_eligible THEN 'fulfilment'
       ELSE 'projection' END, EXISTS (SELECT 1 FROM private.commerce_outbox WHERE idempotency_key = 'order-paid-' || v_order.id::text),
       (SELECT purchase_confirmation_delivery FROM private.commerce_settings))));
   END IF;
   IF v_new_payment AND v_after_eligible THEN
    UPDATE private.purchase_orders SET attempt_state = 'closed', updated_at = now() WHERE id = v_order.id AND attempt_state <> 'closed';
    INSERT INTO private.commerce_outbox(idempotency_key, order_id, event_kind, payload)
    VALUES ('order-paid-' || v_order.id::text, v_order.id, 'purchase_confirmed', jsonb_build_object('order_id', v_order.id,
     'support_reference', v_order.support_reference, 'amount', (v_facts->>'capturedMinor')::int, 'currency', v_facts->>'currency',
     'paid_at', v_facts->>'paidAt'))
    ON CONFLICT (idempotency_key) DO NOTHING;
   END IF;
  END IF;
  IF v_state IS NULL THEN v_state := CASE WHEN v_changed THEN 'applied' ELSE 'already_satisfied' END; END IF;
 END IF;

 INSERT INTO private.access_events(actor_type, actor_id, event_type, metadata)
 VALUES (p_context->>'actor', (p_context->>'actorId')::uuid, 'commerce_reconciled', jsonb_build_object('operationId', p_operation_id,
  'observationId', p_observation_id, 'orderId', v_order.id, 'purpose', v_obs.purpose, 'eventId', p_context->'eventId',
  'approvalId', p_context->'approvalId', 'state', v_state, 'reasons', to_jsonb(coalesce(v_reasons, '{}')), 'effects', v_effects))
 RETURNING id INTO v_audit;
 v_receipt := jsonb_build_object('operationId', p_operation_id, 'orderId', v_order.id, 'state', v_state, 'effects', v_effects,
  'auditId', v_audit, 'committedAt', private.commerce_utc(clock_timestamp()));
 IF v_state = 'blocked' THEN v_receipt := v_receipt || jsonb_build_object('reasons', to_jsonb(v_reasons)); END IF;
 INSERT INTO private.commerce_reconcile_receipts(operation_id, observation_id, order_id, context, receipt)
 VALUES (p_operation_id, p_observation_id, v_order.id, p_context, v_receipt);
 RETURN v_receipt;
END $$;

-- Automated processing (webhooks, recovery) asks for a check of one order. A live check for another purpose makes the
-- caller wait; a live check for the same purpose is joined.
CREATE FUNCTION private.commerce_verification_request(p_order_id uuid, p_purpose text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); v_order private.purchase_orders; v_job private.commerce_verification_jobs;
BEGIN
 PERFORM set_config('lock_timeout', '5000', true);
 IF p_purpose IS NULL OR p_purpose NOT IN ('webhook','recovery') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 SELECT * INTO v_order FROM private.purchase_orders WHERE id = p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 SELECT * INTO v_job FROM private.commerce_verification_jobs WHERE order_id = p_order_id AND state IN ('pending','claimed') FOR UPDATE;
 IF FOUND THEN
  IF v_job.purpose = p_purpose THEN RETURN v_job.id; END IF;
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 INSERT INTO private.commerce_verification_jobs(order_id, purpose, expected_order_version)
 VALUES (p_order_id, p_purpose, v_order.version) RETURNING * INTO v_job;
 RETURN v_job.id;
END $$;

-- Automated application of a webhook or recovery observation. A staff diagnosis is never applied by the system.
CREATE FUNCTION private.commerce_reconcile_system(p_observation_id uuid, p_operation_id uuid, p_event_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); v_obs private.commerce_provider_observations;
BEGIN
 IF p_event_id IS NOT NULL AND p_event_id !~ '^evt_[A-Za-z0-9_-]{1,255}$' THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 SELECT * INTO v_obs FROM private.commerce_provider_observations WHERE id = p_observation_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF v_obs.purpose NOT IN ('webhook','recovery') THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED'; END IF;
 RETURN private.commerce_reconcile_core(jsonb_build_object('actor', 'system', 'actorId', NULL, 'approvalId', NULL,
  'eventId', p_event_id, 'fence', v_obs.fence, 'orderId', v_obs.order_id, 'purpose', v_obs.purpose), p_observation_id, p_operation_id);
END $$;

REVOKE ALL ON FUNCTION private.commerce_identity_guard(), private.commerce_record_status(), private.commerce_recorded_exclusion(uuid),
 private.commerce_notification_effect(text,boolean,boolean),
 private.commerce_reconcile_core(jsonb,uuid,uuid), private.commerce_verification_request(uuid,text),
 private.commerce_reconcile_system(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.commerce_verification_request(uuid,text), private.commerce_reconcile_system(uuid,uuid,text)
 TO mch_commerce_verifier;
