# Admin recipe console operations

Console permissions are stored in `private.admin_memberships`, separate from the legacy `public.user_roles` recipe inspection role. Client metadata and JWT role claims cannot grant console authority. Every private request requires a current membership and `aal2`. Enable TOTP enrollment and verification in the hosted Auth settings before activation; never push the local Supabase config to the hosted project.

The server flag `ADMIN_CONSOLE_ENABLED` and database stage must both permit an action. Database stages are `disabled`, `inspection`, `editing`, and `publication`. Start disabled. Inspection includes owner Team management; editing adds private drafts; publication adds human review, publish and withdrawal. Disable the database stage as well as the application flag during rollback.

## Bootstrap one owner

Use the restricted database operator connection through existing secure configuration. Supply `owner_user_id` as a psql variable for a confirmed Auth account that you have independently verified. Do not put credentials, email addresses or real UUIDs in source or shell history. This transaction refuses a second active owner and records the bootstrap event. Never bootstrap from a browser or a customer-facing endpoint.

```sql
BEGIN;
SELECT set_config('admin.bootstrap_uuid', :'owner_user_id', true);
DO $$
DECLARE owner_id uuid := current_setting('admin.bootstrap_uuid')::uuid;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=owner_id AND email_confirmed_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Confirmed account required';
 END IF;
 IF EXISTS (SELECT 1 FROM private.admin_memberships WHERE role='owner' AND active) THEN
  RAISE EXCEPTION 'An active owner already exists';
 END IF;
 INSERT INTO private.admin_memberships(user_id,role,granted_by,reason)
 VALUES(owner_id,'owner',owner_id,'Reviewed operator bootstrap');
 INSERT INTO private.admin_audit(actor_id,action,request_id,after_ref,reason,result)
 VALUES(owner_id,'owner.bootstrap',gen_random_uuid(),owner_id::text,'Reviewed operator bootstrap','success');
END $$;
COMMIT;
```

Owner membership cannot be removed or downgraded through Team or ordinary SQL update/delete. A future ownership transfer needs a separately reviewed recovery procedure; do not disable protection triggers to perform routine staff management. Team only assigns existing confirmed accounts. An ambiguous exact email match requires restricted operator identity resolution. It never sends invitations.

## Local tests

Use an owned local Supabase stack for tests. `node my-curated-haven-web/scripts/test-admin-db.mjs --workdir <owned-local-project> 11_admin_console_access.test.sql 10_recipe_admin_access.test.sql` bundles the rollback-only SQL fixture into pgTAP inputs, since the CLI test container does not copy sibling fixture directories. It uses `--local` and accepts no linked or remote database option. Never reset a stack that contains personal data.

## Browser fixtures

Admin browser specs run against the owned stack with real Auth users (never the default stack, never production):

- Build and start the app pointed at the owned stack (`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54341`,
  `COMMERCE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54342/postgres`).
- Provide `SUPABASE_SERVICE_ROLE_KEY` (local test key) and `ADMIN_TEST_DATABASE_URL` (loopback Postgres URL) in the
  environment. Fixtures refuse non-loopback targets and fail with a clear message when keys are missing.
- Run admin specs serially on one worker:
  `npx playwright test tests/e2e/admin-access.spec.ts tests/e2e/admin-inspection.spec.ts tests/e2e/admin-privacy.spec.ts --project=chromium-desktop --workers=1`.
  Parallel workers would violate the singleton active-owner invariant.
- The privacy spec needs an instrumented build: `NEXT_PUBLIC_ANALYTICS_ENABLED=true NEXT_PUBLIC_APP_ENV=staging
  NEXT_PUBLIC_POSTHOG_KEY=test-key-staging NEXT_PUBLIC_POSTHOG_HOST=http://127.0.0.1:54349/sink` (loopback sink
  intercepted by Playwright; nothing listens there).
- Two build profiles are required for a fully green desktop suite: the analytics, public-site deferred-text and
  stories analytics specs assume the default build (no remote SDK), while only the privacy positive control needs
  the instrumented build. The admin specs pass on either profile.
- OTP specs read mailpit at `http://127.0.0.1:54324`. When several local stacks run side by side, this stack's
  inbucket may land on another host port; relay it (e.g. a localhost TCP forward 54324→actual) for those specs.
- Fixture users, memberships and synthetic recipes are removed on dispose; the append-only audit log is intentionally
  retained, so the pgTAP audit assertion is baseline-relative.

Append-only audit records carry actor, action, target references, operation ID and result. They do not contain recipe snapshots, credentials, payment identities or Auth payloads. Restricted operators remain responsible for selecting a verified account and recording a truthful reason.

## Publication operations

Publishing needs an approved revision, a fresh (≤60s) asset-availability check, the frozen impact token echoed back unchanged, a trusted campaign snapshot, and zero unresolved blockers or sealed/live/pending/historical/campaign exposure. The confirmation dialog states the version, changed fields and affected releases/campaigns before the operator confirms with a reason.

After a committed publish or withdraw, the console revalidates public/admin routes (refresh-only). If the refresh fails, the write stays saved and the receipt reports `pending`; the retry button revalidates displays only and never republishes. Failed attempts are recorded separately in the failure audit (`failure.<action>` with code and request reference) after the rolled-back transaction.

Ordinary withdrawal is blocked by sealed or commercial exposure. Emergency withdrawal is owner-only, requires the acknowledgement checkbox, and does not refund purchases or change customer rights. Withdrawing never deletes drafts, revisions, archives or audit rows; republishing uses a new reviewed revision.

## Release package (Phase 1 admin workspace)

- Source: branch `codex/admin-recipe-workspace-design` (release SHA recorded at sign-off; Task 13 landed as `44eba2a`).
- Migrations, in order: `20261005000100_admin_console_access`, `20261005000500_admin_recipe_reads`, `20261005001000_admin_recipe_revisions`, `20261005001100_admin_draft_operations`, `20261005001200_admin_asset_checks`, `20261005001500_admin_reviews`, `20261005001600_admin_review_state`, `20261005002000_admin_publication`, `20261005002100_admin_failure_audit`, `20261005002200_admin_lock_timeout`. Replay verified locally with `supabase db reset`; types verified drift-free with `supabase gen types`.
- Configuration: server flag `ADMIN_CONSOLE_ENABLED` plus database stage (`disabled` → `inspection` → `editing` → `publication`); bootstrap one confirmed owner per the procedure above; record the deployed campaign revision/hash through the restricted operator procedure.
- Rollback: disable the database stage and the server flag, confirm direct RPCs stop, and verify public/customer access still works. Drafts, revisions, archives and audit rows are retained; published content stays as-is until a new reviewed revision corrects it.
- Production execution and the deployed journey check require separate release authorisation and are out of implementation scope.
