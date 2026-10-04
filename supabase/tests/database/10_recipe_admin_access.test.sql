BEGIN;
SELECT plan(21);

INSERT INTO auth.users (id, email, role, aud, email_confirmed_at)
VALUES
 ('80000000-0000-0000-0000-000000000001', 'recipe-admin@synthetic.test', 'authenticated', 'authenticated', now()),
 ('80000000-0000-0000-0000-000000000002', 'recipe-reader@synthetic.test', 'authenticated', 'authenticated', now());
INSERT INTO public.user_roles (user_id, role)
VALUES ('80000000-0000-0000-0000-000000000001', 'admin');
INSERT INTO public.recipe_catalog (id, slug, title, public_summary, preview_image_path)
VALUES
 ('81000000-0000-0000-0000-000000000001', 'admin-test-draft', 'Draft fixture', 'Synthetic', 'fixture.png'),
 ('81000000-0000-0000-0000-000000000002', 'admin-test-withdrawn', 'Withdrawn fixture', 'Synthetic', 'fixture.png'),
 ('81000000-0000-0000-0000-000000000003', 'admin-test-paid', 'Paid fixture', 'Synthetic', 'fixture.png');
INSERT INTO public.recipe_bodies (recipe_id, ingredients, instructions, yield, allergen_review_state)
SELECT id, '[{"item":"Synthetic ingredient"}]', '[{"step":1,"text":"Synthetic method"}]', '1 serving', 'reviewed_no_allergens'
FROM public.recipe_catalog WHERE slug LIKE 'admin-test-%';
UPDATE public.recipe_catalog SET publication_state='withdrawn' WHERE slug='admin-test-withdrawn';
UPDATE public.recipe_catalog SET publication_state='published' WHERE slug='admin-test-paid';

SELECT ok(NOT has_table_privilege('anon','public.user_roles','SELECT'), 'anonymous callers cannot read roles');
SELECT ok(NOT has_table_privilege('authenticated','public.user_roles','INSERT'), 'users cannot grant roles');
SELECT ok(NOT has_table_privilege('authenticated','public.user_roles','UPDATE'), 'users cannot change roles');
SELECT ok(NOT has_table_privilege('authenticated','public.user_roles','DELETE'), 'users cannot remove roles');

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"80000000-0000-0000-0000-000000000001"}';
SET LOCAL "request.jwt.claim.sub" = '80000000-0000-0000-0000-000000000001';
SELECT ok(public.is_recipe_admin(), 'assigned admin is recognized');
SELECT is((SELECT count(*)::int FROM public.recipe_catalog WHERE slug LIKE 'admin-test-%'), 3, 'admin sees draft, withdrawn and paid catalog');
SELECT is((SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id::text LIKE '81000000-%'), 3, 'admin reads every recipe body without purchase');
SELECT lives_ok($$INSERT INTO public.saved_recipes(user_id,recipe_id) VALUES ('80000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001')$$, 'admin can save an unpublished recipe');
SELECT throws_ok($$UPDATE public.recipe_catalog SET publication_state='published' WHERE slug='admin-test-draft'$$, '42501', NULL, 'reading admin cannot accidentally publish content');
SELECT throws_ok($$INSERT INTO public.user_roles(user_id,role) VALUES ('80000000-0000-0000-0000-000000000002','admin')$$, '42501', NULL, 'admin client cannot grant roles');

SET LOCAL "request.jwt.claims" = '{"sub":"80000000-0000-0000-0000-000000000002","user_metadata":{"role":"admin"}}';
SET LOCAL "request.jwt.claim.sub" = '80000000-0000-0000-0000-000000000002';
SELECT ok(NOT public.is_recipe_admin(), 'forged editable metadata does not grant admin');
SELECT is((SELECT count(*)::int FROM public.user_roles), 0, 'regular user cannot read another users roles');
SELECT is((SELECT count(*)::int FROM public.recipe_catalog WHERE slug LIKE 'admin-test-%'), 1, 'regular user sees only published catalog');
SELECT is((SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id::text LIKE '81000000-%'), 0, 'regular user cannot read draft, withdrawn or unpurchased bodies');
SELECT throws_ok($$INSERT INTO public.user_roles(user_id,role) VALUES ('80000000-0000-0000-0000-000000000002','admin')$$, '42501', NULL, 'regular user cannot self-promote');

SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '';
SET LOCAL "request.jwt.claim.sub" = '';
SELECT is((SELECT count(*)::int FROM public.recipe_catalog WHERE slug LIKE 'admin-test-%'), 1, 'anonymous visitor sees only published catalog');
SELECT is((SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id::text LIKE '81000000-%'), 0, 'anonymous visitor cannot read private recipe bodies');
SELECT throws_ok('SELECT public.is_recipe_admin()', '42501', NULL, 'anonymous caller cannot execute admin RPC');

RESET ROLE;
DELETE FROM public.user_roles WHERE user_id='80000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"80000000-0000-0000-0000-000000000001"}';
SET LOCAL "request.jwt.claim.sub" = '80000000-0000-0000-0000-000000000001';
SELECT ok(NOT public.is_recipe_admin(), 'role removal applies to the existing session immediately');
SELECT is((SELECT count(*)::int FROM public.recipe_catalog WHERE slug LIKE 'admin-test-%'), 1, 'revoked admin loses draft catalog access');
SELECT is((SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id::text LIKE '81000000-%'), 0, 'revoked admin loses full body access');

SELECT * FROM finish();
ROLLBACK;
