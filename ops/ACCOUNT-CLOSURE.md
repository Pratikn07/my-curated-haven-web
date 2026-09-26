# Account closure runbook

Audit item M7-02 (2026-09-26). The account page and the Privacy Policy tell people to email `support@mycuratedhaven.com` to close their account or have their data deleted. This is what to do when that email arrives.

Expect about 15 minutes per request. Reply within 30 days.

## 1. Verify the request

- The email must come **from the address on the account**. If it comes from another address, reply to the account's address and ask them to confirm from there. Never delete based on a request from a different address.
- Find the user: Supabase → **Authentication → Users**, search the email. Note the user **ID** (UUID).
- If no user matches, reply that no account exists for that address.

## 2. Check for anything that must be kept

Run in Supabase → **SQL Editor** (replace the id):

```sql
select
  (select count(*) from public.saved_recipes where user_id = '<user-id>')        as saved_recipes,
  (select count(*) from public.access_entitlements where user_id = '<user-id>')  as purchases_access,
  (select count(*) from public.children where user_id = '<user-id>')             as child_profiles,
  (select count(*) from public.chat_messages where user_id = '<user-id>')        as chat_messages;
```

- **`purchases_access` greater than 0: stop.** Checkout isn't live yet (Phase 8), so this should be 0. If it isn't, the account has purchase records that may need to be kept for accounting and refunds. Don't delete; follow the Phase 8 retention rule (`docs/implementation/phase-8/REFUNDS-AND-SUPPORT.md`) or ask before continuing.
- Otherwise, continue.

## 3. Take a backup

Run the daily backup by hand so the deletion can be undone if it was a mistake:

```bash
launchctl kickstart gui/$(id -u)/com.mycuratedhaven.backup
```

Check `~/MyCuratedHavenBackups/backup.log` for `done:`.

## 4. Delete the account

Supabase → **Authentication → Users** → the user → **Delete user**.

What this deletes, in one step (verified by `supabase/tests/database/09_phase7_save_access.test.sql`):

| Deleted | How |
| --- | --- |
| Sign-in identity and sessions | Supabase Auth |
| `profiles` row | cascades from the user (migration `20260926150820`) |
| Saved recipes, recipe preferences | cascade |
| iOS-app data: children, child preferences, chats, conversation summaries, milestones, onboarding answers, daily tips, activity log | cascade from the profile |
| Search history, saved shop products | cascade |
| Shop click records | kept, with the user id removed (`SET NULL`) |

Before 2026-09-26 this step failed with `violates foreign key constraint "users_id_fkey" on table "profiles"`. If you see that error, the Phase 7 audit migration hasn't been applied to the database you're using.

Analytics (PostHog, only if the person accepted analytics) uses a random browser id, not the account, so there is nothing to delete there by account. If they ask, their browser id can be cleared by withdrawing consent in the footer.

## 5. Confirm

- Search the email again in Authentication → Users: no result.
- Reply from `support@mycuratedhaven.com`:

  > Your My Curated Haven account and the data linked to it (saved recipes and profile) have been deleted. If you sign in again with this email, a new, empty account is created. Nothing was sold or shared.

- Record the date and the request (not the person's data) in your support log.

## Not deleted

- Backups keep the data for up to 14 days (`~/MyCuratedHavenBackups/daily/`), then it's removed automatically.
- The support email thread itself.
