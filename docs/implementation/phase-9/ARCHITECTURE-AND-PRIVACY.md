# Architecture and privacy

## Three sources with separate purposes

| Source | Owns | Access boundary |
| --- | --- | --- |
| Parenting/product Supabase project | Recipes, accounts, entitlements and Phase 8 financial records | Existing product authorisation, private server reporting |
| Optional managed analytics project | Consented, minimised interaction events and behavioural dashboards | Restricted founder/engineering accounts |
| Instagram automation Supabase project | Existing social publication and metric records | Separate read-only reporting connection |

Do not move recipes or family records to Instagram automation. Do not give the public website an Instagram database credential. No cross-project database join is required for the initial weekly report.

## Provider recommendation

Use a small adapter around one managed event provider, with PostHog as the proposed default because the phase needs ordered funnels and return-usage analysis. Confirm current features, region, retention controls, deletion support and pricing before approving the account. No vendor purchase is part of this documentation task.

Use explicit events only. Turn off autocapture, automatic page/page-leave events, replay, surveys, identity enrichment and unnecessary SDK modules. Review SDK-added properties for full URLs, initial referrers, IP/location data and person profiles. Configure project-level IP exclusion and a final outbound property allowlist. Test the wire payload after initialisation and every SDK upgrade.

Do not build a new raw-event table in Supabase as a second analytics warehouse by default. A small private export outbox or ledger-derived report is justified for reliable business events. No analytics read or write is part of recipe authorisation.

## Consent behaviour

Recommended launch policy: optional product analytics stays off until a visitor accepts. This is a product default, not a claim about every jurisdiction's legal requirements. Record the final launch policy and provider disclosures before activation.

Use states `unknown`, `accepted`, `declined` and `withdrawn`. Before acceptance, do not initialise the analytics SDK, contact its endpoints, create optional IDs or persist campaign attribution. Keep a minimal preference value so the site remembers the choice. Do not record a decline by sending an analytics event.

On acceptance, begin collecting future activity. Reading the current registered campaign from the address bar is allowed under this proposed policy after acceptance. Do not replay earlier browsing. On withdrawal, stop capture, cancel queued sends, clear optional storage and propagate the change across tabs. Reacceptance starts a new optional identity.

A consented checkout attempt may temporarily retain its anonymous analytics association in the private order context. Recheck a server-side consent record before exporting delayed events. Provide a narrow consent-revocation endpoint bound to an unguessable browser consent token and, when relevant, the authenticated owner. Do not trust a posted boolean as proof of continuing consent. Remove pending optional associations on withdrawal. If reliable revocation cannot be implemented, defer server-to-provider purchase exports and use private ledger totals only.

Authenticating or paying does not opt someone into analytics or marketing. Necessary payment processing, support records and minimal security logs retain their separately documented purposes. Do not use those records to reconstruct a declined behavioural funnel.

## Identity and minimisation

Use random browser IDs without automatic account identification. No email hashing, customer-list matching or Instagram-handle matching. Recipe interactions linked to a random ID remain pseudonymous data and receive retention and access controls.

Only log canonical routes such as `recipes`, `recipe_detail` or `collection`, with separately validated content IDs. Authentication, payment-return and support URLs must never leak query parameters into provider defaults, application logs or error reports. Redact at both application and hosting layers where supported.

Do not export child profiles, birth dates, health information, precise diet/allergy choices, recipe bodies, support text, codes, cookies, signed URLs, access tokens or payment secrets. Count filter use without recording selected dietary values. Capture search result buckets without the query.

## Existing search analytics finding

The source migration `supabase/migrations/20251212000001_create_search_analytics.sql` creates `query` and `user_id` columns and a SELECT policy with `USING (true)`. This is a concrete source finding. Effective live exposure depends on grants, applied migrations and later changes, none of which this plan verifies remotely.

Implementation must check raw table access, GraphQL exposure, views, RPCs and native consumers. Prefer no new raw search collection. Where trending search functionality remains necessary, design a reviewed aggregate interface without user IDs or free text. Suppress small groups and verify the aggregate cannot be used to reconstruct individual searches.

Use a new forward migration, not edits to a previously applied migration. Inspect the installed CLI's help, generate migration files through the CLI, test a clean replay and refresh generated types when schema changes. Test grants as well as RLS. Private reporting functions and views must not become callable by `PUBLIC`, `anon` or ordinary authenticated customers. Do not solve access errors by broadly enabling privileged functions.

## Retention, deletion and access

Proposed optional analytics defaults: 90 days for identifiable raw events and browser IDs, 13 months for genuinely aggregate weekly statistics, with small-cohort suppression. Approve and verify enforceable provider settings before activation. If the selected plan cannot enforce these values, change provider or explicitly revise the policy before collection.

Keep financial record retention separate and define it with the business's operational requirements. Account closure in Phase 7 should remove optional account associations while preserving any required financial records under restricted access. A browser-scoped privacy request should also support deletion of optional analytics for its current identifier. Define how requests are verified without exposing other users' records.

Assign named administrators, least-privilege access and an owner for exports. No public dashboard links. Secrets belong in the deployment secret store. Public ingestion keys are not authorisation to financial data, but server admin keys must never use a `NEXT_PUBLIC_` variable. Separate staging and production projects and credentials.

## Failure isolation

Browser capture is best-effort. Optional queue pressure drops events rather than delaying rendering. Server analytics export follows the durable Phase 8 transition through an outbox or bounded ledger scanner. Analytics-provider delivery failures never roll back a paid order or block an entitlement.

Use a dedicated optional-analytics kill switch. Disabling it stops capture and exports, but leaves payment verification, access checks, refunds, reconciliation and sanitised operational monitoring running.

## Primary references checked during planning

- [PostHog privacy controls](https://github.com/PostHog/posthog.com/blob/master/contents/docs/product-analytics/privacy.mdx): IP controls and outbound sanitisation. Verify installed SDK configuration before coding.
- [PostHog autocapture configuration](https://github.com/PostHog/posthog.com/blob/master/contents/docs/privacy/_snippets/autocapture-web.mdx): disable automatic interactions.
- [Supabase Data API security](https://supabase.com/docs/guides/api/securing-your-api): grants and RLS both matter.
- [Supabase breaking changes](https://supabase.com/changelog?types=breaking-change): recheck API exposure defaults during implementation. Avoid obsolete management-log endpoints when adding operational reports.
- [Next.js usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname): client navigation integration.
- [Stripe fulfilment](https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted): server payment confirmation must survive a missing checkout return.
