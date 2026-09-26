-- Phase 4 audit, 2026-09-25 (docs/audit/AUDIT-BACKLOG.md M4-02, M4-05).
-- The legacy native policies let anonymous callers upload into the public
-- recipe-images bucket and call two SECURITY DEFINER functions over RPC.

-- M4-02: only trusted tooling uploads recipe images. Public reads stay.
DROP POLICY IF EXISTS "Allow public upload to recipe-images" ON storage.objects;

-- M4-05: handle_new_user is the auth.users signup trigger, not an API.
-- Remove the PUBLIC default and keep EXECUTE for the roles that create users.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role, supabase_auth_admin;

-- M4-05: increment_shop_click let anyone inflate native shop click counts.
DO $$
BEGIN
  IF to_regprocedure('public.increment_shop_click(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.increment_shop_click(uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.increment_shop_click(uuid) TO postgres, service_role;
  END IF;
END $$;
