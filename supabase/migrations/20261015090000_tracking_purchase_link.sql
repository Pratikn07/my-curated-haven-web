-- Tracking plan PR 1 (docs/implementation/tracking/PLAN.md, "Purchase linked to the visitor"), on top of
-- 20261014220000_instagram_campaigns_and_purchase_identity.sql, which is applied in production and already added
-- analytics_distinct_id / analytics_session_id (TEXT, UUID-checked), the four live campaign codes and the
-- six-argument record_checkout_measurement.
--
-- 1. One function owns the campaign list, used by the order check and by the measurement function.
-- 2. An order also remembers which Buy button started it (checkout surface), the post it came from (utm_content)
--    and the Instagram landing page the visit began on.
-- 3. A nine-argument record_checkout_measurement records them. The six-argument (20261014220000) and the original
--    four-argument signatures stay and forward to it, so the code live before this change keeps recording
--    checkouts. No defaults anywhere, so every call resolves by its argument count.
-- 4. The checkout_created and purchase_confirmed export payloads carry the campaign, post, button, landing page,
--    book slug and PostHog session. Absent values are left out.
--
-- Additive: new nullable columns, a function, a function-based check that accepts every code the literal check
-- from 20261014220000 accepted, and function replacements with unchanged signatures.

CREATE OR REPLACE FUNCTION private.is_registered_campaign_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = private, pg_temp
AS $$
  -- The first four are the live Instagram placements: keep them in step with ALLOWED_CAMPAIGNS in
  -- my-curated-haven-web/src/lib/analytics/campaigns.ts. The six launch codes stay so older orders stay valid.
  SELECT p_code IN (
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
  );
$$;

REVOKE ALL ON FUNCTION private.is_registered_campaign_code(TEXT) FROM PUBLIC, anon, authenticated;
-- The order check runs with the writer's rights, and service_role may write orders directly.
GRANT EXECUTE ON FUNCTION private.is_registered_campaign_code(TEXT) TO service_role;

ALTER TABLE private.purchase_orders
  ADD COLUMN IF NOT EXISTS checkout_surface TEXT,
  ADD COLUMN IF NOT EXISTS campaign_content TEXT,
  ADD COLUMN IF NOT EXISTS entry_story TEXT;

COMMENT ON COLUMN private.purchase_orders.analytics_distinct_id IS
  'PostHog distinct id of the visitor who started the checkout. Cleared when the account is closed.';
COMMENT ON COLUMN private.purchase_orders.analytics_session_id IS
  'PostHog session id of that visit. Cleared when the account is closed.';
COMMENT ON COLUMN private.purchase_orders.checkout_surface IS
  'The Buy button used: lock_card (locked recipe or plan page) or buy_box (collection page).';
COMMENT ON COLUMN private.purchase_orders.campaign_content IS
  'utm_content of the registered campaign link: which post the visit came from.';
COMMENT ON COLUMN private.purchase_orders.entry_story IS
  'Slug of the Instagram landing page this browser session started on.';

-- Same codes as the literal list from 20261014220000, now read from the one function.
ALTER TABLE private.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_campaign_code_check;
ALTER TABLE private.purchase_orders
  ADD CONSTRAINT purchase_orders_campaign_code_check
  CHECK (campaign_code IS NULL OR private.is_registered_campaign_code(campaign_code));

ALTER TABLE private.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_checkout_surface_check;
ALTER TABLE private.purchase_orders
  ADD CONSTRAINT purchase_orders_checkout_surface_check
  CHECK (checkout_surface IS NULL OR checkout_surface IN ('lock_card', 'buy_box'));

ALTER TABLE private.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_campaign_content_check;
ALTER TABLE private.purchase_orders
  ADD CONSTRAINT purchase_orders_campaign_content_check
  CHECK (campaign_content IS NULL OR campaign_content ~ '^[a-z0-9][a-z0-9_-]{0,39}$');

ALTER TABLE private.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_entry_story_check;
ALTER TABLE private.purchase_orders
  ADD CONSTRAINT purchase_orders_entry_story_check
  CHECK (entry_story IS NULL OR entry_story ~ '^[a-z0-9][a-z0-9-]{0,63}$');

-- The six-argument version from 20261014220000 plus the button, landing page and post.
-- Values that fail a check are dropped, never raised: analytics must not block a purchase.
CREATE OR REPLACE FUNCTION private.record_checkout_measurement(
  p_order_id UUID,
  p_campaign_code TEXT,
  p_analytics_consent BOOLEAN,
  p_environment TEXT,
  p_distinct_id TEXT,
  p_session_id TEXT,
  p_checkout_surface TEXT,
  p_entry_story TEXT,
  p_campaign_content TEXT
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
  v_content TEXT;
  v_distinct TEXT;
  v_session TEXT;
  v_surface TEXT;
  v_story TEXT;
  v_env TEXT;
BEGIN
  IF private.is_registered_campaign_code(p_campaign_code) THEN
    v_campaign := p_campaign_code;
    -- A post label only means something next to its campaign.
    IF p_campaign_content ~ '^[a-z0-9][a-z0-9_-]{0,39}$' THEN
      v_content := p_campaign_content;
    END IF;
  END IF;

  IF p_distinct_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_distinct := p_distinct_id;
  END IF;
  IF p_session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_session := p_session_id;
  END IF;

  IF p_checkout_surface IN ('lock_card', 'buy_box') THEN
    v_surface := p_checkout_surface;
  END IF;

  IF p_entry_story ~ '^[a-z0-9][a-z0-9-]{0,63}$' THEN
    v_story := p_entry_story;
  END IF;

  v_env := COALESCE(NULLIF(p_environment, ''), 'development');
  IF v_env NOT IN ('development', 'staging', 'production', 'test') THEN
    v_env := 'development';
  END IF;

  -- A second tap reuses the open order: the latest campaign (and its post) wins, as before; the visitor, button
  -- and landing page are kept when the new tap has none.
  UPDATE private.purchase_orders
  SET analytics_attempt_ref = COALESCE(analytics_attempt_ref, gen_random_uuid()),
      campaign_code = v_campaign,
      campaign_content = v_content,
      analytics_consent = COALESCE(p_analytics_consent, false),
      analytics_distinct_id = COALESCE(v_distinct, analytics_distinct_id),
      analytics_session_id = COALESCE(v_session, analytics_session_id),
      checkout_surface = COALESCE(v_surface, checkout_surface),
      entry_story = COALESCE(v_story, entry_story),
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

-- The 20261014220000 signature (never called by deployed code), forwarding.
CREATE OR REPLACE FUNCTION private.record_checkout_measurement(
  p_order_id UUID,
  p_campaign_code TEXT,
  p_analytics_consent BOOLEAN,
  p_environment TEXT,
  p_distinct_id TEXT,
  p_session_id TEXT
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
  SELECT private.record_checkout_measurement(
    p_order_id, p_campaign_code, p_analytics_consent, p_environment,
    p_distinct_id, p_session_id, NULL::TEXT, NULL::TEXT, NULL::TEXT
  );
$$;

-- The original signature, used by the web code live before this change, forwarding.
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
    p_order_id, p_campaign_code, p_analytics_consent, p_environment,
    NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT
  );
$$;

-- Same as 20260924010000_phase9_measurement.sql, plus the campaign, post, button, landing page, book slug and
-- PostHog session on checkout_created and purchase_confirmed. Absent values are left out of the payload.
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
  v_slug TEXT;
  v_context JSONB;
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

  SELECT c.slug INTO v_slug
  FROM public.collection_releases r
  JOIN public.recipe_collections c ON c.id = r.collection_id
  WHERE r.id = v_order.release_id;

  v_context := jsonb_strip_nulls(jsonb_build_object(
    'collection_slug', v_slug,
    'campaign_code', v_order.campaign_code,
    'campaign_content', v_order.campaign_content,
    'checkout_surface', v_order.checkout_surface,
    'entry_story', v_order.entry_story,
    '$session_id', v_order.analytics_session_id
  ));

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
      ) || v_context,
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
      ) || v_context,
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

REVOKE ALL ON FUNCTION private.record_checkout_measurement(UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.record_checkout_measurement(UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.record_checkout_measurement(UUID, TEXT, BOOLEAN, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.capture_optional_analytics() FROM PUBLIC, anon, authenticated;
