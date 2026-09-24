# Production readiness

## Configuration inventory

Record actual values in the approved secret/configuration store. Commit only variable names, environment labels, non-secret references and validation results. Never paste production credentials into a PR, issue, transcript or browser bundle.

| Area | Required record | Verification |
| --- | --- | --- |
| Hosting | Vercel project/team, app root, runtime, lockfile, build command, region and deployment ID | Build the production-target artifact and inspect its configured origin/version |
| Domain | `mycuratedhaven.com`, chosen www behaviour, TLS, DNS owner | HTTPS works, redirects are intentional, no loop or preview-origin canonical |
| Product DB | Existing parenting/product project, migration head, connection method and restricted role | Readiness query, role grants, access matrix and native compatibility |
| Public Supabase config | URL and publishable/legacy anon key names | Correct project, public keys only, no local fallback on hosted data clients |
| Commerce connection | Restricted server-only connection, pool settings, timeout and rotation owner | Connection works under minimum necessary privileges, no admin browser exposure |
| Stripe | Account/mode, genuine Product/Price, webhook endpoint/API version, secret references | Account/mode/amount/currency match approved offer and signature checks |
| Auth mail | Provider, sender, domain authentication, redirects and limits | Real authorised recipient delivery, bounce/rate-limit/error recovery |
| Customer messages | Receipt provider and access-message sender | No duplicate messages, useful owned-library link and support route |
| Rollout | Disabled/invited/open mode, policy version, eligible UUIDs and audited editor | Server rejects unauthorised creation and preserves existing owner access |
| Optional analytics | Browser/server flags, provider destination and consent version | Disabled by default until approved, no cross-environment export |
| Operations | Scheduler, monitor project, primary/backup, backup retention and budget | Independent job heartbeat, delivered alert and restore proof |

Use existing `.env` naming where implemented. Proposed rollout controls and scheduler values need implementation and documentation before operators use them. Do not write unimplemented environment variables into a runbook as though they already stop checkout.

## Hosting and domain preparation

Confirm the Git integration's actual behaviour. A push to main might automatically produce a production deployment. A GitHub merge and a production traffic promotion are distinct decisions, but the current host configuration might connect them. Inspect and record this before operational changes.

For a deliberate launch, prepare the supported production-target deployment with automatic domain assignment controlled through the approved host settings. Do not change those settings during this documentation task. Record the current production ID and eligible rollback ID before promotion.

Next.js public environment values are embedded in the build. A preview tested with test-mode values is not proof of the production configuration. If promotion triggers a rebuild or uses different variables, treat the resulting artifact as a new candidate and repeat environment/critical-path checks.

Do not advertise `www` and apex as separate products. Decide the canonical origin, verify both entry routes, and check auth callbacks, Checkout return URLs, print links and social previews. Defer unrelated DNS changes such as moving mail service unless needed for the approved launch.

## Supabase and migration preparation

Reuse the verified parenting/product project. Instagram automation stays separate. Record both project references and purpose so an operator does not run a recipe migration against Instagram data.

List pending migrations, expected schema/privilege changes and affected native clients. Compare hosted migration history with the repository. Rehearse against an isolated representative environment. Do not run local `db reset`, test seed or broad Phase 5 ingestion against production.

PR #19 adds newer legacy-read and sealing protections. Verify these are deployed and compatible with the parenting client before paid recipes go live. Table existence is not enough. Test explicit grants, RLS, views/RPCs, storage and the restricted commerce role.

PR #21 permits marketing pages to remain up without hosted Supabase configuration while recipe clients fail closed. Production readiness must therefore check actual catalog and auth dependencies. A green homepage monitor does not prove a working recipe product.

Review platform changes relevant to the target project at execution time. In particular, explicit Data API grants and RLS remain separate checks. Do not rely on historical automatic exposure defaults or change unrelated platform versions during launch preparation.

## Stripe readiness

Keep test keys and test objects in nonproduction. Create/configure live offer objects only from the approved commercial record and through the authorised execution workflow. Confirm merchant activation, permitted methods, descriptor, support details, refund administration and payout ownership.

Restrict checkout to the implemented and tested payment methods. A method with delayed confirmation requires delayed-event fulfilment and honest pending UI before enablement. Do not promise Apple Pay or Google Pay on every device simply because the provider supports them.

Verify webhook URL, subscribed events, API version, raw signature checks, expected account/mode and independent processing. Missing signature/configuration must fail closed. The current mock fallback and weak completion check are blockers, not production configuration shortcuts.

Use Stripe sandbox/test mode for payment tests. Stripe's testing guidance prohibits testing in live mode with real payment details. Do not make a staff self-purchase/refund as a QA step. Observe genuine customer transactions only after authorised launch, then use normal support/refund policy if a real issue arises.

## Auth and email readiness

Supabase's default SMTP service is intended for limited nonproduction use and restricts recipients. Configure a production-suitable sender and validate the provider's current limits. Keep exact limits out of customer promises.

Verify sender identity, SPF/DKIM/DMARC as appropriate to the chosen provider, approved reply-to/support routing, OTP expiry/resend behaviour and redirect allowlists. Test Gmail and another relevant mailbox using authorised recipients. Confirm links/codes are not consumed or exposed by analytics, logging or link tracking.

Auth delivery failure must not block anonymous free recipes. Protect OTP endpoints from abuse with server/provider limits and usable errors. During an auth incident, pause new paid acquisition if customers cannot establish/recover the required identity.

## Preflight result

Record each inventory row as verified, failed, blocked or not applicable with a reason. Attach candidate/version and evidence. Stop at missing production identity, unsafe payment paths, unapproved offer, absent recovery ownership or missing essential mail.

Primary references: [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Supabase changelog](https://supabase.com/changelog), [Stripe testing](https://docs.stripe.com/testing), [Vercel promotion](https://vercel.com/docs/deployments/promoting-a-deployment). Provider facts were checked on 2026-09-24 and need rechecking at execution.
