-- Phase 8 remediation: keep the Stripe Checkout URL and reject captures that
-- do not match the immutable purchase-order snapshot.

ALTER TABLE private.purchase_orders
  ADD COLUMN IF NOT EXISTS checkout_url TEXT;

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
BEGIN
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
    INSERT INTO private.access_sources (
      user_id,
      release_id,
      source_kind,
      source_id,
      is_eligible,
      valid_from
    )
    VALUES (
      v_order.user_id,
      v_order.release_id,
      'stripe_purchase',
      p_order_id::text,
      true,
      now()
    )
    ON CONFLICT (source_kind, source_id, release_id)
    DO UPDATE SET
      is_eligible = true,
      ineligibility_reason = NULL,
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
