# Recipe access, printing and security

## Access matrix

The existing Phase 4 RLS remains the last line of defence for caller-scoped recipe reads. UI state supplements database enforcement and never replaces it.

| Caller | Published preview | Three free bodies/print | Paid bodies/print | Orders | Entitlement writes |
| --- | --- | --- | --- | --- | --- |
| Anonymous | Yes | Yes | No | No | No |
| Signed-in nonbuyer | Yes | Yes | No | Own minimal status DTOs only | No |
| Active owner | Yes | Yes | Members supported by active sources | Own minimal DTOs | No |
| Refunded/revoked owner with no other valid source | Yes | Yes | No | Own historical status | No |
| Owner with another valid source | Yes | Yes | Allowed by remaining source | Own historical status | No |
| Closed/disabled account | Public view only | Yes | No private access | Supported recovery process only | No |
| Commerce worker | Minimum metadata needed | Not needed | No routine body access needed | Restricted ledger role | Narrow projection operation |

Test draft, withdrawn, future-valid, expired and retired-release cases separately. Retirement from sale is not the same as withdrawing a recipe for a safety/content issue.

## Release and content lifecycle

Freeze manifest membership before payment. Use non-null `sealed_at` as a permanent marker even while release state is `published`. Guard both old/new parents on membership UPDATE and lock parent release rows during mutation. Protect the marker and parent identity/state from rollback into editable draft.

Reject deletion of a sold release, approved commercial offer or needed audit record. Block cascades through collection/recipe parent deletion. Mark products retired for new sales instead. An active entitlement must continue reading the retired release's authorised content.

Recipe bodies remain tied to existing source UUIDs. Reviewed corrections increment the body version, preserve revision evidence and update authorised reading/printing. Release membership does not change silently. Withdraw unsafe or invalid content through an explicit content hold, show an explanation to affected owners and resolve through replacement or refund according to the approved promise. Never use content withdrawal to erase purchase history.

## Legacy audit

Inspect `public.recipes`, joined saved-recipe queries, views, RPCs, GraphQL, server routes, exports and storage objects. Record effective grants and every policy, including permissive combinations. A restrictive new policy does not negate an older permissive policy combined with OR semantics.

Remove broad body access through forward migrations while preserving the native app's supported identity and saved recipe references. Where native clients previously accessed full rows, introduce a compatible authorised projection and deploy in a coordinated order. If a client update is required, identify the supported versions and migration gate before sale launch.

Also review the Phase 9 `search_analytics` finding before promoting the shared product database publicly. Do not fix one access table through a blanket grant across the schema.

Public recipe previews are intentional. Some source recipes might already have appeared on Tiny Soho or public sites. Do not claim secret/exclusive content or technical control over copies already published. Security tests establish current application access boundaries, not retroactive secrecy.

## Server and browser boundaries

Use Phase 7 verified identity on every private handler. Validate ownership against the ledger rather than a supplied user ID. Keep separate typed results for free, entitled, denied, not found and unavailable. Suppress purchase CTAs on unavailable ownership instead of treating an outage as a nonbuyer.

Account disabling must also remove paid access for direct API/storage requests using an otherwise unexpired token. Coordinate the entitlement/source hold with the authoritative Phase 7 account-status mechanism and database policies. A frontend account check alone does not enforce this requirement. Test stale access tokens explicitly. Ordinary local sign-out and account closure have different revocation guarantees.

Use caller-scoped Supabase reads for recipe bodies so RLS checks the current user. Do not query paid bodies with a service key and hide them later in JSX. Public product DTOs include approved summaries and safe preview paths only. Validate ingredient/instruction structures at ingestion and before use, rather than relying only on TypeScript casts.

Order status routes are authenticated, rate-limited and owner-filtered before returning data. Other-owner and nonexistent IDs produce the same neutral result. Mutations use POST and origin/CSRF controls. Provider webhook authentication remains isolated to its signature boundary.

## Caches and indexing

Public caching is limited to safe catalog/sales metadata and the three complete free recipes. Paid bodies, account/library pages, status responses and session-bearing redirects are private/no-store. Apply headers to the final response, including refresh cookies and redirects.

Test CDN caches, server fetch caches, React server component payloads, router prefetch, browser Back and account switching. Do not statically generate paid bodies, embed them in public JSON-LD, expose full instructions in search metadata or ship them inside client bundles/test fixtures.

Public collection previews are indexable only when approved. Private account/checkout/order pages are noindex and absent from sitemaps, but indexing directives do not grant protection. Direct URL access still requires authorisation.

## Printing and protected assets

Printing uses the same authorised body as reading. A separate print route repeats the access check. Hiding a print button provides no security. Printed content should include the correct recipe version, brand and approved notes, with no account identifiers or payment details.

Keep full paid PDFs/files out of `recipe-previews`, Next.js `public/` and public CDN URLs. For assets in `recipe-protected`, authorise the current caller before issuing a signed URL. Proposed maximum URL lifetime is five minutes, subject to supported SDK/configuration and user experience testing. Account for expiry during downloads.

Signed URLs are bearer links until expiry. Revocation stops future URL issuance but does not retract a previously issued unexpired link or downloaded file. If immediate revocation is required by the approved policy, use an authenticated streaming route with fresh checks instead of relying on signed links.

Do not send permanent public download URLs in receipts. Account-bound library links are sufficient. A whole-book PDF introduces separate rendering, versioning and storage work and is not required for initial print support.

## Secrets and auditing

Stripe keys, signing secrets, commerce database credentials and privileged Supabase keys are server-only. Keep configuration in the secret store, rotate with a tested overlap plan and exclude values from build logs. No secret uses a `NEXT_PUBLIC_` prefix.

Log order support reference, correlation ID, event ID, reason code and outcome only as needed. Restrict provider IDs to operational access. Never log full checkout URLs, raw request bodies, tokens, email addresses, billing details or card data by default. Redact error objects from provider/DB libraries before logging.

Test private-schema grants, default privileges, function EXECUTE access, storage policies and aggregate/reporting exposure after each migration. [Supabase's Data API security guide](https://supabase.com/docs/guides/api/securing-your-api) distinguishes grants from row policies. [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) supports the boundary review. Recheck installed versions and current platform changes during implementation.
