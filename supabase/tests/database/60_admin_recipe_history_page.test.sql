BEGIN;
SELECT no_plan();
\ir ../../test-fixtures/admin-console.sql

INSERT INTO public.recipe_catalog(id, slug, title, public_summary, preview_image_path, publication_state)
VALUES ('e0000000-0000-0000-0000-000000000001', 'history-page-fixture', 'History page fixture', 'Synthetic', '', 'draft');
INSERT INTO private.admin_audit(id, actor_id, action, recipe_id, request_id, at, reason, result)
SELECT ('e1000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '92000000-0000-0000-0000-000000000001', 'draft.save',
  'e0000000-0000-0000-0000-000000000001', gen_random_uuid(),
  '2026-10-07 00:00:00+00'::timestamptz + (n / 2) * interval '1 second',
  'Synthetic change ' || n, 'committed'
FROM generate_series(1, 27) n;

SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is(jsonb_array_length(public.admin_recipe_detail('e0000000-0000-0000-0000-000000000001')->'history'->'events'), 25, 'detail embeds a bounded first page');
SELECT ok((public.admin_recipe_detail('e0000000-0000-0000-0000-000000000001')->'history'->>'nextCursor') IS NOT NULL, 'detail offers an older page');
SELECT is(jsonb_array_length(public.admin_recipe_history('e0000000-0000-0000-0000-000000000001',
  public.admin_recipe_detail('e0000000-0000-0000-0000-000000000001')->'history'->>'nextCursor', 25)->'events'), 2, 'older page includes the remainder');
SELECT is((public.admin_recipe_history('e0000000-0000-0000-0000-000000000001',
  public.admin_recipe_detail('e0000000-0000-0000-0000-000000000001')->'history'->>'nextCursor', 25)->>'nextCursor'), NULL, 'last page has no cursor');
SELECT is((SELECT count(DISTINCT event->>'id') FROM (
  SELECT jsonb_array_elements(public.admin_recipe_detail('e0000000-0000-0000-0000-000000000001')->'history'->'events') event
  UNION ALL
  SELECT jsonb_array_elements(public.admin_recipe_history('e0000000-0000-0000-0000-000000000001',
    public.admin_recipe_detail('e0000000-0000-0000-0000-000000000001')->'history'->>'nextCursor', 25)->'events') event
) pages), 27::bigint, 'timestamp ties do not duplicate or skip history');
SELECT throws_ok($$SELECT public.admin_recipe_history('e0000000-0000-0000-0000-000000000001', 'invalid', 25)$$, '22023', 'ADM_INVALID', 'malformed cursor rejected');
RESET ROLE;

SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal1');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_recipe_history('e0000000-0000-0000-0000-000000000001', NULL, 25)$$, '42501', 'ADM_MFA_REQUIRED', 'aal1 history denied');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
