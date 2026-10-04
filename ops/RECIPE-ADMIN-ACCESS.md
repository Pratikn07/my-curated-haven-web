# Recipe admin access

The protected `public.user_roles` table assigns the application `admin` role to an existing Supabase Auth user. Only a trusted database operator or service role can assign or revoke roles. Client sessions cannot promote themselves, edit roles or read other accounts' roles.

An admin's `/recipes` page lists every catalog entry, including draft and withdrawn entries. Full ingredients, instructions, saving and printing use the admin's normal authenticated session. Two additive SELECT policies grant recipe catalog and body access. Public publication states, free slots, purchase entitlements and other users' account data are unchanged. This role grants recipe inspection, not publication or content-editing privileges.

`is_recipe_admin()` uses invoker permissions and the caller's `auth.uid()` to check the protected table on each request. No email allowlist or user-editable metadata is trusted, and revocation does not wait for a JWT refresh.

To grant access, verify the exact confirmed account in `auth.users`, then use trusted database credentials to insert its UUID:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<verified-auth-user-uuid>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

To revoke access:

```sql
DELETE FROM public.user_roles
WHERE user_id = '<verified-auth-user-uuid>' AND role = 'admin';
```

No production identity is seeded in the schema migration. Recipe detail pages viewed by admins are marked `noindex`; admin opens and print clicks are excluded from free/paid recipe analytics.

Regression coverage: `tests/data/backend-errors.test.mjs` and `supabase/tests/database/10_recipe_admin_access.test.sql`.
