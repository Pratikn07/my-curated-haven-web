# Recipe admin

Add, edit, publish and take down recipes at **mycuratedhaven.com/admin** without touching the database or the code. It works on a phone.

## Getting access

You sign in with the normal sign-in page (email code). Being signed in isn't enough: each person is added to the admin list once.

1. Each of you signs in to the website once, so you have an account.
2. In Supabase → SQL editor for project `ccrgvammglkvdlaojgzv`, run this once per person, with the email you sign in with:

   ```sql
   INSERT INTO private.admin_users (user_id, note)
   SELECT id, 'owner' FROM auth.users WHERE email = 'you@example.com';
   ```

3. Open `/admin`. Your account page also shows a **Recipe admin** card.

Anyone else who opens `/admin` sees "This page is not available". To remove someone: `DELETE FROM private.admin_users WHERE user_id = (SELECT id FROM auth.users WHERE email = '...');`

## Adding a recipe

1. **New recipe**, type the name, **Save draft**. A draft is hidden from parents, so you can save half-finished work.
2. Fill in the summary, photo, time, how much it makes, ingredients and steps. Photos are shrunk on your phone before they upload (a few hundred KB instead of several MB), so pages stay fast.
3. Under **Allergens**, read every ingredient and choose **Contains allergens** (tick which) or **No major allergens**.
4. **Save and publish**. If something is missing, it saves as a draft and lists what to add.

The page tells you where each recipe appears. A live recipe that isn't one of the three free recipes, and isn't in a paid collection, shows as locked to parents. Choosing the free recipes and building collections from here comes in a later step.

## Rules the site enforces

- A recipe can't go live until its allergens are checked.
- Once a recipe has been live, its web address can't change, because links to it may already be on Instagram.
- The three free homepage recipes and recipes in a paid collection can't be taken down here, so nobody loses something they rely on or paid for.
- If you both edit the same recipe, the second save is refused instead of overwriting the first. Reload to see the other person's version.
- Every publish is recorded with who published it.

## Not in this step

- Pasting an Instagram caption to fill the form automatically.
- Choosing which recipes are free or featured on the homepage, and building paid collections.
- Previewing a draft exactly as parents will see it.

## Releasing this change

The database change is `supabase/migrations/20261003160000_admin_recipe_editor.sql`. Production already has every migration it depends on (checked 2026-10-03). Apply it on its own, following the production rules in `docs/implementation/phase-4/MIGRATION-AND-ROLLOUT.md` (dump first, one file in a transaction, then `supabase migration repair`). Never `supabase db push`. Then merge the code, and add the admin rows above.
