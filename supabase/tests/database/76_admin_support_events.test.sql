BEGIN;
SELECT plan(24);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

CREATE FUNCTION pg_temp.event(p_id text, p_order uuid, p_mode text DEFAULT 'test') RETURNS uuid LANGUAGE sql AS $$
 INSERT INTO private.payment_events(event_id, provider_account_id, provider_mode, api_version, event_type, object_id, payload_hash, order_id)
 VALUES (p_id, 'acct_support_test', p_mode, '2025-02-24.acacia', 'refund.updated', 're_support_1', repeat('d', 64), p_order)
 RETURNING id
$$;
CREATE FUNCTION pg_temp.outcome(p_outcome text, p_code text DEFAULT NULL) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('outcome', p_outcome, 'code', p_code, 'orderId', 'f3000000-0000-4000-8000-000000000001', 'reconciliation', NULL)
$$;
CREATE FUNCTION pg_temp.candidates(p_mode text DEFAULT 'test') RETURNS jsonb LANGUAGE sql AS $$
 SELECT private.commerce_recovery_candidates(p_mode, 10)
$$;
SELECT private.commerce_verifier_register(session_user::text, 'Test verifier', '92000000-0000-0000-0000-000000000001');
CREATE TEMP TABLE e AS SELECT pg_temp.event('evt_support_1', 'f3000000-0000-4000-8000-000000000001') id;

-- Only the verifier group processes events.
SELECT is(has_function_privilege('authenticated', 'private.commerce_event_claim(uuid)', 'EXECUTE'), false,
  'browsers cannot claim webhook events');
SELECT is(has_function_privilege('mch_commerce_verifier', 'private.commerce_event_finish(uuid,bigint,jsonb)', 'EXECUTE'), true,
  'the verifier group records outcomes');

-- One inbox row per account, mode and event id.
SELECT throws_ok($$SELECT pg_temp.event('evt_support_1', NULL)$$, '23505', NULL, 'a repeated delivery is the same inbox row');
SELECT lives_ok($$SELECT pg_temp.event('evt_support_1', NULL, 'live')$$, 'the same id in live mode is a different event');

-- Claims are fenced and leased.
CREATE TEMP TABLE c1 AS SELECT private.commerce_event_claim((SELECT id FROM e)) c;
SELECT is((SELECT c->>'state' FROM c1), 'claimed', 'a pending event is claimed');
SELECT is((SELECT c->>'orderId' FROM c1), 'f3000000-0000-4000-8000-000000000001', 'with the order it concerns');
SELECT throws_ok(format('SELECT private.commerce_event_claim(%L)', (SELECT id FROM e)), 'PT409', 'ADM_CONFLICT',
  'a live claim cannot be taken twice');
SELECT throws_ok(format('SELECT private.commerce_event_finish(%L, %s, %L)', (SELECT id FROM e), (SELECT (c->>'fence')::bigint - 1 FROM c1),
  pg_temp.outcome('completed')), 'PT409', 'ADM_STALE', 'a wrong fence cannot record the outcome');
SELECT throws_ok(format('SELECT private.commerce_event_finish(%L, %s, %L)', (SELECT id FROM e), (SELECT c->>'fence' FROM c1),
  '{"outcome":"completed"}'), '22023', 'ADM_INVALID', 'an outcome must have exactly its fields');

-- A retryable failure backs off and is not due until then.
SELECT private.commerce_event_finish((SELECT id FROM e), (SELECT (c->>'fence')::bigint FROM c1), pg_temp.outcome('retry', 'READ_FAILED'));
SELECT ok((SELECT processing_state = 'failed' AND failure_code = 'READ_FAILED' AND next_attempt_at > now() + interval '50 seconds'
  AND next_attempt_at < now() + interval '70 seconds' FROM private.payment_events WHERE id = (SELECT id FROM e)),
  'a retryable failure waits a minute');
SELECT is((SELECT pg_temp.candidates()->'events'), '[]'::jsonb, 'and is not offered to recovery before then');
UPDATE private.payment_events SET next_attempt_at = now() - interval '1 second' WHERE id = (SELECT id FROM e);
SELECT is((SELECT pg_temp.candidates()->'events'->>0), (SELECT id::text FROM e), 'once due, recovery offers it');
SELECT is((SELECT pg_temp.candidates('live')->'events'), '[]'::jsonb, 'recovery is per mode');

-- A new claim gets a higher fence; completion stores the receipt and a repeat returns it.
CREATE TEMP TABLE c2 AS SELECT private.commerce_event_claim((SELECT id FROM e)) c;
SELECT ok((SELECT (c->>'fence')::bigint FROM c2) > (SELECT (c->>'fence')::bigint FROM c1), 'a later claim has a higher fence');
SELECT private.commerce_event_finish((SELECT id FROM e), (SELECT (c->>'fence')::bigint FROM c2), pg_temp.outcome('completed'));
SELECT is((SELECT processing_state FROM private.payment_events WHERE id = (SELECT id FROM e)), 'completed', 'the event completes');
SELECT is(private.commerce_event_claim((SELECT id FROM e)), jsonb_build_object('state', 'done', 'processingState', 'completed',
  'receipt', pg_temp.outcome('completed')), 'a completed event returns its outcome instead of running again');

-- A crashed claim is retried after its lease; blocked events and exhausted retries are set aside.
CREATE TEMP TABLE e2 AS SELECT pg_temp.event('evt_support_2', 'f3000000-0000-4000-8000-000000000001') id;
SELECT private.commerce_event_claim((SELECT id FROM e2));
UPDATE private.payment_events SET lease_expires_at = now() - interval '1 second' WHERE id = (SELECT id FROM e2);
SELECT ok(pg_temp.candidates()->'events' ? (SELECT id::text FROM e2), 'a claim whose lease ran out is offered again');
CREATE TEMP TABLE c3 AS SELECT private.commerce_event_claim((SELECT id FROM e2)) c;
SELECT private.commerce_event_finish((SELECT id FROM e2), (SELECT (c->>'fence')::bigint FROM c3), pg_temp.outcome('blocked', 'ORDER_UNKNOWN'));
SELECT is((SELECT processing_state FROM private.payment_events WHERE id = (SELECT id FROM e2)), 'dead_letter',
  'an event that needs a person is set aside');
CREATE TEMP TABLE e3 AS SELECT pg_temp.event('evt_support_3', 'f3000000-0000-4000-8000-000000000001') id;
UPDATE private.payment_events SET retry_count = 10, processing_state = 'failed' WHERE id = (SELECT id FROM e3);
SELECT is(private.commerce_event_claim((SELECT id FROM e3))->>'processingState', 'dead_letter', 'ten failed attempts set an event aside');

-- Events without an order are counted, never processed; stale unresolved orders are listed.
SELECT pg_temp.event('evt_support_4', NULL);
SELECT is((pg_temp.candidates()->>'unboundEvents')::int, 1, 'events without an order are only counted');
UPDATE private.purchase_orders SET updated_at = now() - interval '1 hour' WHERE id = 'f3000000-0000-4000-8000-000000000011';
SELECT is(pg_temp.candidates()->'orders', '["f3000000-0000-4000-8000-000000000011"]'::jsonb, 'an order left open is listed for recovery');
SELECT throws_ok($$SELECT private.commerce_recovery_candidates('test', 101)$$, '22023', 'ADM_INVALID', 'recovery is bounded to 100');

-- Automated judgement needs an approved policy for the order's versions.
SELECT is(private.commerce_order_policy_ready('f3000000-0000-4000-8000-000000000001'), false, 'no approved policy, no automated judgement');

SELECT private.commerce_verifier_revoke(session_user::text);
SELECT throws_ok(format('SELECT private.commerce_event_claim(%L)', (SELECT id FROM e2)), '42501', 'ADM_DENIED',
  'a revoked verifier cannot claim events');

SELECT * FROM finish();
ROLLBACK;
