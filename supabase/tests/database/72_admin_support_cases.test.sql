BEGIN;
SELECT plan(40);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-support.sql

UPDATE private.support_workspace_settings SET stage = 'inspection';
CREATE FUNCTION pg_temp.case_cmd(p_user uuid, p_command jsonb) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as(p_user, 'aal2', format('SELECT public.admin_support_case(%L::jsonb)', p_command))
$$;
CREATE FUNCTION pg_temp.cmd(p_action text, p_case uuid, p_version integer, p_extra jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('operationId', gen_random_uuid(), 'caseId', p_case,
   'orderId', 'f3000000-0000-4000-8000-000000000001', 'userId', 'f3000000-0000-4000-8000-000000000002',
   'expectedVersion', p_version, 'action', p_action, 'category', 'missing_access', 'note', NULL,
   'amendsEventId', NULL, 'state', 'open', 'resolutionReference', NULL) || p_extra
$$;
CREATE FUNCTION pg_temp.redact(p_user uuid, p_event uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.support_as(p_user, 'aal2',
   format('SELECT public.admin_support_redact_note(%L, %L, gen_random_uuid())', p_event, 'Contains card digits'))
$$;
CREATE TEMP TABLE ops AS SELECT 'f3000000-0000-4000-8000-0000000000a2'::uuid op, 'f3000000-0000-4000-8000-0000000000a1'::uuid viewer,
 '92000000-0000-0000-0000-000000000001'::uuid owner;

-- Creating and moving a case changes no access.
CREATE TEMP TABLE before_case AS SELECT (SELECT count(*) FROM private.access_sources) sources,
 (SELECT count(*) FROM public.access_entitlements) entitlements;
CREATE TEMP TABLE c1 AS SELECT pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('create', NULL, NULL)) r;
SELECT is((SELECT r->>'state' FROM c1), 'open', 'an operator opens a case on an order');
SELECT is((SELECT (r->>'version')::int FROM c1), 1, 'a new case is at version 1');
CREATE TEMP TABLE c1b AS SELECT pg_temp.case_cmd((SELECT op FROM ops),
 pg_temp.cmd('set_state', (SELECT (r->>'id')::uuid FROM c1), 1, '{"state":"investigating"}')) r;
SELECT is((SELECT r->>'state' FROM c1b), 'investigating', 'the case moves to investigating');
SELECT ok((SELECT sources = (SELECT count(*) FROM private.access_sources)
  AND entitlements = (SELECT count(*) FROM public.access_entitlements) FROM before_case),
  'case status has no entitlement side effect');
SELECT throws_ok(format($$SELECT pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('set_state', %L, 1, '{"state":"waiting_on_customer"}'))$$,
  (SELECT r->>'id' FROM c1)), 'PT409', 'ADM_CONFLICT', 'a stale version is refused');

-- Who may write, and what must agree.
SELECT throws_ok($$SELECT pg_temp.case_cmd((SELECT viewer FROM ops), pg_temp.cmd('create', NULL, NULL))$$, '42501', 'ADM_DENIED',
  'a support viewer cannot open cases');
SELECT throws_ok($$SELECT pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('create', NULL, NULL,
  '{"userId":"f3000000-0000-4000-8000-00000000000b"}'))$$, '22023', 'ADM_INVALID', 'an order and a different account cannot share a case');
SELECT throws_ok($$SELECT pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('create', NULL, NULL, '{"orderId":null,"userId":null}'))$$,
  '22023', 'ADM_INVALID', 'a case needs an order or an account');
SELECT throws_ok($$SELECT pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('create', NULL, NULL, '{"category":"refund_please"}'))$$,
  '22023', 'ADM_INVALID', 'an unknown category is refused');
SELECT throws_ok($$SELECT pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('create', NULL, NULL, '{"actor":"f3000000-0000-4000-8000-0000000000a1"}'))$$,
  '22023', 'ADM_INVALID', 'extra fields such as an actor are refused');
CREATE TEMP TABLE c2 AS SELECT pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('create', NULL, NULL,
  '{"orderId":null,"userId":"f3000000-0000-4000-8000-00000000000c","category":"account_mismatch"}')) r;
SELECT is((SELECT r->>'userId' FROM c2), 'f3000000-0000-4000-8000-00000000000c', 'a case can concern a closed account');
SELECT throws_ok(format($$SELECT pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('set_state', %L, 1,
  '{"orderId":"f3000000-0000-4000-8000-000000000001","userId":"f3000000-0000-4000-8000-00000000000c","state":"investigating"}'))$$,
  (SELECT r->>'id' FROM c2)), '22023', 'ADM_INVALID', 'a command cannot move a case to another order');

-- Notes need an approved retention period, and are never edited in place.
SELECT throws_ok(format($$SELECT pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('append_note', %L, 2, '{"note":"Called the bank"}'))$$,
  (SELECT r->>'id' FROM c1)), '42501', 'ADM_BLOCKED', 'notes are off until a retention period is approved');
UPDATE private.support_workspace_settings SET note_retention_days = 90;
CREATE TEMP TABLE n1 AS SELECT pg_temp.case_cmd((SELECT op FROM ops),
 pg_temp.cmd('append_note', (SELECT (r->>'id')::uuid FROM c1), 2, '{"note":"Customer says the email never arrived","state":"investigating"}')) r;
SELECT is((SELECT (r->>'version')::int FROM n1), 3, 'a note advances the case version');
SELECT throws_ok(format($$SELECT pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('append_note', %L, 3, jsonb_build_object('note', repeat('x', 2001))))$$,
  (SELECT r->>'id' FROM c1)), '22023', 'ADM_INVALID', 'notes longer than 2,000 characters are refused');
CREATE TEMP TABLE first_note AS SELECT id FROM private.support_case_events
 WHERE case_id = (SELECT (r->>'id')::uuid FROM c1) AND action = 'append_note';
SELECT throws_ok(format($$SELECT pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('amend_note', %L, 1,
  jsonb_build_object('note','Moved','amendsEventId',%L,'orderId',null,'userId','f3000000-0000-4000-8000-00000000000c')))$$,
  (SELECT r->>'id' FROM c2), (SELECT id FROM first_note)), '22023', 'ADM_INVALID', 'a note cannot amend another case''s note');
SELECT pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('amend_note', (SELECT (r->>'id')::uuid FROM c1), 3,
  jsonb_build_object('note','Correction: the receipt arrived, the library link did not','amendsEventId',(SELECT id FROM first_note),
    'state','investigating')));
SELECT is((SELECT text FROM private.support_note_texts WHERE event_id = (SELECT id FROM first_note)),
  'Customer says the email never arrived', 'the original note is kept beside its amendment');
SELECT throws_ok($$UPDATE private.support_case_events SET action = 'set_state'$$, '42501', 'ADM_IMMUTABLE', 'case events cannot be edited');

-- Resolving needs a recorded outcome; reopening keeps the history.
SELECT throws_ok(format($$SELECT pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('set_state', %L, 4, '{"state":"resolved"}'))$$,
  (SELECT r->>'id' FROM c1)), '22023', 'ADM_INVALID', 'a case cannot be resolved without a recorded outcome');
SELECT is(pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('set_state', (SELECT (r->>'id')::uuid FROM c1), 4,
  '{"state":"resolved","resolutionReference":"Customer to sign in with the purchase email"}'))->>'state', 'resolved', 'it resolves with an outcome');
SELECT is(pg_temp.case_cmd((SELECT op FROM ops), pg_temp.cmd('set_state', (SELECT (r->>'id')::uuid FROM c1), 5, '{"state":"open"}'))->>'version',
  '6', 'reopening continues the same case');
SELECT is((SELECT count(*)::int FROM private.support_case_events WHERE case_id = (SELECT (r->>'id')::uuid FROM c1)), 6,
  'every step is kept in the case history');

-- Repeating a command returns the same result; changing it under the same id is refused.
CREATE TEMP TABLE replay AS SELECT pg_temp.cmd('create', NULL, NULL, '{"category":"duplicate_purchase"}') c;
CREATE TEMP TABLE replay1 AS SELECT pg_temp.case_cmd((SELECT op FROM ops), (SELECT c FROM replay)) r;
SELECT is(pg_temp.case_cmd((SELECT op FROM ops), (SELECT c FROM replay))->>'id', (SELECT r->>'id' FROM replay1),
  'the same operation returns the same case');
SELECT throws_ok($$SELECT pg_temp.case_cmd((SELECT op FROM ops), (SELECT c || '{"category":"unresolved_payment"}' FROM replay))$$,
  '22023', 'ADM_INVALID', 'the same operation with a different request is refused');

-- Owner-only redaction clears the text and records who and why, never the text itself.
SELECT throws_ok($$SELECT pg_temp.redact((SELECT op FROM ops), (SELECT id FROM first_note))$$, '42501', 'ADM_DENIED',
  'only the owner can redact a note');
SELECT pg_temp.redact((SELECT owner FROM ops), (SELECT id FROM first_note));
SELECT is((SELECT text FROM private.support_note_texts WHERE event_id = (SELECT id FROM first_note)), NULL, 'the redacted text is gone');
SELECT is((SELECT redaction_reason FROM private.support_note_texts WHERE event_id = (SELECT id FROM first_note)), 'Contains card digits',
  'the reason is recorded');
SELECT ok(NOT EXISTS (SELECT 1 FROM private.support_case_events e WHERE row_to_json(e)::text LIKE '%email never arrived%')
  AND NOT EXISTS (SELECT 1 FROM private.admin_operations o WHERE o.result::text LIKE '%email never arrived%'),
  'no event or receipt keeps a copy of the redacted text');

-- The order timeline lists case activity, newest first, without redacted text.
CREATE TEMP TABLE hist AS SELECT pg_temp.support_as((SELECT viewer FROM ops), 'aal2',
 'SELECT public.admin_support_history(''f3000000-0000-4000-8000-000000000001'', NULL)') r;
SELECT ok((SELECT jsonb_array_length(r->'events') >= 7 FROM hist), 'the order timeline lists case activity');
SELECT is((SELECT count(*)::int FROM hist, jsonb_array_elements(r->'events') e WHERE e->>'note' LIKE '%email never arrived%'), 0,
  'redacted text never appears in the timeline');
SELECT is((SELECT r#>>'{events,0,kind}' FROM hist), 'case', 'timeline entries say what kind of activity they are');
SELECT is(pg_temp.support_as((SELECT viewer FROM ops), 'aal2',
  'SELECT public.admin_support_customer(''f3000000-0000-4000-8000-00000000000c'', NULL)')#>>'{value,cases,0,state}', 'open',
  'a customer read lists their cases');

-- The attention queue: local signals only, per mode, paginated.
CREATE TEMP TABLE q AS SELECT pg_temp.support_as((SELECT viewer FROM ops), 'aal2', 'SELECT public.admin_support_queue(''test'', NULL)') r;
SELECT ok((SELECT bool_or(i->>'reasonCode' = 'DISPUTE_INQUIRY') FROM q, jsonb_array_elements(r->'items') i),
  'a dispute inquiry needs attention');
SELECT ok((SELECT bool_or(i->>'reasonCode' = 'CASE_OPEN') FROM q, jsonb_array_elements(r->'items') i), 'an open case needs attention');
SELECT ok((SELECT NOT bool_or(i->>'orderId' = 'f3000000-0000-4000-8000-000000000011') FROM q, jsonb_array_elements(r->'items') i),
  'an ordinary unpaid checkout is not treated as a failure');
SELECT ok((SELECT bool_and(i->>'mode' = 'test') FROM q, jsonb_array_elements(r->'items') i), 'the test queue lists only test items');
SELECT throws_ok($$SELECT pg_temp.support_as((SELECT viewer FROM ops), 'aal2', 'SELECT public.admin_support_queue(''prod'', NULL)')$$,
  '22023', 'ADM_INVALID', 'an unknown mode is refused');

-- Reads are audited by outcome and target, never by search term.
SELECT pg_temp.support_as((SELECT viewer FROM ops), 'aal2',
  'SELECT public.admin_support_lookup(''{"kind":"email","value":"first.last+buyer@synthetic.test"}'')');
SELECT is((SELECT target_ref FROM private.support_read_audit WHERE actor_id = (SELECT viewer FROM ops) AND action = 'lookup.email'
  ORDER BY at DESC LIMIT 1), 'f3000000-0000-4000-8000-000000000002', 'a lookup is audited by what it found');
SELECT is((SELECT count(*)::int FROM private.support_read_audit a WHERE row_to_json(a)::text LIKE '%synthetic.test%'), 0,
  'the audit never stores the email searched for');
SELECT is((SELECT count(*)::int FROM private.support_read_audit WHERE action = 'order' AND target_ref = 'f3000000-0000-4000-8000-000000000001'), 0,
  'nothing is audited for reads that did not happen');

SELECT * FROM finish();
ROLLBACK;
