-- Tracking plan PR 1: live Instagram campaign codes are stored, and an order remembers the visit that started it
-- (migrations 20261014220000_instagram_campaigns_and_purchase_identity.sql and 20261015090000_tracking_purchase_link.sql).
BEGIN;
SELECT plan(30);

-- T01-T05: one list of campaign codes for the order check and the measurement function.
SELECT ok(private.is_registered_campaign_code('bio_link'), 'T01: bio_link is registered');
SELECT ok(private.is_registered_campaign_code('story_link'), 'T02: story_link is registered');
SELECT ok(private.is_registered_campaign_code('instagram_dm'), 'T03: instagram_dm is registered');
SELECT ok(private.is_registered_campaign_code('comment_dm'), 'T04: comment_dm is registered');
SELECT ok(NOT private.is_registered_campaign_code('dm'), 'T05: an unknown code is not registered');

-- T22: every code the 20261014220000 literal check accepted is still accepted, so no existing order fails it.
SELECT is(
  (SELECT count(*)::int FROM unnest(ARRAY[
     'toddler_recipes_launch', 'sample_reel_001', 'sample_reel_002', 'sample_reel_003', 'stories_launch', 'feed_post_001'
   ]) AS code WHERE private.is_registered_campaign_code(code)),
  6,
  'T22: the six launch codes stay registered for older orders'
);

-- T23: the three signatures exist side by side, all with TEXT visitor ids.
SELECT ok(
  to_regprocedure('private.record_checkout_measurement(uuid, text, boolean, text)') IS NOT NULL
  AND to_regprocedure('private.record_checkout_measurement(uuid, text, boolean, text, text, text)') IS NOT NULL
  AND to_regprocedure('private.record_checkout_measurement(uuid, text, boolean, text, text, text, text, text, text)') IS NOT NULL
  AND to_regprocedure('private.record_checkout_measurement(uuid, text, boolean, text, uuid, uuid, text, text, text)') IS NULL,
  'T23: the 4-, 6- and 9-argument signatures exist, and no UUID-typed variant'
);

INSERT INTO private.purchase_orders (
  support_reference, owner_principal, user_id, offer_id, release_id, snapshot, attempt_state, idempotency_key
) VALUES
  ('MCH-TRK1', '00000000-0000-0000-0000-000000000011', NULL,
   'f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '{}'::jsonb, 'closed', 'trk-idem-a'),
  ('MCH-TRK2', '00000000-0000-0000-0000-000000000012', NULL,
   'f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '{}'::jsonb, 'closed', 'trk-idem-b'),
  ('MCH-TRK3', '00000000-0000-0000-0000-000000000013', NULL,
   'f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '{}'::jsonb, 'closed', 'trk-idem-c');

UPDATE private.analytics_settings SET optional_export_enabled = true WHERE singleton = true;

SELECT lives_ok(
  $$SELECT private.record_checkout_measurement(
    (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-a'),
    'comment_dm', true, 'test',
    '01990000-0000-7000-8000-000000000001', '01990000-0000-7000-8000-000000000002',
    'buy_box', 'halloween', 'oct16_ghost'
  )$$,
  'T06: the nine-argument signature records a checkout'
);

SELECT results_eq(
  $$SELECT campaign_code, campaign_content, checkout_surface, entry_story,
           analytics_distinct_id, analytics_session_id
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
  $$SELECT campaign_code, campaign_content, checkout_surface, analytics_distinct_id
    FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-a'$$,
  $$VALUES ('story_link', NULL::text, 'buy_box', '01990000-0000-7000-8000-000000000001')$$,
  'T10: the four-argument call stores story_link and keeps the stored button and visitor'
);

-- Malformed values are dropped, never raised: analytics must not block a purchase.
SELECT lives_ok(
  $$SELECT private.record_checkout_measurement(
    (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-b'),
    'not_a_campaign', true, 'test', 'parent@example.com', 'not-a-session', 'sticky_bar', 'Bad Story!', 'oct16_ghost'
  )$$,
  'T11: malformed visit details do not stop the checkout'
);

SELECT results_eq(
  $$SELECT campaign_code, campaign_content, checkout_surface, entry_story, analytics_distinct_id, analytics_session_id
    FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-b'$$,
  $$VALUES (NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text)$$,
  'T12: an unknown campaign, its post label, an email, a bad session, a non-checkout button and a bad slug are not stored'
);

-- The 20261014220000 six-argument signature forwards to the nine-argument one.
SELECT lives_ok(
  $$SELECT private.record_checkout_measurement(
    (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-c'),
    'instagram_dm', true, 'test',
    '01990000-0000-7000-8000-000000000003', '01990000-0000-7000-8000-000000000004'
  )$$,
  'T24: the six-argument signature still works'
);

SELECT results_eq(
  $$SELECT campaign_code, analytics_distinct_id, analytics_session_id, checkout_surface, entry_story
    FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-c'$$,
  $$VALUES ('instagram_dm', '01990000-0000-7000-8000-000000000003', '01990000-0000-7000-8000-000000000004',
            NULL::text, NULL::text)$$,
  'T25: the six-argument call stores the campaign and visitor, and no button or landing page'
);

SELECT is(
  (SELECT count(*)::int FROM private.commerce_outbox
   WHERE order_id = (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-a')
     AND event_kind = 'checkout_created'),
  1,
  'T26: a second tap on the same order queues no second checkout_created'
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

SELECT throws_ok(
  $$UPDATE private.purchase_orders SET analytics_distinct_id = 'parent@example.com' WHERE idempotency_key = 'trk-idem-b'$$,
  '23514',
  NULL,
  'T27: the order refuses a visitor id that is not a UUID'
);

SELECT throws_ok(
  $$UPDATE private.purchase_orders SET entry_story = 'https://example.com/x' WHERE idempotency_key = 'trk-idem-b'$$,
  '23514',
  NULL,
  'T28: the order refuses a landing page that is not a slug'
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
           payload->>'entry_story', payload->>'$session_id', (payload->>'paid_minor')::int
    FROM private.analytics_exports
    WHERE event_name = 'purchase_confirmed'
      AND order_id = (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-a')$$,
  $$VALUES ('story_link', 'buy_box', 'comfort-haven-collection', 'halloween',
            '01990000-0000-7000-8000-000000000002', 599)$$,
  'T16: the purchase_confirmed export carries the campaign, button, book, landing page and session'
);

SELECT ok(
  NOT ((SELECT payload FROM private.analytics_exports
        WHERE event_name = 'purchase_confirmed'
          AND order_id = (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-a')) ? 'campaign_content'),
  'T17: absent values are left out of the payload, not sent as null'
);

-- An order with no visit details exports without any of the new keys.
INSERT INTO private.commerce_outbox (idempotency_key, order_id, event_kind, payload)
VALUES (
  'trk-purchase-b',
  (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-b'),
  'purchase_confirmed',
  '{"currency": "usd", "amount": 599, "environment": "test"}'::jsonb
);

SELECT ok(
  NOT ((SELECT payload FROM private.analytics_exports
        WHERE event_name = 'purchase_confirmed'
          AND order_id = (SELECT id FROM private.purchase_orders WHERE idempotency_key = 'trk-idem-b'))
       ?| ARRAY['$session_id', 'checkout_surface', 'entry_story', 'campaign_content']),
  'T29: an order without visit details exports none of the visit keys'
);

-- service_role may write orders, so it must pass the campaign check.
SET LOCAL ROLE service_role;
SELECT lives_ok(
  $$UPDATE private.purchase_orders SET campaign_code = 'comment_dm' WHERE idempotency_key = 'trk-idem-b'$$,
  'T21: service_role can write an order with a registered campaign'
);
RESET ROLE;

-- Client roles cannot call the functions. Checked on the function privilege itself, so the test does not pass
-- just because those roles cannot see the private schema.
SELECT is(
  (SELECT count(*)::int
   FROM unnest(ARRAY['public', 'anon']) AS r(role_name),
        unnest(ARRAY[
          'private.record_checkout_measurement(uuid, text, boolean, text)',
          'private.record_checkout_measurement(uuid, text, boolean, text, text, text)',
          'private.record_checkout_measurement(uuid, text, boolean, text, text, text, text, text, text)',
          'private.is_registered_campaign_code(text)',
          'private.capture_optional_analytics()'
        ]) AS f(signature)
   WHERE has_function_privilege(r.role_name, f.signature, 'EXECUTE')),
  0,
  'T18: PUBLIC and anon cannot execute any of the five functions'
);

SELECT is(
  (SELECT count(*)::int
   FROM unnest(ARRAY[
          'private.record_checkout_measurement(uuid, text, boolean, text)',
          'private.record_checkout_measurement(uuid, text, boolean, text, text, text)',
          'private.record_checkout_measurement(uuid, text, boolean, text, text, text, text, text, text)',
          'private.is_registered_campaign_code(text)',
          'private.capture_optional_analytics()'
        ]) AS f(signature)
   WHERE has_function_privilege('authenticated', f.signature, 'EXECUTE')),
  0,
  'T19: signed-in callers cannot execute any of the five functions'
);

SELECT ok(
  has_function_privilege('service_role', 'private.is_registered_campaign_code(text)', 'EXECUTE'),
  'T20: service_role can execute the campaign list function the order check calls'
);

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT private.record_checkout_measurement(gen_random_uuid(), 'comment_dm', true, 'test', NULL, NULL)$$,
  '42501',
  NULL,
  'T30: a signed-in caller is refused at run time'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
