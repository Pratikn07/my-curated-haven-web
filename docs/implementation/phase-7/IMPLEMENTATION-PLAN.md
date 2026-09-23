# Phase 7 detailed implementation plan

## Goal

Add optional accounts and saved recipes to My Curated Haven. Preserve the three complete free recipes without authentication. Build on existing parenting-app identities, recipe IDs and saved records where verified compatibility permits.

Reviewed baseline: web commit `f646bea756f75d1c9e8b7dbf42dab682005db7ec`. The Next.js application lives in `my-curated-haven-web/`. File targets below are proposed unless identified as existing. Verify Phase 4 and Phase 6 implementation status before coding against their contracts.

## P7-01: inventory identity and saved data

Dependencies: Phase 4 project verification.

Inspect the existing auth project, provider configuration, profile triggers, saved_recipes relation, recipe mapping and policies. Use the [source findings](EXISTING-ACCOUNTS-AND-DATA.md) as the starting point. Record source and web identities, migration ownership and native compatibility requirements.

Do not inspect unrelated child or Instagram data. Use aggregate schema facts and synthetic users for verification rather than exporting personal records.

Deliverable: a source-reuse decision record, including any justified divergence.

Acceptance: the account authority and saved-data source are unambiguous. Existing users retain a supported path to their identities. No new auth project or duplicate favourites table appears without a documented need.

## P7-02: define UX and route contracts

Dependencies: P7-01, Phase 3 components and Phase 6 recipe routes.

Specify /sign-in, /account and /account/saved-recipes. Add /auth/callback only for enabled providers requiring a callback. Choose email code as the proposed default after compatibility review.

Define signed-out, verification-pending, signed-in, expired, throttled and service-error states. Define Save, Saved and Remove wording. Use the existing theme, input, button, status and dialog patterns.

Acceptance: free browsing never redirects to sign-in. Save explains why an account is useful. Account creation discloses its purpose and does not imply a purchase or marketing subscription.

## P7-03: implement request-scoped auth and protected reads

Dependencies: P7-01 and implemented Phase 4 client foundation.

Suggested targets: app src/lib/supabase server/browser helpers, src/lib/auth/session.ts and existing src/proxy.ts. Reuse actual Phase 4 file names instead of duplicating helpers.

Expand proxy coverage for chosen auth routes while preserving deferred-route and design-review restrictions. Verify identity at protected server reads and mutations. Preserve cookie refresh and private cache headers on final responses.

Acceptance: anonymous account requests redirect safely, invalid sessions fail closed and cross-user requests remain isolated. Public recipe content still works during auth-service failure. No session token appears in page props or shared caches.

## P7-04: implement sign-in and transactional email

Dependencies: P7-02 and P7-03.

Suggested targets: app src/app/sign-in/page.tsx, src/app/sign-in/actions.ts and src/components/auth/. Add callback handling only if needed by enabled providers.

Build email entry, code verification, resend, change-email and successful-return flow. Configure a production-capable sender and rate limits through the documented environment process. Treat global email-template changes as native-compatibility changes.

Acceptance: new and existing synthetic users complete the flow. Wrong, expired and reused codes show recoverable errors. Delayed delivery, throttling and provider downtime have truthful states. Supported existing-provider users retain access.

## P7-05: establish saved-recipe persistence and policies

Dependencies: P7-01 and implemented Phase 4 schema/access boundary.

Reuse the deployed saved_recipes relation where suitable. Add only verified missing constraints, grants, indexes or compatible policies through the authoritative migration process. Preserve source IDs and existing saved timestamps.

Create a minimal metadata read projection. Scope every operation to verified identity. Make Save and Remove idempotent. Keep recipe-body access separate.

Acceptance: two users cannot read or mutate each other's rows through direct API or server routes. Duplicate saves create one record. Repeated removal succeeds. Draft/paid bodies never appear through nested saved-list queries. Native compatibility checks pass before shared policy changes.

## P7-06: add reliable Save controls

Dependencies: P7-03, P7-05 and Phase 6 recipe cards/detail pages.

Suggested targets: app src/components/recipe/SaveRecipeButton.tsx and src/lib/saved-recipes/actions.ts.

Place the button outside the recipe title link. Provide an accessible state and label. Prefer confirmed server state for the initial release. During a request, show progress and prevent duplicate in-flight actions for the same recipe.

Signed-out Save opens sign-in with a short-lived intended recipe reference. After successful sign-in, return to the recipe and ask for an explicit Save confirmation. Do not write a bookmark merely because a URL contains a recipe ID.

Acceptance: failed writes never display success. Session expiry prompts sign-in. Account switching clears pending intent and cached results. A late response from a previous user never changes the active user's UI.

## P7-07: build the private saved-recipes page

Dependencies: P7-05 and P7-06.

Suggested targets: app src/app/account/saved-recipes/page.tsx, loading/error UI and saved-card components.

Show approved public metadata for owned saved references, ordered newest first with stable ID as tie-breaker. Reuse Phase 6 cards without selecting full protected bodies.

Provide loading, empty, error, populated and unavailable-recipe states. Removal works for unavailable items. Add pagination only when needed, with server-scoped filtering over the complete owned set.

Acceptance: a saved recipe appears after refresh and on another signed-in device. Empty state links to free recipes. A backend outage shows Retry. Previously saved but nonpublic native recipes reveal no private title or body.

## P7-08: add minimal account settings and lifecycle

Dependencies: P7-03 and P7-04.

Suggested targets: app src/app/account/page.tsx and account action components. Add optional name editing only if profile policies and use cases justify the field.

Show the verified account email, Saved recipes, Sign out and Support. Add a clearly scoped account-closure request flow, with fresh authentication and owner verification before processing.

Default to support-assisted closure until shared native/web deletion scope is established. Do not expose a delete-auth-user button with an unknown cascade. Document an executable operator runbook before public account launch.

Acceptance: sign-out clears private UI state. Account closure describes which services and data are affected. No client controls roles, purchase flags or another user's identity. Missing optional profiles do not block recipe access.

## P7-09: integrate navigation and privacy boundaries

Dependencies: P7-06 through P7-08.

Targets: existing navigation config, mobile navigation, public-site tests and account route metadata.

Add Sign in or Account as appropriate after account release gates pass. Keep public recipe navigation and saved-list access easy to find. Exclude private account and auth routes from the public sitemap and mark them noindex.

Update public-site tests deliberately: existing account-route exclusions need the new intended contract, while deferred-page restrictions remain.

Acceptance: desktop and mobile navigation reflect current auth state without private shared-cache output. Keyboard users reach all actions. Privacy/support copy matches actual storage and account behaviour. No prechecked marketing consent appears.

## P7-10: verify security, failure paths and release

Dependencies: all prior tasks.

Run the [validation matrix](VALIDATION-AND-RELEASE.md). Exercise two synthetic accounts, expiry, cross-user requests, code failures, rapid repeated saves, unavailable content and shared-browser account switching.

Run lint, typecheck, production build and the required browser checks on the exact PR head. Review the protected preview, then enable account entry points through the existing release mechanism.

Acceptance: required CI passes, direct-access isolation tests pass and email delivery works for designated test inboxes. Record implementation evidence with commit, environment, results, native compatibility and rollback. Never mark implementation complete based only on this plan.

## Delivery slices

| PR | Scope | Gate |
| --- | --- | --- |
| A | P7-01 through P7-03 | Identity/source decision and SSR isolation |
| B | P7-04 and P7-05 | Verified sign-in and owner-only persistence |
| C | P7-06 through P7-08 | Reliable save/list/account flows |
| D | P7-09 and P7-10 | Navigation, regression evidence and controlled release |

Adjust slice boundaries to actual dependencies. Keep public signup disabled until email and account operations are ready.

## Definition of done

A parent reads a free recipe anonymously, chooses to sign in, saves the recipe, finds the same bookmark on another device and removes the bookmark successfully. Other users' data stays private. The existing native account model remains compatible. Saving never changes payment or recipe-access rights.
