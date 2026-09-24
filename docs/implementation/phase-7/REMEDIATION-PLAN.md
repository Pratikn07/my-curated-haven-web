# Phase 7 remediation plan

Status: plan only. This document does not change application code, tests, or the live database.

Reviewed on 2026-09-23 against `main` at `3475f62` (`docs(phase-6): add the free-recipe remediation plan`). The live project is `ccrgvammglkvdlaojgzv`. Its migration history includes Phase 5 and does not include `20260923180000_phase7_saved_recipes_policies.sql`. `public.saved_recipes` exists from the earlier parenting migration. Phase 4's `REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public` is already applied there, so client bookmark writes are revoked until the Phase 7 grants land.

Saving a recipe must never grant paid access. Free recipe pages must still render when Auth is unavailable.

## Goal

Make Save persist for the signed-in owner on the live project, reject bookmarks the caller cannot open, say when a new email creates an account, and stop describing account closure as a finished deletion process.

## P7-R1: apply only the saved-recipe grants

`supabase/migrations/20260923180000_phase7_saved_recipes_policies.sql` is the intended grant. It:

- revokes `anon` on `public.saved_recipes`
- grants `SELECT`, `INSERT`, and `DELETE` to `authenticated`
- grants `ALL` to `service_role`
- replaces the policies so each one requires `auth.uid() = user_id`
- adds `idx_saved_recipes_user_created` on `(user_id, created_at DESC)`

It does not grant `public.recipes`.

Work:

1. Read the file again before applying it. Confirm the statements name only `public.saved_recipes` and the index.
2. Apply that migration to `ccrgvammglkvdlaojgzv` through the normal migration path. Do not run `supabase db push` in a way that also applies Phase 8 commerce or the Phase 4 `public.recipes` revoke.
3. After apply, check `has_table_privilege` for `anon` and `authenticated` on `public.recipes` and `public.saved_recipes`. `anon` must still be unable to write bookmarks. `authenticated` must be able to insert and delete only its own rows. `public.recipes` privileges must be unchanged.

Acceptance:

- A signed-in user can save and remove a free recipe and see it on another session.
- User B cannot read or delete user A's bookmark, including by passing A's `user_id`.
- The parenting app's recipe reads are unchanged.

## P7-R2: save only a recipe the caller can open

`toggleSaveRecipeAction` in `my-curated-haven-web/src/lib/actions/saved-recipes.ts` takes the user from `getCurrentUser()` and then calls `saveRecipe`. `saveRecipe` in `my-curated-haven-web/src/lib/data/saved-recipes.ts` upserts any `recipe_id`. The foreign key points at `public.recipes`, so a draft id that exists there is accepted. The saved list later marks it unavailable. The bookmark should not be created.

Work:

1. Before insert, call `checkRecipeAccess` with the caller client and the recipe id.
2. Allow the save only when the result is `free` or `entitled`.
3. Return a typed error for `denied`, `not_found`, and `error`. Do not insert on those results.
4. Keep removal available for an existing bookmark even when the recipe is later withdrawn, so the owner can clear it.
5. Keep the owner check in the database policy. The action check is additional. It does not replace `auth.uid() = user_id`.

Acceptance:

- Saving a free slot recipe or a recipe covered by the caller's active entitlement succeeds.
- Saving a draft, withdrawn, or unpaid recipe id returns an error and adds no row.
- User B still cannot write a row with user A's id.

## P7-R3: say that a new email creates an account

`requestOtpAction` in `my-curated-haven-web/src/app/sign-in/actions.ts` calls `signInWithOtp` with `shouldCreateUser: true` on the same Supabase project as the parenting app. `SignInForm` says "Sign in" and does not say that an unknown email creates an account.

Work:

1. On the email step, state that a new email address creates a My Curated Haven account and that the code is sent to that address. Keep the Terms and Privacy links next to that sentence.
2. Leave `shouldCreateUser: true` only with that sentence visible. Do not add a second silent signup path.
3. Rely on Supabase Auth rate limits for code requests. Do not add an in-memory limiter in the server action. Record the project rate-limit settings used in staging.
4. Send one staging code and confirm native password sign-in and Google sign-in still send or complete mail. Do not change shared email templates in this task. If the OTP template would replace a native template, stop and record that block.

Acceptance:

- The sign-in screen states that a new email creates an account before the code is requested.
- An existing native user can still request a code and land on the validated `returnTo` path.
- A staging note records that native password and Google mail still work, or names the template conflict.

## P7-R4: describe closure as a request, not a completed deletion

`my-curated-haven-web/src/app/account/page.tsx` heads the section "Account Closure & Data Deletion" and says support will remove bookmarks and personal data. The page does not delete `auth.users` or `saved_recipes`. Sign-out in `src/app/account/actions.ts` is local scope only, which is correct for the shared native session.

Work:

1. Rename the heading so it asks the reader to request closure. State that emailing support does not by itself delete the account or the bookmarks.
2. Keep the mailto to `support@mycuratedhaven.com` and the requirement to write from the registered address.
3. Do not add a self-serve delete button in this task. A later support runbook has to say who confirms identity, what is deleted, and what the shared parenting profile retains.
4. Do not change `signOut({ scope: "local" })`.

Acceptance:

- The account page no longer says closure removes data as if that had already happened.
- Sign-out still ends only the web session.
- Free recipe pages still render when `updateSession` cannot reach Auth.

## Out of scope

- Phase 6 free-slot listing and allergen copy.
- Phase 8 checkout, webhooks, and entitlements.
- Revoking `SELECT` on `public.recipes`.
- Child profiles, chat, Google as a new web button, or a self-serve account delete.

## Verification

1. Apply the saved-recipe migration to a disposable database first. `supabase test db` must still pass `02_saved_recipes.test.sql`.
2. Playwright: user A saves a free recipe, sees it under `/account/saved-recipes`, and user B does not.
3. A direct save of a draft id returns an error and leaves `saved_recipes` unchanged.
4. The sign-in page contains the new-account sentence. The account page does not claim deletion is complete.
5. `web-quality` passes on the implementation pull request.

## Rollback

The grant migration is the only live database change. If bookmark writes misbehave, revoke `INSERT` and `DELETE` on `public.saved_recipes` from `authenticated` again. Redeploy the previous web commit for the copy changes. Do not drop `saved_recipes` or delete bookmark rows as a rollback.
