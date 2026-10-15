-- Instagram campaign codes reach orders, and a purchase can be tied back to the visit that led to it.
--
-- 1. The order allowlist still held the September launch codes, so story_link, instagram_dm and comment_dm
--    (src/lib/analytics/campaigns.ts ALLOWED_CAMPAIGNS) were stored as NULL. The old codes stay valid for old rows.
-- 2. The buyer's PostHog ids (distinct id and session id, both UUIDs) are kept on the order so the server-side
--    purchase export lands on the same visitor and session as their page views.
--
-- Additive and backward compatible: the four-argument record_checkout_measurement keeps working for code that
-- predates this migration, so this can be applied before the web deploy.

ALTER TABLE private.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_campaign_code_check;

ALTER TABLE private.purchase_orders
  ADD CONSTRAINT purchase_orders_campaign_code_check
  CHECK (
    campaign_code IS NULL
    OR campaign_code IN (
      'bio_link',
      'story_link',
      'instagram_dm',
      'comment_dm',
      'toddler_recipes_launch',
      'sample_reel_001',
      'sample_reel_002',
      'sample_reel_003',
      'stories_launch',
      'feed_post_001'
    )
  );

ALTER TABLE private.purchase_orders
  ADD COLUMN IF NOT EXISTS analytics_distinct_id TEXT,
  ADD COLUMN IF NOT EXISTS analytics_session_id TEXT;

ALTER TABLE private.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_analytics_distinct_id_check,
  DROP CONSTRAINT IF EXISTS purchase_orders_analytics_session_id_check;

ALTER TABLE private.purchase_orders
  ADD CONSTRAINT purchase_orders_analytics_distinct_id_check CHECK (
    analytics_distinct_id IS NULL
    OR analytics_distinct_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  ADD CONSTRAINT purchase_orders_analytics_session_id_check CHECK (
    analytics_session_id IS NULL
    OR analytics_session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

CREATE OR REPLACE FUNCTION private.record_checkout_measurement(
  p_order_id UUID,
  p_campaign_code TEXT,
  p_analytics_consent BOOLEAN,
  p_environment TEXT,
  p_distinct_id TEXT,
  p_session_id TEXT
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
  v_distinct TEXT;
  v_session TEXT;
BEGIN
  -- The live Instagram placements; anything else is kept off the order.
  IF p_campaign_code IN ('bio_link', 'story_link', 'instagram_dm', 'comment_dm') THEN
    v_campaign := p_campaign_code;
  ELSE
    v_campaign := NULL;
  END IF;

  IF p_distinct_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_distinct := p_distinct_id;
  END IF;
  IF p_session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_session := p_session_id;
  END IF;

  v_env := COALESCE(NULLIF(p_environment, ''), 'development');
  IF v_env NOT IN ('development', 'staging', 'production', 'test') THEN
    v_env := 'development';
  END IF;

  -- A second tap reuses the open order; a tap without ids keeps the ones already stored.
  UPDATE private.purchase_orders
  SET analytics_attempt_ref = COALESCE(analytics_attempt_ref, gen_random_uuid()),
      campaign_code = v_campaign,
      analytics_consent = COALESCE(p_analytics_consent, false),
      analytics_distinct_id = COALESCE(v_distinct, analytics_distinct_id),
      analytics_session_id = COALESCE(v_session, analytics_session_id),
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

-- The original signature, for a web build deployed before this migration.
CREATE OR REPLACE FUNCTION private.record_checkout_measurement(
  p_order_id UUID,
  p_campaign_code TEXT,
  p_analytics_consent BOOLEAN,
  p_environment TEXT
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
  SELECT private.record_checkout_measurement(
    p_order_id, p_campaign_code, p_analytics_consent, p_environment, NULL, NULL
  );
$$;

REVOKE ALL ON FUNCTION private.record_checkout_measurement(UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.record_checkout_measurement(UUID, TEXT, BOOLEAN, TEXT)
  FROM PUBLIC, anon, authenticated;
