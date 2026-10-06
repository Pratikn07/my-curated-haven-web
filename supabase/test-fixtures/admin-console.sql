-- Test-only synthetic identities, always used inside a rollback transaction.
INSERT INTO auth.users(id,email,role,aud,email_confirmed_at)
SELECT ('92000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
       (ARRAY['owner','viewer','editor','reviewer','publisher','customer','unconfirmed','legacy'])[n]||'@synthetic.test',
       'authenticated','authenticated',CASE WHEN n=7 THEN NULL ELSE now() END
FROM generate_series(1,8) n;
-- Distinct provider identities may map an exact email to two accounts.
INSERT INTO auth.identities(id,user_id,provider_id,provider,identity_data)
VALUES(gen_random_uuid(),'92000000-0000-0000-0000-000000000006','ambiguous-a','test-a','{"email":"ambiguous@synthetic.test"}'),
      (gen_random_uuid(),'92000000-0000-0000-0000-000000000005','ambiguous-b','test-b','{"email":"ambiguous@synthetic.test"}');
CREATE FUNCTION pg_temp.admin_claims(p_user uuid,p_aal text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM set_config('request.jwt.claim.sub',coalesce(p_user::text,''),true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_user,'aal',p_aal,'role','authenticated','user_metadata',jsonb_build_object('role','owner'))::text,true);
END $$;
DO $$ BEGIN
 IF to_regclass('private.admin_memberships') IS NOT NULL THEN
  INSERT INTO private.admin_memberships(user_id,role,granted_by,reason)
  SELECT ('92000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
    (ARRAY['owner','viewer','editor','reviewer','publisher'])[n],
    '92000000-0000-0000-0000-000000000001','synthetic fixture' FROM generate_series(1,5) n;
  UPDATE private.admin_console_settings SET stage='publication';
 END IF;
END $$;
INSERT INTO public.user_roles(user_id,role) VALUES('92000000-0000-0000-0000-000000000008','admin');
