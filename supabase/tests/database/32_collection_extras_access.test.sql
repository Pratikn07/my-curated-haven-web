-- A collection's paid extras (the make-ahead plan) are read like paid recipe bodies: owners of that book,
-- recipe admins and console staff only. Synthetic rows, rolled back.
BEGIN;
SELECT plan(25);
\ir ../../test-fixtures/admin-console.sql

INSERT INTO auth.users (id, email, role, aud, email_confirmed_at) VALUES
 ('94000000-0000-0000-0000-000000000001', 'extras-owner@synthetic.test', 'authenticated', 'authenticated', now()),
 ('94000000-0000-0000-0000-000000000002', 'extras-revoked@synthetic.test', 'authenticated', 'authenticated', now()),
 ('94000000-0000-0000-0000-000000000003', 'extras-stranger@synthetic.test', 'authenticated', 'authenticated', now()),
 ('94000000-0000-0000-0000-000000000004', 'extras-expired@synthetic.test', 'authenticated', 'authenticated', now()),
 ('94000000-0000-0000-0000-000000000005', 'extras-other-owner@synthetic.test', 'authenticated', 'authenticated', now()),
 ('94000000-0000-0000-0000-000000000006', 'extras-old-release@synthetic.test', 'authenticated', 'authenticated', now());

INSERT INTO public.recipe_collections (id, slug, title, public_summary, listing_state) VALUES
 ('95000000-0000-0000-0000-000000000001', 'extras-test-book', 'Extras test book', 'Synthetic', 'listed'),
 ('95000000-0000-0000-0000-000000000002', 'extras-other-book', 'Extras other book', 'Synthetic', 'listed'),
 ('95000000-0000-0000-0000-000000000003', 'extras-gone-book', 'Extras gone book', 'Synthetic', 'unlisted');
INSERT INTO public.collection_releases (id, collection_id, version, state) VALUES
 ('96000000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000001', 1, 'published'),
 ('96000000-0000-0000-0000-000000000003', '95000000-0000-0000-0000-000000000001', 2, 'published'),
 ('96000000-0000-0000-0000-000000000002', '95000000-0000-0000-0000-000000000002', 1, 'published');

INSERT INTO public.access_entitlements (user_id, release_id, state, valid_from, expires_at, revoked_at) VALUES
 ('94000000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000003', 'active', now() - interval '1 day', NULL, NULL),
 ('94000000-0000-0000-0000-000000000002', '96000000-0000-0000-0000-000000000003', 'revoked', now() - interval '3 days', NULL, now() - interval '1 day'),
 ('94000000-0000-0000-0000-000000000004', '96000000-0000-0000-0000-000000000003', 'expired', now() - interval '30 days', now() - interval '1 day', NULL),
 ('94000000-0000-0000-0000-000000000005', '96000000-0000-0000-0000-000000000002', 'active', now() - interval '1 day', NULL, NULL),
 ('94000000-0000-0000-0000-000000000006', '96000000-0000-0000-0000-000000000001', 'active', now() - interval '9 days', NULL, NULL);

INSERT INTO public.collection_extras (collection_id, kind, content) VALUES
 ('95000000-0000-0000-0000-000000000001', 'make_ahead_plan', '{"note":"synthetic plan for the test book"}'),
 ('95000000-0000-0000-0000-000000000002', 'make_ahead_plan', '{"note":"synthetic plan for the other book"}'),
 ('95000000-0000-0000-0000-000000000003', 'make_ahead_plan', '{"note":"synthetic plan for a removed book"}');

CREATE FUNCTION pg_temp.as_user(p_user uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM set_config('request.jwt.claim.sub', p_user::text, true);
 PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true);
END $$;

-- The table: RLS on, API roles may only read.
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.collection_extras'::regclass), 'row level security is on');
SELECT ok(NOT has_table_privilege('anon', 'public.collection_extras', 'INSERT, UPDATE, DELETE'), 'anonymous callers cannot write extras');
SELECT ok(NOT has_table_privilege('authenticated', 'public.collection_extras', 'INSERT, UPDATE, DELETE'), 'signed-in callers cannot write extras');
SELECT throws_ok($$INSERT INTO public.collection_extras(collection_id, kind, content)
  VALUES ('95000000-0000-0000-0000-000000000001', 'recipe_notes', '{}')$$, '23514', NULL, 'only known kinds are stored');
SELECT throws_ok($$INSERT INTO public.collection_extras(collection_id, kind, content)
  VALUES ('95000000-0000-0000-0000-000000000002', 'make_ahead_plan', '{}')$$, '23505', NULL, 'one plan per book');
SELECT throws_ok($$UPDATE public.collection_extras SET content = '[]' WHERE collection_id = '95000000-0000-0000-0000-000000000002'$$,
  '23514', NULL, 'a plan is a JSON object');

-- Anonymous visitors read nothing.
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '';
SET LOCAL "request.jwt.claim.sub" = '';
SELECT is((SELECT count(*)::int FROM public.collection_extras), 0, 'anonymous visitor reads no extras');
RESET ROLE;

-- Signed in without a valid purchase of this book: nothing.
SELECT pg_temp.as_user('94000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.collection_extras), 0, 'a signed-in non-owner reads no extras');
RESET ROLE;
SELECT pg_temp.as_user('94000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000001'), 0, 'a revoked purchase reads nothing');
RESET ROLE;
SELECT pg_temp.as_user('94000000-0000-0000-0000-000000000004');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000001'), 0, 'an expired purchase reads nothing');
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000006', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.collection_extras), 0, 'forged owner metadata reads nothing');
RESET ROLE;

-- Owners read their own book's extras, and only those.
SELECT pg_temp.as_user('94000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000001'), 1, 'the owner reads their book''s plan');
SELECT is((SELECT content->>'note' FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000001'),
  'synthetic plan for the test book', 'the owner reads the plan content');
SELECT is((SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000002'), 0, 'the owner cannot read another book''s plan');
SELECT throws_ok($$UPDATE public.collection_extras SET content = '{}'$$, '42501', NULL, 'the owner cannot change the plan');
SELECT throws_ok($$DELETE FROM public.collection_extras$$, '42501', NULL, 'the owner cannot delete the plan');
RESET ROLE;
SELECT pg_temp.as_user('94000000-0000-0000-0000-000000000006');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000001'), 1, 'a buyer of an earlier release still reads the plan');
RESET ROLE;
SELECT pg_temp.as_user('94000000-0000-0000-0000-000000000005');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000001'), 0, 'an owner of another book reads nothing of this one');
SELECT is((SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000002'), 1, 'and reads their own book''s plan');
RESET ROLE;

-- Losing the purchase removes access at once.
UPDATE public.access_entitlements SET state = 'revoked', revoked_at = now()
WHERE user_id = '94000000-0000-0000-0000-000000000001';
SELECT pg_temp.as_user('94000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000001'), 0, 'a refunded owner loses the plan immediately');
RESET ROLE;

-- Recipe admins and console staff read every book's extras, like recipe bodies; staff need MFA.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000008', 'aal1');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000001') + (SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000002'), 2,
  'a recipe admin reads every plan');
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000002', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000001') + (SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000002'), 2,
  'console staff with MFA read every plan');
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000002', 'aal1');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000001'), 0, 'console staff without MFA read nothing');
RESET ROLE;
UPDATE private.admin_console_settings SET stage = 'disabled';
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000002', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000001'), 0, 'a disabled console reads nothing');
RESET ROLE;

-- Removing a book removes its extras.
DELETE FROM public.recipe_collections WHERE id = '95000000-0000-0000-0000-000000000003';
SELECT is((SELECT count(*)::int FROM public.collection_extras WHERE collection_id = '95000000-0000-0000-0000-000000000003'), 0,
  'extras go with their collection');

SELECT * FROM finish();
ROLLBACK;
