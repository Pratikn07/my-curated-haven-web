-- Tracking plan PR 1: live Instagram campaign codes are stored, and an order remembers the visit that started it
-- (migration 20261015090000_tracking_purchase_link.sql).
BEGIN;
SELECT plan(21);

-- T01-T05: one list of campaign codes for the order check and the measurement function.
SELECT ok(private.is_registered_campaign_code('bio_link'), 'T01: bio_link is registered');
SELECT ok(private.is_registered_campaign_code('story_link'), 'T02: story_link is registered');
SELECT ok(private.is_registered_campaign_code('instagram_dm'), 'T03: instagram_dm is registered');
SELECT ok(private.is_registered_campaign_code('comment_dm'), 'T04: comment_dm is registered');
SELECT ok(NOT private.is_registered_campaign_code('dm'), 'T05: an unknown code is not registered');

INSERT INTO private.purchase_orders (
  support_reference, owner_principal, user_id, offer_id, release_id, snapshot, attempt_state, idempotency_key
) VALUES
  ('MCH-TRK1', '00000000-0000-0000-0000-000000000011', NULL,
   'f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '{}'::jsonb, 'closed', 'trk-idem-a'),
  ('MCH-TRK2', '00000000-0000-0000-0000-000000000012', NULL,
   'f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '{}'::jsonb, 'closed', 'trk-idem-b');

UPDATE private.analytics_settings SET optional_export_enabled = true WHERE singleton = true;

SELECT lives_ok(
  $$SELECT private.record_checkout_measurement(
    (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-a'),
    'comment_dm', true, 'test',
    '01990000-0000-7000-8000-000000000001'::uuid, '01990000-0000-7000-8000-000000000002'::uuid,
    'buy_box', 'halloween', 'oct16_ghost'
  )$$,
  'T06: the new signature records a checkout'
);

SELECT results_eq(
  $$SELECT campaign_code, campaign_content, checkout_surface, entry_story,
           analytics_distinct_id::text, analytics_session_id::text
    FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-a'$$,
  $$VALUES ('comment_dm', 'oct16_ghost', 'buy_box', 'halloween',
            '01990000-0000-7000-8000-000000000001', '01990000-0000-7000-8000-000000000002')$$,
  'T07: campaign, post, button, landing page and PostHog visit are stored on the order'
);

SELECT results_eq(
  $$SELECT payload->>'campaign_code', payload->>'campaign_content', payload->>'checkout_surface',
           payload->>'entry_story', payload->>'collection_slug', payload->>'$session_id', delivery_state
    FROM private.analytics_exports
    WHERE event_name = 'checkout_created'
      AND order_id = (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-a')$$,
  $$VALUES ('comment_dm', 'oct16_ghost', 'buy_box', 'halloween', 'comfort-haven-collection',
            '01990000-0000-7000-8000-000000000002', 'pending')$$,
  'T08: the checkout_created export carries the campaign, button, landing page, book and session'
);

-- A second tap without visit details keeps what the first one stored; the campaign follows the latest tap.
SELECT lives_ok(
  $$SELECT private.record_checkout_measurement(
    (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-a'),
    'story_link', true, 'test'
  )$$,
  'T09: the original four-argument signature still works'
);

SELECT results_eq(
  $$SELECT campaign_code, campaign_content, checkout_surface, analytics_distinct_id::text
    FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-a'$$,
  $$VALUES ('story_link', NULL::text, 'buy_box', '01990000-0000-7000-8000-000000000001')$$,
  'T10: the four-argument call stores story_link and keeps the stored button and visitor'
);

-- Malformed values are dropped, never raised: analytics must not block a purchase.
SELECT lives_ok(
  $$SELECT private.record_checkout_measurement(
    (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-b'),
    'not_a_campaign', true, 'test', NULL, NULL, 'sticky_bar', 'Bad Story!', 'oct16_ghost'
  )$$,
  'T11: malformed visit details do not stop the checkout'
);

SELECT results_eq(
  $$SELECT campaign_code, campaign_content, checkout_surface, entry_story
    FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-b'$$,
  $$VALUES (NULL::text, NULL::text, NULL::text, NULL::text)$$,
  'T12: an unknown campaign, its post label, a non-checkout button and a bad slug are not stored'
);

SELECT throws_ok(
  $$UPDATE private.purchase_orders SET checkout_surface = 'sticky_bar' WHERE idempotency_key = 'trk-idem-b'$$,
  '23514',
  NULL,
  'T13: the order refuses a checkout surface other than lock_card or buy_box'
);

SELECT throws_ok(
  $$UPDATE private.purchase_orders SET campaign_code = 'dm' WHERE idempotency_key = 'trk-idem-b'$$,
  '23514',
  NULL,
  'T14: the order refuses an unregistered campaign code'
);

SELECT lives_ok(
  $$UPDATE private.purchase_orders SET campaign_code = 'instagram_dm' WHERE idempotency_key = 'trk-idem-b'$$,
  'T15: the order accepts instagram_dm'
);

-- The purchase export carries the same details.
INSERT INTO private.commerce_outbox (idempotency_key, order_id, event_kind, payload)
VALUES (
  'trk-purchase-a',
  (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-a'),
  'purchase_confirmed',
  '{"currency": "usd", "amount": 599, "environment": "test"}'::jsonb
);

SELECT results_eq(
  $$SELECT payload->>'campaign_code', payload->>'checkout_surface', payload->>'collection_slug',
           (payload->>'paid_minor')::int
    FROM private.analytics_exports
    WHERE event_name = 'purchase_confirmed'
      AND order_id = (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-a')$$,
  $$VALUES ('story_link', 'buy_box', 'comfort-haven-collection', 599)$$,
  'T16: the purchase_confirmed export carries the campaign, button and book'
);

SELECT ok(
  NOT ((SELECT payload FROM private.analytics_exports
        WHERE event_name = 'purchase_confirmed'
          AND order_id = (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-a')) ? 'campaign_content'),
  'T17: absent values are left out of the payload, not sent as null'
);

-- service_role may write orders, so it must pass the campaign check.
SET LOCAL ROLE service_role;
SELECT lives_ok(
  $$UPDATE private.purchase_orders SET campaign_code = 'comment_dm' WHERE idempotency_key = 'trk-idem-b'$$,
  'T21: service_role can write an order with a registered campaign'
);

-- Client roles cannot call the measurement functions.
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT private.record_checkout_measurement(gen_random_uuid(), 'comment_dm', true, 'test', NULL, NULL, NULL, NULL, NULL)$$,
  '42501',
  NULL,
  'T18: anonymous callers cannot record a checkout'
);

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT private.record_checkout_measurement(gen_random_uuid(), 'comment_dm', true, 'test')$$,
  '42501',
  NULL,
  'T19: signed-in callers cannot use the old signature either'
);

SELECT throws_ok(
  $$SELECT private.is_registered_campaign_code('comment_dm')$$,
  '42501',
  NULL,
  'T20: signed-in callers cannot read the campaign list function'
);

SELECT * FROM finish();
ROLLBACK;
