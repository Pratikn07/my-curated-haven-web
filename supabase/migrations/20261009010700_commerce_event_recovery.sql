-- Phase 3: fenced webhook inbox processing and bounded recovery.
--
-- Signature-verified Stripe events are stored once per (account, mode, event id) with the order they concern. A
-- registered verifier login claims an event with a 60-second lease and a new fence, re-reads the current Stripe
-- objects, applies them through the shared reconciliation writer and records the outcome only while its claim still
-- holds. Retryable failures back off (1, 2, 4 ... 60 minutes); after 10 attempts an event is set aside. Recovery
-- lists due events and stale unresolved orders, bounded and per mode; it never scans Stripe.

ALTER TABLE private.payment_events
 ADD COLUMN order_id uuid REFERENCES private.purchase_orders(id) ON DELETE SET NULL,
 ADD COLUMN fence bigint NOT NULL DEFAULT 0,
 ADD COLUMN receipt jsonb,
 ADD COLUMN next_attempt_at timestamptz;
CREATE SEQUENCE private.commerce_event_fence;
CREATE INDEX payment_events_due ON private.payment_events(provider_mode, processing_state, next_attempt_at);
CREATE INDEX payment_events_order ON private.payment_events(order_id);

CREATE FUNCTION private.commerce_event_claim(p_event_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); v_event private.payment_events;
BEGIN
 PERFORM set_config('lock_timeout', '5000', true);
 SELECT * INTO v_event FROM private.payment_events WHERE id = p_event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF v_event.processing_state IN ('completed','ignored','dead_letter') THEN
  RETURN jsonb_build_object('state', 'done', 'processingState', v_event.processing_state, 'receipt', v_event.receipt);
 END IF;
 IF v_event.processing_state = 'processing' AND v_event.lease_expires_at > clock_timestamp() THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 IF v_event.retry_count >= 10 THEN
  UPDATE private.payment_events SET processing_state = 'dead_letter', failure_code = 'RETRIES_EXHAUSTED', lease_token = NULL,
   lease_expires_at = NULL, processed_at = now() WHERE id = p_event_id;
  RETURN jsonb_build_object('state', 'done', 'processingState', 'dead_letter', 'receipt', v_event.receipt);
 END IF;
 UPDATE private.payment_events SET processing_state = 'processing', lease_token = gen_random_uuid(),
  lease_expires_at = clock_timestamp() + interval '60 seconds', fence = nextval('private.commerce_event_fence'),
  retry_count = retry_count + 1
 WHERE id = p_event_id RETURNING * INTO v_event;
 RETURN jsonb_build_object('state', 'claimed', 'fence', v_event.fence, 'eventId', v_event.event_id, 'type', v_event.event_type,
  'accountId', v_event.provider_account_id, 'mode', v_event.provider_mode, 'apiVersion', v_event.api_version,
  'objectId', v_event.object_id, 'orderId', v_event.order_id);
END $$;

-- Outcome: {outcome 'completed'|'ignored'|'blocked'|'retry', code, orderId, reconciliation}. Blocked events (unknown
-- order, evidence that needs a person) are set aside, not retried.
CREATE FUNCTION private.commerce_event_finish(p_event_id uuid, p_fence bigint, p_outcome jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); v_event private.payment_events; v_state text;
BEGIN
 PERFORM set_config('lock_timeout', '5000', true);
 IF p_outcome IS NULL OR jsonb_typeof(p_outcome) <> 'object'
   OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p_outcome) k) <> ARRAY['code','orderId','outcome','reconciliation']
   OR p_outcome->>'outcome' NOT IN ('completed','ignored','blocked','retry')
   OR (p_outcome->'code' <> 'null' AND (p_outcome->>'code') !~ '^[A-Za-z][A-Za-z0-9_]{1,63}$')
   OR (p_outcome->'orderId' <> 'null' AND (p_outcome->>'orderId') !~ '^[0-9a-f-]{36}$') THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 SELECT * INTO v_event FROM private.payment_events WHERE id = p_event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF v_event.processing_state <> 'processing' OR v_event.fence <> p_fence OR v_event.lease_expires_at <= clock_timestamp() THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 v_state := CASE p_outcome->>'outcome' WHEN 'completed' THEN 'completed' WHEN 'ignored' THEN 'ignored' WHEN 'blocked' THEN 'dead_letter'
  ELSE 'failed' END;
 UPDATE private.payment_events SET processing_state = v_state, failure_code = p_outcome->>'code', receipt = p_outcome,
  order_id = coalesce(order_id, (p_outcome->>'orderId')::uuid), lease_token = NULL, lease_expires_at = NULL,
  processed_at = CASE WHEN v_state = 'failed' THEN NULL ELSE now() END,
  next_attempt_at = CASE WHEN v_state = 'failed'
   THEN clock_timestamp() + least(interval '60 minutes', interval '1 minute' * power(2, greatest(v_event.retry_count - 1, 0))) END
 WHERE id = p_event_id;
 RETURN jsonb_build_object('processingState', v_state);
END $$;

-- What recovery may look at for one mode: due events and orders left unresolved for 15 minutes, oldest first.
CREATE FUNCTION private.commerce_recovery_candidates(p_mode text, p_limit integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier();
BEGIN
 IF p_mode IS NULL OR p_mode NOT IN ('test','live') OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 RETURN jsonb_build_object(
  'events', (SELECT coalesce(jsonb_agg(id ORDER BY received_at, id), '[]') FROM (SELECT id, received_at FROM private.payment_events
    WHERE provider_mode = p_mode AND order_id IS NOT NULL AND (
     (processing_state IN ('pending','failed') AND coalesce(next_attempt_at, received_at) <= now())
     OR (processing_state = 'processing' AND lease_expires_at <= now()))
    ORDER BY received_at, id LIMIT p_limit) e),
  'unboundEvents', (SELECT count(*) FROM private.payment_events WHERE provider_mode = p_mode AND order_id IS NULL
    AND processing_state IN ('pending','failed','processing')),
  'orders', (SELECT coalesce(jsonb_agg(id ORDER BY created_at, id), '[]') FROM (SELECT id, created_at FROM private.purchase_orders
    WHERE snapshot->>'provider_mode' = p_mode AND attempt_state IN ('open','processing','review') AND session_id IS NOT NULL
      AND updated_at < now() - interval '15 minutes'
    ORDER BY created_at, id LIMIT p_limit) o));
END $$;

-- Whether automated reconciliation may judge this order: an approved policy exists for its frozen versions.
CREATE FUNCTION private.commerce_order_policy_ready(p_order_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); v_binding jsonb := private.commerce_order_binding(p_order_id);
BEGIN
 RETURN v_binding IS NOT NULL
  AND private.commerce_policy_for(v_binding->>'refundPolicyVersion', v_binding->>'accessPolicyVersion') IS NOT NULL;
END $$;

-- The latest complete observation time for an order, so customer refreshes do not re-read Stripe on every visit.
CREATE FUNCTION private.commerce_last_verified(p_order_id uuid) RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT max(verified_at) FROM private.commerce_provider_observations WHERE order_id = p_order_id AND complete
$$;

REVOKE ALL ON FUNCTION private.commerce_event_claim(uuid), private.commerce_event_finish(uuid,bigint,jsonb),
 private.commerce_recovery_candidates(text,integer), private.commerce_order_policy_ready(uuid), private.commerce_last_verified(uuid)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.commerce_event_claim(uuid), private.commerce_event_finish(uuid,bigint,jsonb),
 private.commerce_recovery_candidates(text,integer), private.commerce_order_policy_ready(uuid), private.commerce_last_verified(uuid)
 TO mch_commerce_verifier;
