-- Test-only synthetic support fixtures, always used inside a rollback transaction after admin-console.sql.
-- Phase 3 tasks add their orders, payments, sources and cases here. IDs use the f3000000-0000-4000-8000- prefix
-- and emails end in @synthetic.test; nothing here may name a real customer, account or provider object.
-- Staff: ...0a1 support viewer, ...0a2 support operator.
INSERT INTO auth.users(id,email,role,aud,email_confirmed_at) VALUES
 ('f3000000-0000-4000-8000-0000000000a1','support-viewer@synthetic.test','authenticated','authenticated',now()),
 ('f3000000-0000-4000-8000-0000000000a2','support-operator@synthetic.test','authenticated','authenticated',now());
DO $$ BEGIN
 IF to_regclass('private.support_workspace_settings') IS NOT NULL THEN
  INSERT INTO private.admin_memberships(user_id,role,granted_by,reason) VALUES
   ('f3000000-0000-4000-8000-0000000000a1','support_viewer','92000000-0000-0000-0000-000000000001','synthetic fixture'),
   ('f3000000-0000-4000-8000-0000000000a2','support_operator','92000000-0000-0000-0000-000000000001','synthetic fixture');
 END IF;
END $$;

-- Run p_sql as synthetic user p_user with assurance p_aal and return its single jsonb result.
CREATE FUNCTION pg_temp.support_as(p_user uuid, p_aal text, p_sql text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE result jsonb;
BEGIN
 PERFORM pg_temp.admin_claims(p_user, p_aal);
 SET LOCAL ROLE authenticated;
 EXECUTE p_sql INTO result;
 RESET ROLE;
 RETURN result;
END $$;
