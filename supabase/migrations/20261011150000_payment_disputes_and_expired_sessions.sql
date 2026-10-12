-- Disputes and abandoned checkouts on the older webhook path (used until a verifier login is registered and an
-- order's policy is approved; then the shared writer in 20261009010600 judges the same events).
--
-- Disputes follow the owner's decision C07 (2026-10-09) and the reconciliation core's mapping: an open formal
-- dispute holds that purchase as an access source, a lost one removes it like a full refund, and an inquiry or a
-- dispute closed any other way changes nothing. Other valid sources keep access. A hold this dispute placed is lifted
-- when the dispute closes without a loss, unless something else (a full refund, another hold) still excludes the
-- purchase. A lost dispute is final. Stripe's response deadline is kept for the support queue.
--
-- Expired sessions: an abandoned Checkout Session stayed `open` forever, and reserve_collection_order kept handing
-- back its dead link, so the buyer could never purchase. Closing it lets a new attempt start.

CREATE OR REPLACE FUNCTION private.record_dispute_and_recompute_access(
  p_provider_dispute_id TEXT,
  p_payment_id UUID,
  p_amount INT,
  p_currency TEXT,
  p_status TEXT,
  p_reason TEXT,
  p_response_deadline TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment private.provider_payments;
  v_order private.purchase_orders;
  v_effect TEXT;
  v_previous TEXT;
  v_exclusion TEXT;
  v_entitlement_state TEXT;
BEGIN
  IF p_provider_dispute_id IS NULL OR p_provider_dispute_id !~ '^du_[A-Za-z0-9_]{1,255}$' THEN
    RAISE EXCEPTION 'Invalid dispute id';
  END IF;
  SELECT * INTO v_payment FROM private.provider_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  SELECT * INTO v_order FROM private.purchase_orders WHERE id = v_payment.order_id FOR UPDATE;

  -- The same mapping as the reconciliation core.
  v_effect := CASE
    WHEN private.support_dispute_classification(p_status) <> 'formal' THEN 'none'
    WHEN p_status = 'lost' THEN 'revoked'
    WHEN p_status IN ('needs_response', 'under_review') THEN 'held'
    ELSE 'none'
  END;

  SELECT access_effect INTO v_previous FROM private.payment_disputes WHERE provider_dispute_id = p_provider_dispute_id;

  INSERT INTO private.payment_disputes (
    provider_dispute_id, order_id, payment_id, amount, currency, status, reason, access_effect, response_deadline
  )
  VALUES (
    p_provider_dispute_id, v_payment.order_id, p_payment_id, p_amount, p_currency, p_status, p_reason, v_effect,
    p_response_deadline
  )
  ON CONFLICT (provider_dispute_id) DO UPDATE SET
    status = EXCLUDED.status,
    reason = EXCLUDED.reason,
    -- A lost dispute is final; a late or replayed earlier event must not undo it.
    access_effect = CASE
      WHEN private.payment_disputes.access_effect = 'revoked' THEN 'revoked'
      ELSE EXCLUDED.access_effect
    END,
    response_deadline = coalesce(EXCLUDED.response_deadline, private.payment_disputes.response_deadline),
    updated_at = now();

  SELECT access_effect INTO v_effect FROM private.payment_disputes WHERE provider_dispute_id = p_provider_dispute_id;

  IF v_order.user_id IS NOT NULL THEN
    IF v_effect IN ('held', 'revoked') THEN
      UPDATE private.access_sources
      SET is_eligible = false,
          ineligibility_reason = CASE WHEN v_effect = 'revoked' THEN 'dispute_lost'
            ELSE coalesce(ineligibility_reason, 'dispute_hold') END,
          updated_at = now()
      WHERE user_id = v_order.user_id
        AND release_id = v_order.release_id
        AND source_kind = 'stripe_purchase'
        AND source_id = v_order.id::text;
      v_entitlement_state := private.project_user_entitlement(v_order.user_id, v_order.release_id);
    ELSIF v_previous = 'held' THEN
      -- The hold ended without a loss: restore only what the hold took, if nothing else still excludes the purchase.
      v_exclusion := private.commerce_recorded_exclusion(v_order.id);
      IF v_exclusion IS NULL THEN
        UPDATE private.access_sources
        SET is_eligible = true,
            ineligibility_reason = NULL,
            updated_at = now()
        WHERE user_id = v_order.user_id
          AND release_id = v_order.release_id
          AND source_kind = 'stripe_purchase'
          AND source_id = v_order.id::text
          AND ineligibility_reason = 'dispute_hold';
        v_entitlement_state := private.project_user_entitlement(v_order.user_id, v_order.release_id);
      END IF;
    END IF;
  END IF;

  INSERT INTO private.access_events (actor_type, actor_id, event_type, metadata)
  VALUES (
    'system',
    v_order.user_id,
    'payment_dispute_' || p_status,
    jsonb_build_object('order_id', v_order.id, 'dispute_id', p_provider_dispute_id, 'access_effect', v_effect)
  );

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'access_effect', v_effect,
    'entitlement_state', v_entitlement_state
  );
END;
$$;

-- Close an attempt whose Checkout Session expired unpaid. Paid, reviewed or rebound orders are left alone.
CREATE OR REPLACE FUNCTION private.close_expired_checkout_attempt(p_session_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE private.purchase_orders po
  SET attempt_state = 'closed',
      updated_at = now()
  WHERE po.session_id = p_session_id
    AND po.attempt_state IN ('creating', 'creation_unknown', 'open')
    AND NOT EXISTS (
      SELECT 1 FROM private.provider_payments pp WHERE pp.order_id = po.id AND pp.status = 'succeeded'
    );
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION private.record_dispute_and_recompute_access(TEXT, UUID, INT, TEXT, TEXT, TEXT, TIMESTAMPTZ),
  private.close_expired_checkout_attempt(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.record_dispute_and_recompute_access(TEXT, UUID, INT, TEXT, TEXT, TEXT, TIMESTAMPTZ),
  private.close_expired_checkout_attempt(TEXT) TO service_role, postgres;
