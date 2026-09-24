-- Phase 9: consent-aware measurement beside the Phase 8 ledger.
-- Optional exports never become purchase truth. Default export switch is off.

ALTER TABLE private.purchase_orders
  ADD COLUMN IF NOT EXISTS analytics_attempt_ref UUID,
  ADD COLUMN IF NOT EXISTS campaign_code TEXT,
  ADD COLUMN IF NOT EXISTS analytics_consent BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE private.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_campaign_code_check;

ALTER TABLE private.purchase_orders
  ADD CONSTRAINT purchase_orders_campaign_code_check
  CHECK (
    campaign_code IS NULL
    OR campaign_code IN (
      'toddler_recipes_launch',
      'sample_reel_001',
      'sample_reel_002',
      'sample_reel_003',
      'stories_launch',
      'bio_link',
      'feed_post_001'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_analytics_attempt
  ON private.purchase_orders (analytics_attempt_ref)
  WHERE analytics_attempt_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS private.analytics_settings (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  optional_export_enabled BOOLEAN NOT NULL DEFAULT false,
  reporting_timezone TEXT NOT NULL DEFAULT 'UTC',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO private.analytics_settings (singleton, optional_export_enabled)
VALUES (true, false)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS private.analytics_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transition_key TEXT NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  environment TEXT NOT NULL,
  order_id UUID REFERENCES private.purchase_orders(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  delivery_state TEXT NOT NULL CHECK (
    delivery_state IN ('pending', 'exported', 'failed', 'suppressed')
  ),
  occurred_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INTEGER NOT NULL DEFAULT 0,
  suppressed_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_analytics_exports_state
  ON private.analytics_exports (delivery_state, ingested_at);

-- Read-only landing zone for a future Instagram aggregate export.
-- The website never writes this table. Empty means the source is unavailable.
CREATE TABLE IF NOT EXISTS private.instagram_aggregate_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_code TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  unit TEXT NOT NULL,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  cumulative_as_of TIMESTAMPTZ,
  source_refreshed_at TIMESTAMPTZ,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT instagram_snapshots_window_or_cumulative CHECK (
    cumulative_as_of IS NOT NULL
    OR (window_start IS NOT NULL AND window_end IS NOT NULL)
  )
);

REVOKE ALL ON TABLE private.analytics_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private.analytics_exports FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private.instagram_aggregate_snapshots FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.preview_amount_summary(
  p_captured INTEGER[],
  p_refunds JSONB
)
RETURNS TABLE (
  paid_orders INTEGER,
  captured_minor BIGINT,
  refunded_minor BIGINT,
  captured_less_refunds BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
  SELECT
    COALESCE(cardinality(p_captured), 0) AS paid_orders,
    COALESCE((SELECT sum(value)::bigint FROM unnest(COALESCE(p_captured, ARRAY[]::integer[])) AS value), 0) AS captured_minor,
    COALESCE((
      SELECT sum((item->>'amount')::bigint)
      FROM jsonb_array_elements(COALESCE(p_refunds, '[]'::jsonb)) AS item
      WHERE item->>'status' = 'succeeded'
    ), 0) AS refunded_minor,
    COALESCE((SELECT sum(value)::bigint FROM unnest(COALESCE(p_captured, ARRAY[]::integer[])) AS value), 0)
      - COALESCE((
          SELECT sum((item->>'amount')::bigint)
          FROM jsonb_array_elements(COALESCE(p_refunds, '[]'::jsonb)) AS item
          WHERE item->>'status' = 'succeeded'
        ), 0) AS captured_less_refunds;
$$;

CREATE OR REPLACE FUNCTION private.founder_commerce_totals(
  p_currency TEXT,
  p_mode TEXT
)
RETURNS TABLE (
  paid_orders BIGINT,
  purchasing_accounts BIGINT,
  captured_minor BIGINT,
  refunded_minor BIGINT,
  captured_less_refunds BIGINT,
  paid_without_access BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
  SELECT
    count(DISTINCT po.id) AS paid_orders,
    count(DISTINCT po.user_id) AS purchasing_accounts,
    COALESCE(sum(pp.captured_amount), 0)::bigint AS captured_minor,
    COALESCE((
      SELECT sum(r.amount)::bigint
      FROM private.payment_refunds r
      JOIN private.provider_payments pp2 ON pp2.id = r.payment_id
      WHERE r.status = 'succeeded'
        AND r.currency = p_currency
        AND pp2.provider_mode = p_mode
        AND pp2.currency = p_currency
        AND pp2.status = 'succeeded'
    ), 0) AS refunded_minor,
    COALESCE(sum(pp.captured_amount), 0)::bigint - COALESCE((
      SELECT sum(r.amount)::bigint
      FROM private.payment_refunds r
      JOIN private.provider_payments pp2 ON pp2.id = r.payment_id
      WHERE r.status = 'succeeded'
        AND r.currency = p_currency
        AND pp2.provider_mode = p_mode
        AND pp2.currency = p_currency
        AND pp2.status = 'succeeded'
    ), 0) AS captured_less_refunds,
    count(DISTINCT po.id) FILTER (
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.access_entitlements ae
        WHERE ae.user_id = po.user_id
          AND ae.release_id = po.release_id
          AND ae.state = 'active'
          AND ae.revoked_at IS NULL
          AND ae.valid_from <= now()
          AND (ae.expires_at IS NULL OR ae.expires_at > now())
      )
    ) AS paid_without_access
  FROM private.provider_payments pp
  JOIN private.purchase_orders po ON po.id = pp.order_id
  WHERE pp.currency = p_currency
    AND pp.provider_mode = p_mode
    AND pp.status = 'succeeded';
$$;

CREATE OR REPLACE FUNCTION private.instagram_source_status()
RETURNS TABLE (
  status TEXT,
  reason TEXT,
  refreshed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
DECLARE
  v_refreshed TIMESTAMPTZ;
BEGIN
  SELECT max(source_refreshed_at) INTO v_refreshed
  FROM private.instagram_aggregate_snapshots;

  IF v_refreshed IS NULL THEN
    RETURN QUERY SELECT 'unavailable'::text, 'credential_missing'::text, NULL::timestamptz;
    RETURN;
  END IF;

  IF v_refreshed < now() - interval '48 hours' THEN
    RETURN QUERY SELECT 'stale'::text, 'refresh_late'::text, v_refreshed;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'available'::text, NULL::text, v_refreshed;
END;
$$;

CREATE OR REPLACE FUNCTION private.capture_optional_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
DECLARE
  v_order private.purchase_orders%ROWTYPE;
  v_enabled BOOLEAN;
  v_state TEXT;
  v_reason TEXT;
  v_env TEXT;
  v_refund_status TEXT;
  v_attempt TEXT;
BEGIN
  IF NEW.event_kind NOT IN (
    'checkout_created',
    'purchase_confirmed',
    'refund_confirmed'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_order
  FROM private.purchase_orders
  WHERE id = NEW.order_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.event_kind = 'refund_confirmed' THEN
    SELECT r.status INTO v_refund_status
    FROM private.payment_refunds r
    WHERE r.provider_refund_id = NEW.payload->>'refund_id'
    ORDER BY r.verified_at DESC
    LIMIT 1;

    IF v_refund_status IS DISTINCT FROM 'succeeded' THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_order.analytics_attempt_ref IS NULL THEN
    UPDATE private.purchase_orders
    SET analytics_attempt_ref = gen_random_uuid(),
        updated_at = now()
    WHERE id = v_order.id
    RETURNING * INTO v_order;
  END IF;

  v_attempt := v_order.analytics_attempt_ref::text;

  SELECT optional_export_enabled INTO v_enabled
  FROM private.analytics_settings
  WHERE singleton = true;

  IF v_order.analytics_consent IS NOT TRUE THEN
    v_state := 'suppressed';
    v_reason := 'consent';
  ELSIF v_enabled IS NOT TRUE THEN
    v_state := 'suppressed';
    v_reason := 'disabled';
  ELSE
    v_state := 'pending';
    v_reason := NULL;
  END IF;

  v_env := COALESCE(
    NULLIF(current_setting('app.analytics_environment', true), ''),
    NULLIF(NEW.payload->>'environment', ''),
    'development'
  );
  IF v_env NOT IN ('development', 'staging', 'production', 'test') THEN
    v_env := 'development';
  END IF;

  IF NEW.event_kind = 'checkout_created' THEN
    INSERT INTO private.analytics_exports (
      transition_key, event_name, environment, order_id, payload,
      delivery_state, occurred_at, suppressed_reason
    ) VALUES (
      v_env || ':checkout_created:' || NEW.order_id::text,
      'checkout_created',
      v_env,
      NEW.order_id,
      jsonb_build_object(
        'collection_release_id', v_order.release_id,
        'attempt_ref', v_attempt
      ),
      v_state,
      COALESCE(NEW.created_at, now()),
      v_reason
    )
    ON CONFLICT (transition_key) DO NOTHING;
  ELSIF NEW.event_kind = 'purchase_confirmed' THEN
    INSERT INTO private.analytics_exports (
      transition_key, event_name, environment, order_id, payload,
      delivery_state, occurred_at, suppressed_reason
    ) VALUES (
      v_env || ':purchase_confirmed:' || NEW.order_id::text,
      'purchase_confirmed',
      v_env,
      NEW.order_id,
      jsonb_build_object(
        'order_ref', v_attempt,
        'collection_release_id', v_order.release_id,
        'currency', NEW.payload->>'currency',
        'paid_minor', NEW.payload->'amount'
      ),
      v_state,
      COALESCE(NEW.created_at, now()),
      v_reason
    )
    ON CONFLICT (transition_key) DO NOTHING;

    IF v_order.user_id IS NOT NULL THEN
      INSERT INTO private.analytics_exports (
        transition_key, event_name, environment, order_id, payload,
        delivery_state, occurred_at, suppressed_reason
      ) VALUES (
        v_env || ':purchase_access_activated:' || NEW.order_id::text,
        'purchase_access_activated',
        v_env,
        NEW.order_id,
        jsonb_build_object(
          'order_ref', v_attempt,
          'collection_release_id', v_order.release_id,
          'activation_delay_bucket', 'under_1m'
        ),
        v_state,
        COALESCE(NEW.created_at, now()),
        v_reason
      )
      ON CONFLICT (transition_key) DO NOTHING;
    END IF;
  ELSIF NEW.event_kind = 'refund_confirmed' THEN
    INSERT INTO private.analytics_exports (
      transition_key, event_name, environment, order_id, payload,
      delivery_state, occurred_at, suppressed_reason
    ) VALUES (
      v_env || ':refund_confirmed:' || COALESCE(NEW.payload->>'refund_id', NEW.id::text),
      'refund_confirmed',
      v_env,
      NEW.order_id,
      jsonb_build_object(
        'refund_ref', gen_random_uuid(),
        'order_ref', v_attempt,
        'currency', NEW.payload->>'currency',
        'refunded_minor', NEW.payload->'amount'
      ),
      v_state,
      COALESCE(NEW.created_at, now()),
      v_reason
    )
    ON CONFLICT (transition_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commerce_outbox_analytics ON private.commerce_outbox;
CREATE TRIGGER trg_commerce_outbox_analytics
  AFTER INSERT ON private.commerce_outbox
  FOR EACH ROW
  EXECUTE FUNCTION private.capture_optional_analytics();

CREATE OR REPLACE FUNCTION private.record_checkout_measurement(
  p_order_id UUID,
  p_campaign_code TEXT,
  p_analytics_consent BOOLEAN,
  p_environment TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
DECLARE
  v_ref UUID;
  v_release UUID;
  v_campaign TEXT;
  v_env TEXT;
BEGIN
  IF p_campaign_code IN (
    'toddler_recipes_launch',
    'sample_reel_001',
    'sample_reel_002',
    'sample_reel_003',
    'stories_launch',
    'bio_link',
    'feed_post_001'
  ) THEN
    v_campaign := p_campaign_code;
  ELSE
    v_campaign := NULL;
  END IF;

  v_env := COALESCE(NULLIF(p_environment, ''), 'development');
  IF v_env NOT IN ('development', 'staging', 'production', 'test') THEN
    v_env := 'development';
  END IF;

  UPDATE private.purchase_orders
  SET analytics_attempt_ref = COALESCE(analytics_attempt_ref, gen_random_uuid()),
      campaign_code = v_campaign,
      analytics_consent = COALESCE(p_analytics_consent, false),
      updated_at = now()
  WHERE id = p_order_id
  RETURNING analytics_attempt_ref, release_id INTO v_ref, v_release;

  IF v_ref IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  INSERT INTO private.commerce_outbox (
    idempotency_key,
    order_id,
    event_kind,
    payload
  ) VALUES (
    'checkout-created-' || p_order_id::text,
    p_order_id,
    'checkout_created',
    jsonb_build_object(
      'collection_release_id', v_release,
      'attempt_ref', v_ref,
      'environment', v_env
    )
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN v_ref;
END;
$$;

CREATE OR REPLACE FUNCTION private.suppress_analytics_attempts(p_refs UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_refs IS NULL OR cardinality(p_refs) = 0 THEN
    RETURN 0;
  END IF;

  IF cardinality(p_refs) > 20 THEN
    RAISE EXCEPTION 'Too many attempt refs';
  END IF;

  UPDATE private.purchase_orders
  SET analytics_consent = false,
      updated_at = now()
  WHERE analytics_attempt_ref = ANY(p_refs);

  UPDATE private.analytics_exports e
  SET delivery_state = 'suppressed',
      suppressed_reason = 'withdrawn'
  FROM private.purchase_orders po
  WHERE e.order_id = po.id
    AND po.analytics_attempt_ref = ANY(p_refs)
    AND e.delivery_state IN ('pending', 'failed');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION private.preview_amount_summary(INTEGER[], JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.founder_commerce_totals(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.instagram_source_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.capture_optional_analytics() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.record_checkout_measurement(UUID, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.suppress_analytics_attempts(UUID[]) FROM PUBLIC, anon, authenticated;
