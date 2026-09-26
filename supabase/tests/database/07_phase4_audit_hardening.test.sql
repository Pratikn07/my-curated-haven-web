BEGIN;
SELECT plan(9);

-- R4-01: the legacy recipe and search tables are closed to client roles.
SELECT ok(
  NOT has_table_privilege('anon', 'public.recipes', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.recipes', 'SELECT'),
  'client roles cannot read legacy public.recipes'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.search_analytics', 'SELECT'),
  'anon cannot read raw search queries'
);

-- M4-02: nobody outside trusted tooling uploads into the public image bucket.
SELECT is_empty(
  $$ SELECT 1 FROM pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects'
       AND cmd = 'INSERT' AND qual IS NULL
       AND with_check ILIKE '%recipe-images%' $$,
  'no storage policy lets clients insert into recipe-images'
);

-- M4-05: definer functions are not client RPCs.
SELECT ok(
  NOT has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE'),
  'client roles cannot call the signup trigger function'
);

SELECT ok(
  has_function_privilege('supabase_auth_admin', 'public.handle_new_user()', 'EXECUTE'),
  'the auth service can still run the signup trigger function'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.increment_shop_click(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.increment_shop_click(uuid)', 'EXECUTE'),
  'client roles cannot inflate shop click counts'
);

-- Signup still creates a profile after PUBLIC lost EXECUTE on the trigger function.
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES (
  '70000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'audit-signup@example.test',
  '{"name":"Audit Signup"}'::jsonb, now(), now()
);

SELECT is(
  (SELECT email FROM public.profiles WHERE id = '70000000-0000-0000-0000-000000000007'),
  'audit-signup@example.test',
  'signup trigger still creates the profile'
);

SELECT is(
  (SELECT name FROM public.profiles WHERE id = '70000000-0000-0000-0000-000000000007'),
  'Audit Signup',
  'signup trigger copies the display name'
);

-- M4-06: every function in public and private pins its search_path.
SELECT is_empty(
  $$ SELECT p.oid::regprocedure::text
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
     WHERE n.nspname IN ('public', 'private')
       AND d.objid IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%'
       ) $$,
  'no public or private function has a mutable search_path'
);

SELECT * FROM finish();
ROLLBACK;
