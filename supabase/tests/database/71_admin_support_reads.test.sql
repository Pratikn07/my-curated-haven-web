BEGIN;
SELECT plan(46);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

UPDATE private.support_workspace_settings SET stage = 'inspection';
CREATE FUNCTION pg_temp.lookup(p_user uuid, p_query jsonb) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as(p_user, 'aal2', format('SELECT public.admin_support_lookup(%L::jsonb)', p_query))
$$;
CREATE FUNCTION pg_temp.order_read(p_user uuid, p_order uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as(p_user, 'aal2', format('SELECT public.admin_support_order(%L::uuid)', p_order))
$$;
CREATE FUNCTION pg_temp.customer(p_user uuid, p_target uuid, p_cursor text DEFAULT NULL) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as(p_user, 'aal2', format('SELECT public.admin_support_customer(%L::uuid, %L)', p_target, p_cursor))
$$;
-- Support viewer and operator.
CREATE TEMP TABLE staff AS SELECT 'f3000000-0000-4000-8000-0000000000a1'::uuid viewer, 'f3000000-0000-4000-8000-0000000000a2'::uuid operator;
GRANT SELECT ON staff TO authenticated;

-- Email lookup is exact after trimming and lower-casing, like Team lookup; nothing else is rewritten.
SELECT is(pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"email","value":"  First.Last+Buyer@Synthetic.Test "}')#>>'{value,target,userId}',
  'f3000000-0000-4000-8000-000000000002', 'an exact email finds its account');
SELECT is(pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"email","value":"firstlast+buyer@synthetic.test"}')#>>'{value,target,userId}',
  'f3000000-0000-4000-8000-00000000000b', 'dots are not ignored');
SELECT is(pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"email","value":"first.last@synthetic.test"}')#>>'{value,status}',
  'not_found', 'plus addressing is not stripped');
SELECT is(pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"email","value":"%buyer@synthetic.test"}')#>>'{value,status}',
  'not_found', 'a percent sign is not a wildcard');
SELECT is(pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"email","value":"_irst.last+buyer@synthetic.test"}')#>>'{value,status}',
  'not_found', 'an underscore is not a wildcard');
SELECT is(pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"email","value":"ﬁrst.last+buyer@synthetic.test"}')#>>'{value,status}',
  'not_found', 'Unicode look-alikes are not folded together');
SELECT is(pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"email","value":"shared-buyer@synthetic.test"}')#>>'{value,status}',
  'ambiguous', 'one email on two accounts is ambiguous');
SELECT is(pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"email","value":"unconfirmed-buyer@synthetic.test"}')#>>'{value,status}',
  'unconfirmed', 'an unconfirmed account is reported as such');
SELECT is(pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"email","value":"first.last+buyer@synthetic.test"}')->>'complete',
  'true', 'reads come in a timestamped envelope');

-- Support reference, account id and closed accounts.
SELECT is(pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"support_reference","value":"mch-1a2b3c"}')#>>'{value,target,orderId}',
  'f3000000-0000-4000-8000-000000000001', 'a support reference finds its order, in either case');
SELECT is(pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"support_reference","value":"MCH-K9"}')#>>'{value,target,orderId}',
  'f3000000-0000-4000-8000-000000000011', 'the older short reference format still works');
SELECT is(pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"user_id","value":"f3000000-0000-4000-8000-00000000000c"}')->'value',
  '{"status":"found","target":{"userId":null,"orderId":null,"ownerPrincipal":"f3000000-0000-4000-8000-00000000000c"}}'::jsonb,
  'a closed account is found by its order principal, with no account');

-- Provider ids need provider inspection and match only within their account and mode.
SELECT throws_ok($$SELECT pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"provider_id","value":"pi_support","accountId":"acct_support_test","mode":"test"}')$$,
  '42501', 'ADM_DENIED', 'a support viewer cannot search provider ids');
SELECT is(pg_temp.lookup((SELECT operator FROM staff), '{"kind":"provider_id","value":"pi_support","accountId":"acct_support_test","mode":"test"}')#>>'{value,target,orderId}',
  'f3000000-0000-4000-8000-000000000001', 'a test payment id finds the test order');
SELECT is(pg_temp.lookup((SELECT operator FROM staff), '{"kind":"provider_id","value":"pi_support","accountId":"acct_support_live","mode":"live"}')#>>'{value,target,orderId}',
  'f3000000-0000-4000-8000-000000000012', 'the same id in the live account finds only the live order');
SELECT is(pg_temp.lookup((SELECT operator FROM staff), '{"kind":"provider_id","value":"pi_support","accountId":"acct_other","mode":"test"}')#>>'{value,status}',
  'not_found', 'a foreign account finds nothing');
SELECT is(pg_temp.lookup((SELECT operator FROM staff), '{"kind":"provider_id","value":"re_support_1","accountId":"acct_support_test","mode":"test"}')#>>'{value,target,orderId}',
  'f3000000-0000-4000-8000-000000000001', 'a refund id finds its order');
SELECT is(pg_temp.lookup((SELECT operator FROM staff), '{"kind":"provider_id","value":"cs_test_support","accountId":"acct_support_test","mode":"test"}')#>>'{value,target,orderId}',
  'f3000000-0000-4000-8000-000000000001', 'a checkout session id finds its order');

-- Bad input and rate limits.
SELECT throws_ok($$SELECT pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"name","value":"Buyer"}')$$, '22023', 'ADM_INVALID',
  'an unsupported lookup is refused');
SELECT throws_ok($$SELECT pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"email","value":"buyer@synthetic.test","approved_by":"x"}')$$,
  '22023', 'ADM_INVALID', 'extra keys are refused');
SELECT throws_ok(format($$SELECT pg_temp.lookup((SELECT viewer FROM staff), %L::jsonb)$$,
  jsonb_build_object('kind','email','value',repeat('a',320)||'@synthetic.test')), '22023', 'ADM_INVALID', 'emails longer than 320 characters are refused');
INSERT INTO private.support_rate_buckets(actor_id,kind,minute,used)
SELECT 'f3000000-0000-4000-8000-0000000000a1','lookup',date_trunc('minute',clock_timestamp())+m*interval '1 minute',30
FROM generate_series(0,1) m
ON CONFLICT (actor_id,kind,minute) DO UPDATE SET used=30;
SELECT throws_ok($$SELECT pg_temp.lookup((SELECT viewer FROM staff), '{"kind":"support_reference","value":"MCH-K9"}')$$,
  'PT429', 'ADM_RATE_LIMITED', 'lookups beyond the per-minute budget are refused');

-- Order reads keep the original terms; provider identities need provider inspection.
CREATE TEMP TABLE viewer_order AS SELECT pg_temp.order_read((SELECT viewer FROM staff), 'f3000000-0000-4000-8000-000000000001') r;
CREATE TEMP TABLE operator_order AS SELECT pg_temp.order_read((SELECT operator FROM staff), 'f3000000-0000-4000-8000-000000000001') r;
SELECT is((SELECT r#>>'{value,historical,refundPolicyVersion}' FROM viewer_order), 'v1', 'the order keeps its frozen refund policy');
SELECT is((SELECT (r#>>'{value,historical,expectedCapturedMinor}')::int FROM viewer_order), 1500, 'and its frozen price');
SELECT is((SELECT r#>>'{value,historicalComplete}' FROM viewer_order), 'true', 'a Phase 2 order has complete original terms');
SELECT is((SELECT r#>>'{value,paymentState}' FROM viewer_order), 'paid', 'a recorded payment reads as paid');
SELECT is((SELECT (r#>>'{value,successfulRefundMinor}')::int FROM viewer_order), 100, 'successful refunds are totalled');
SELECT is((SELECT r#>>'{value,disputes,0,classification}' FROM viewer_order), 'inquiry', 'a warning-stage dispute is an inquiry');
SELECT is((SELECT r->'value'->'binding' FROM viewer_order), 'null'::jsonb, 'without provider inspection there is no binding');
SELECT is((SELECT r#>'{value,refunds,0,providerRefundId}' FROM viewer_order), 'null'::jsonb, 'and no provider refund id');
SELECT is((SELECT r#>>'{value,refunds,0,providerRefundId}' FROM operator_order), 're_support_1', 'provider inspection shows the refund id');
SELECT is((SELECT r#>>'{value,binding,accountId}' FROM operator_order), 'acct_support_test', 'and the account binding');

-- An older order stays unknown rather than borrowing today's offer or title.
UPDATE public.recipe_collections SET title = 'Renamed support shelf' WHERE id = 'f3000000-0000-4000-8000-000000000003';
CREATE TEMP TABLE legacy_order AS SELECT pg_temp.order_read((SELECT viewer FROM staff), 'f3000000-0000-4000-8000-000000000011') r;
SELECT is((SELECT r#>>'{value,historicalComplete}' FROM legacy_order), 'false', 'an older order is marked incomplete');
SELECT is((SELECT r#>'{value,historical,refundPolicyVersion}' FROM legacy_order), 'null'::jsonb,
  'its missing refund policy stays unknown even though the current offer has one');
SELECT is((SELECT r#>>'{value,historical,manifestHash}' FROM legacy_order), repeat('b',64), 'the release manifest supplies its recipe list');
SELECT is((SELECT r#>>'{value,currentTitle}' FROM legacy_order), 'Renamed support shelf', 'today''s title is shown as today''s');
SELECT is((SELECT r#>'{value,historicalTitle}' FROM legacy_order), 'null'::jsonb, 'and never as the title at purchase');
SELECT is((SELECT r#>>'{value,paymentState}' FROM legacy_order), 'unpaid', 'an open checkout is unpaid, not failed');
SELECT is(pg_temp.order_read((SELECT viewer FROM staff), 'f3000000-0000-4000-8000-000000000013')#>>'{value,accountState}', 'closed',
  'an order whose account is gone reads as a closed account');

-- Customer reads: both modes, closed principals and pagination.
SELECT is((SELECT jsonb_agg(o->>'mode' ORDER BY o->>'orderId') FROM jsonb_array_elements(
  pg_temp.customer((SELECT viewer FROM staff), 'f3000000-0000-4000-8000-000000000002')#>'{value,orders}') o), '["test", "test", "live"]'::jsonb,
  'a customer''s test and live orders are listed separately');
SELECT is(pg_temp.customer((SELECT viewer FROM staff), 'f3000000-0000-4000-8000-00000000000c')->'value'->'email', 'null'::jsonb,
  'a closed account has no email');
INSERT INTO private.purchase_orders(support_reference,owner_principal,user_id,offer_id,release_id,snapshot,attempt_state,idempotency_key)
SELECT 'MCH-P'||lpad(n::text,2,'0'), 'f3000000-0000-4000-8000-00000000000b', 'f3000000-0000-4000-8000-00000000000b',
 'f3000000-0000-4000-8000-000000000021', 'f3000000-0000-4000-8000-000000000004',
 '{"provider_mode":"test","price_minor":1500,"currency":"usd"}', 'closed', 'support-page-'||n FROM generate_series(1,26) n;
CREATE TEMP TABLE page1 AS SELECT pg_temp.customer((SELECT viewer FROM staff), 'f3000000-0000-4000-8000-00000000000b') r;
SELECT is((SELECT jsonb_array_length(r#>'{value,orders}') FROM page1), 25, 'a page holds 25 orders');
SELECT is(jsonb_array_length(pg_temp.customer((SELECT viewer FROM staff), 'f3000000-0000-4000-8000-00000000000b',
  (SELECT r#>>'{value,nextCursor}' FROM page1))#>'{value,orders}'), 1, 'the next page holds the rest');
SELECT throws_ok($$SELECT pg_temp.customer((SELECT viewer FROM staff), 'f3000000-0000-4000-8000-00000000000b', 'not-a-cursor')$$,
  '22023', 'ADM_INVALID', 'a malformed cursor is refused');

-- Authority and scope.
SELECT throws_ok($$SELECT pg_temp.support_as('92000000-0000-0000-0000-000000000003','aal2','SELECT public.admin_support_order(''f3000000-0000-4000-8000-000000000001'')')$$,
  '42501', 'ADM_DENIED', 'a recipe editor cannot read orders');
SELECT ok(NOT EXISTS(SELECT 1 FROM pg_proc WHERE proname IN ('admin_support_lookup','admin_support_order','admin_support_customer')
  AND prosrc ~* '(children|chat|preferences|saved_recipes)'), 'support reads never touch children, chats or preferences');

SELECT * FROM finish();
ROLLBACK;
