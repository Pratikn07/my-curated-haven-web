-- Phase 8: One-Time Checkout and Purchased Recipe Access Schema
-- Contract reference: docs/implementation/phase-8/PAYMENT-DATA-AND-STATES.md and RECIPE-ACCESS-AND-SECURITY.md

-- ============================================================================
-- 1. Ensure private schema isolation
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT ALL ON SCHEMA private TO postgres, service_role;

-- ============================================================================
-- 2. Commercial Offers & Manifests
-- ============================================================================
CREATE TABLE IF NOT EXISTS private.commercial_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES public.collection_releases(id) ON DELETE RESTRICT,
  provider_account_id TEXT NOT NULL,
  provider_mode TEXT NOT NULL CHECK (provider_mode IN ('test', 'live')),
  provider_product_id TEXT NOT NULL,
  provider_price_id TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (char_length(currency) = 3),
  base_minor_amount INTEGER NOT NULL CHECK (base_minor_amount > 0),
  tax_mode TEXT NOT NULL CHECK (tax_mode IN ('inclusive', 'exclusive', 'none')) DEFAULT 'inclusive',
  quantity INTEGER NOT NULL CHECK (quantity = 1) DEFAULT 1,
  terms_version TEXT NOT NULL DEFAULT 'v1',
  refund_policy_version TEXT NOT NULL DEFAULT 'v1',
  access_policy_version TEXT NOT NULL DEFAULT 'v1',
  sale_enabled BOOLEAN NOT NULL DEFAULT false,
  manifest_hash TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commercial_offers_provider_uniq UNIQUE (provider_account_id, provider_mode, provider_price_id)
);

CREATE TABLE IF NOT EXISTS private.release_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL UNIQUE REFERENCES public.collection_releases(id) ON DELETE RESTRICT,
  member_recipe_ids UUID[] NOT NULL,
  manifest_checksum TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. Purchase Orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS private.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_reference TEXT NOT NULL UNIQUE,
  owner_principal UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  offer_id UUID NOT NULL REFERENCES private.commercial_offers(id) ON DELETE RESTRICT,
  release_id UUID NOT NULL REFERENCES public.collection_releases(id) ON DELETE RESTRICT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempt_state TEXT NOT NULL CHECK (attempt_state IN ('creating', 'creation_unknown', 'open', 'processing', 'review', 'closed')) DEFAULT 'creating',
  session_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  lease_token UUID,
  lease_expires_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_unresolved
  ON private.purchase_orders (user_id, release_id)
  WHERE attempt_state IN ('creating', 'creation_unknown', 'open', 'processing');

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_session
  ON private.purchase_orders (session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_id ON private.purchase_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_support_ref ON private.purchase_orders (support_reference);

-- ============================================================================
-- 4. Provider Payments, Refunds & Disputes
-- ============================================================================
CREATE TABLE IF NOT EXISTS private.provider_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES private.purchase_orders(id) ON DELETE RESTRICT,
  provider_account_id TEXT NOT NULL,
  provider_mode TEXT NOT NULL CHECK (provider_mode IN ('test', 'live')),
  payment_intent_id TEXT NOT NULL,
  charge_id TEXT,
  status TEXT NOT NULL,
  captured_amount INTEGER NOT NULL CHECK (captured_amount >= 0),
  currency TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT provider_payments_identity_uniq UNIQUE (provider_account_id, provider_mode, payment_intent_id)
);

CREATE TABLE IF NOT EXISTS private.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_refund_id TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES private.purchase_orders(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL REFERENCES private.provider_payments(id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private.payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_dispute_id TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES private.purchase_orders(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL REFERENCES private.provider_payments(id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  access_effect TEXT NOT NULL CHECK (access_effect IN ('none', 'held', 'revoked')) DEFAULT 'held',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. Webhook Ingestion Events & Side-Effects Outbox
-- ============================================================================
CREATE TABLE IF NOT EXISTS private.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  provider_mode TEXT NOT NULL,
  api_version TEXT NOT NULL,
  event_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  processing_state TEXT NOT NULL CHECK (processing_state IN ('pending', 'processing', 'completed', 'failed', 'dead_letter', 'ignored')) DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  lease_token UUID,
  lease_expires_at TIMESTAMPTZ,
  failure_code TEXT,
  failure_reason TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT payment_events_uniq UNIQUE (provider_account_id, provider_mode, event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_events_state ON private.payment_events (processing_state);

CREATE TABLE IF NOT EXISTS private.commerce_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES private.purchase_orders(id) ON DELETE CASCADE,
  event_kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'failed', 'exhausted')) DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. Access Sources (Provenance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS private.access_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id UUID NOT NULL REFERENCES public.collection_releases(id) ON DELETE CASCADE,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('stripe_purchase', 'native_legacy', 'support_grant', 'promotional')),
  source_id TEXT NOT NULL,
  is_eligible BOOLEAN NOT NULL DEFAULT true,
  ineligibility_reason TEXT,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT access_sources_kind_id_uniq UNIQUE (source_kind, source_id, release_id)
);

CREATE INDEX IF NOT EXISTS idx_access_sources_user_release ON private.access_sources (user_id, release_id);

-- ============================================================================
-- 7. Functions: Entitlement Projection & Fulfilment
-- ============================================================================

-- Atomically recomputes and projects entitlement for a specific user and release
CREATE OR REPLACE FUNCTION private.project_user_entitlement(
  p_user_id UUID,
  p_release_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
DECLARE
  v_eligible_count INT;
  v_min_valid_from TIMESTAMPTZ;
  v_max_expires_at TIMESTAMPTZ;
  v_has_unbounded BOOLEAN;
  v_effective_expires_at TIMESTAMPTZ;
  v_result_state TEXT;
BEGIN
  -- Count currently eligible sources
  SELECT
    count(*),
    min(valid_from),
    max(expires_at),
    bool_or(expires_at IS NULL)
  INTO
    v_eligible_count,
    v_min_valid_from,
    v_max_expires_at,
    v_has_unbounded
  FROM private.access_sources
  WHERE user_id = p_user_id
    AND release_id = p_release_id
    AND is_eligible = true
    AND valid_from <= now()
    AND (expires_at IS NULL OR expires_at > now());

  IF v_has_unbounded THEN
    v_effective_expires_at := NULL;
  ELSE
    v_effective_expires_at := v_max_expires_at;
  END IF;

  IF v_eligible_count > 0 THEN
    -- Project active entitlement
    INSERT INTO public.access_entitlements (
      user_id,
      release_id,
      state,
      valid_from,
      expires_at,
      revoked_at
    )
    VALUES (
      p_user_id,
      p_release_id,
      'active',
      COALESCE(v_min_valid_from, now()),
      v_effective_expires_at,
      NULL
    )
    ON CONFLICT (user_id, release_id) DO UPDATE SET
      state = 'active',
      valid_from = LEAST(public.access_entitlements.valid_from, EXCLUDED.valid_from),
      expires_at = EXCLUDED.expires_at,
      revoked_at = NULL;

    INSERT INTO private.access_events (actor_type, actor_id, event_type, metadata)
    VALUES (
      'system',
      p_user_id,
      'entitlement_activated',
      jsonb_build_object(
        'release_id', p_release_id,
        'eligible_sources_count', v_eligible_count
      )
    );

    v_result_state := 'active';
  ELSE
    -- If no eligible source remains, revoke if present
    UPDATE public.access_entitlements
    SET state = 'revoked',
        revoked_at = now()
    WHERE user_id = p_user_id
      AND release_id = p_release_id
      AND state = 'active';

    IF FOUND THEN
      INSERT INTO private.access_events (actor_type, actor_id, event_type, metadata)
      VALUES (
        'system',
        p_user_id,
        'entitlement_revoked',
        jsonb_build_object(
          'release_id', p_release_id,
          'reason', 'no_eligible_sources'
        )
      );
    END IF;

    v_result_state := 'revoked';
  END IF;

  RETURN v_result_state;
END;
$$;

-- Server domain procedure to record verified payment and grant access
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
BEGIN
  -- 1. Fetch order
  SELECT * INTO v_order
  FROM private.purchase_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- 2. Insert or get provider payment
  INSERT INTO private.provider_payments (
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
    p_currency,
    p_paid_at,
    now()
  )
  ON CONFLICT (provider_account_id, provider_mode, payment_intent_id)
  DO UPDATE SET
    verified_at = now(),
    status = EXCLUDED.status
  RETURNING id INTO v_payment_id;

  -- 3. Upsert access source
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

    -- 4. Project entitlement
    v_entitlement_state := private.project_user_entitlement(v_order.user_id, v_order.release_id);
  END IF;

  -- 5. Close order attempt
  UPDATE private.purchase_orders
  SET attempt_state = 'closed',
      updated_at = now()
  WHERE id = p_order_id;

  -- 6. Enqueue outbox notification
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
      'currency', p_currency,
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

-- Server domain procedure to record verified refund and recompute access
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
  SELECT * INTO v_order FROM private.purchase_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  SELECT * INTO v_payment FROM private.provider_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
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
    p_currency,
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

-- ============================================================================
-- 8. Explicit Permissions and Revocations
-- ============================================================================
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA private TO service_role, postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA private TO service_role, postgres;
