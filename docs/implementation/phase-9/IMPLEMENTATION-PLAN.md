# Phase 9 implementation plan

## Delivery approach

Ship a small, trustworthy measurement system alongside the mobile-first recipe experience. Avoid building an analytics warehouse before the first collection has customers. Financial records remain authoritative even when a visitor declines optional product analytics.

Recommended first provider: one managed PostHog project per environment, with explicit events and optional tracking disabled until consent. This is an implementation recommendation, not an existing user decision or an instruction to purchase a plan. Confirm region, cost ceiling, retention and required controls before selection. Use the existing provider instead if the implementation inventory reveals an adequate approved setup.

App-relative targets below begin at `my-curated-haven-web/`. Proposed new paths are design targets. Reuse the actual Phase 6–8 component and service names when those implementations land.

## P9-01: inventory sources and agree the questions

Dependencies: Phase 4 project verification and current main.

Inspect `src/app/layout.tsx`, deployment configuration, package files, injected scripts, existing analytics tables, Phase 6 recipe routes, Phase 7 account actions and the eventual Phase 8 payment ledger. Source inspection found no analytics SDK in the app package or root layout. This does not prove the hosting layer has no tracking.

Confirm the product Supabase project separately from Instagram automation. Record project references and environments without credentials. Ask which decisions the founder needs weekly: acquisition, recipe usefulness, collection conversion, delivery reliability and return usage.

Deliver `docs/implementation/phase-9/IMPLEMENTATION-EVIDENCE.md` during implementation, recording the inspected commit, owner and source inventory. Do not label this planning package implementation evidence.

Acceptance: every proposed metric has an owner, source, unit, time window and known blind spot. No new recipe catalog or identity database is proposed.

## P9-02: resolve data exposure and collection policy

Dependencies: P9-01.

Audit `supabase/migrations/20251212000001_create_search_analytics.sql`. Its SELECT policy uses `USING (true)` over rows containing `query` and `user_id`. Verify effective grants, later migrations, views, RPCs and current hosted access using synthetic probes. The SQL comment describing aggregation does not enforce aggregation.

Trace existing native consumers before changing their contract. Prepare a forward migration removing broad raw-search access and replacing any needed trending surface with reviewed aggregates. Test anonymous access, cross-user access and native compatibility. Do not copy historical search strings into the new analytics provider.

Define optional analytics consent, retention, withdrawal, deletion and administrator access as described in [architecture and privacy](ARCHITECTURE-AND-PRIVACY.md). Update actual privacy wording to match delivered behaviour.

Acceptance: verified raw-search exposure is closed before analytics launch, or the affected endpoint is disabled with a documented native compatibility decision. Analytics cannot be enabled while this finding remains unexplained.

## P9-03: freeze the event contract

Dependencies: P9-01, P9-02.

Create `src/lib/analytics/events.ts`, `schema.ts` and `sanitize.ts`. Implement a discriminated event union with runtime validation, strict property allowlists, schema version and bounded strings. Preserve Phase 6's proposed event names where semantics agree.

Use [measurement and events](MEASUREMENT-AND-EVENTS.md) as the initial contract. Separate browser observations from server-confirmed business transitions. Use recipe UUIDs only after resolving the published recipe, never raw search text or arbitrary URL values.

Acceptance: invalid event names, extra fields, oversized payloads, raw query strings, emails and token-bearing URLs fail validation. Every event has exactly one responsible producer.

## P9-04: implement consent and the provider adapter

Dependencies: P9-02, P9-03 and Phase 3 components.

Targets: `src/lib/analytics/client.ts`, `provider.ts`, `consent.ts`, `src/components/analytics/AnalyticsProvider.tsx`, `ConsentPreferences.tsx`, `src/app/layout.tsx` and the existing footer/privacy page.

Provide accept, decline and a persistent preferences control. Keep free reading, printing, sign-in and payment available with tracking declined. Load the provider only after acceptance. Disable automatic page views, automatic interactions, session replay and automatic error capture. Inspect all default SDK properties, not only custom event fields.

Keep an environment-specific enable switch, separate project keys, a network timeout and a bounded in-memory queue. Do not replay activity from before consent. Withdrawal clears queued events and optional identifiers across open tabs. Provider failures never fail a user action.

Acceptance: browser network and storage evidence proves zero optional tracking before acceptance and after withdrawal. Local development and previews never send to the production project.

## P9-05: instrument the free recipe journey

Dependencies: P9-03, P9-04 and implemented Phase 6.

Add events at meaningful UI boundaries: committed page navigation, rendered recipe list, rendered accessible recipe detail, submitted search, applied filters and explicit print request. A prefetched URL, server render, hover or skeleton is not a view.

Use canonical route keys rather than complete URLs. Read the current Next.js navigation API when implementing. Deduplicate effect reruns without suppressing a genuine later visit. Result counts are bucketed. Search strings and selected allergy/diet values are excluded.

Acceptance: one intentional navigation produces one relevant event in both development strict mode and production. Native browser print shortcuts remain an acknowledged measurement gap. All three free recipes still work without analytics.

## P9-06: instrument accounts and saved recipes

Dependencies: P9-04 and implemented Phase 7.

Track the sign-in flow opening, confirmed authentication, and confirmed save/remove responses. Sign-in success includes returning accounts, so do not report this count as new registrations. Never capture email inputs, codes, tokens or child data.

Initial analytics identity is a random consented browser identifier. Do not call account-identification or alias APIs by default. Reset optional identity on sign-out to avoid carrying the previous account's activity across a shared device. Cross-device retention remains out of scope.

Acceptance: cancelled authentication, failed saves and optimistic UI updates do not count as successful actions. Analytics errors do not change Phase 7 state.

## P9-07: integrate verified payment outcomes

Dependencies: P9-03 and implemented, validated Phase 8.

Agree ledger fields and hooks with Phase 8 before coding: order identity, checkout attempt identity, immutable collection release, currency, captured amount, successful refund records, payment timestamp and entitlement activation timestamp.

Record checkout-session creation and purchase confirmation on the server. Count payment only after Phase 8 validates provider state and commits the order transition. A successful return-page render is not payment proof. Keep access activation separate so paid-but-locked orders remain visible.

Use a transactional outbox or an equivalent durable ledger scan to export eligible analytics. A unique business transition key deduplicates retries. Export only consented, attributable events to the optional provider, rechecking withdrawal before delivery. The private financial report includes every valid order regardless of optional tracking. Analytics delivery must not gate fulfilment.

Acceptance: duplicate webhooks, concurrent delivery, delayed payment and a customer never returning from Stripe each produce one confirmed order. Browser-forged purchase events never enter authoritative reports. Refunds preserve the original sale and add separate successful adjustments.

## P9-08: connect Tiny Soho campaigns

Dependencies: P9-03, P9-04 and verified Instagram project access for the reporting portion.

Implement the allowlisted campaign registry and tagged links in [Instagram attribution](INSTAGRAM-ATTRIBUTION.md). Keep attribution session-scoped for the initial release. Transfer consented campaign context to the server when an order attempt is created. Treat the context as untrusted marketing metadata, never payment authority.

Start with a reviewed aggregate export from the separate Instagram database. If a repeatable read-only job is already available, reuse its export contract. Build a scheduled integration only after verifying source tables, metric meanings, access and freshness.

Acceptance: an Instagram in-app-browser journey retains its registered campaign through sign-in and checkout when consent allows. Missing attribution remains unknown. No Instagram database key reaches the website browser or recipe runtime.

## P9-09: build four private reporting views

Dependencies: P9-05 through P9-08 as their features become available.

Deliver acquisition, recipe usefulness, commerce/delivery and return-usage views using [dashboards and decisions](DASHBOARDS-AND-DECISIONS.md). Use managed analytics dashboards for behavioural data and restricted ledger reporting for all-order totals. A weekly report links these sources without merging customer-level datasets.

Include date range, timezone, currency, sample size, collection release, observation coverage and freshness. Show unavailable sources as unavailable, not zero. Do not build a public `/admin` page or grant broad database access for convenience.

Acceptance: a founder can answer which campaign brings engaged recipe readers, where the consented funnel drops, how many orders actually paid and whether access was delivered.

## P9-10: add data quality and operations

Dependencies: P9-07, P9-09.

Create scheduled reconciliation and sanitised operational counters for rejected events, export backlog, successful orders without entitlements and source freshness. Reconcile ledger orders to Stripe records for the same environment, currency and time basis. Report provider export coverage separately from all-order completeness.

Use existing platform monitoring where sufficient. Set a provider spend ceiling and cardinality limits. Record an owner and response steps for an alert. A lack of browser events alone is not proof of a site outage.

Acceptance: a deliberately missing export is detected and safely replayed without double counting. An analytics outage leaves checkout and access operating normally.

## P9-11: verify and release progressively

Dependencies: all relevant preceding tasks.

Implement the focused matrix in [validation and release](VALIDATION-AND-RELEASE.md). Run existing web and backend CI checks on the implementation commit. Test mobile Safari, Chromium and Instagram's in-app browser. Inspect actual outgoing request bodies, including SDK defaults and logs.

Roll out free recipe measurement first, account measurement second and payment reporting once Phase 8 passes. Keep disabled features labelled pending. Use test-mode financial fixtures and separate staging analytics.

Acceptance: no personal or recipe-body data leaks, no production contamination, no checkout regression and no undocumented missing events. Disabling optional tracking preserves business records.

## P9-12: establish the review cycle and hand off

Dependencies: P9-09 through P9-11.

For the first four weeks, review acquisition quality, free recipe engagement, purchase/access outcomes and returning usage once a week. Write the question, observed counts, uncertainty, proposed change, owner and next review date. Change one meaningful part of the funnel at a time.

Document results in implementation evidence and hand operational checks to Phase 10 launch QA and Phase 11 operations. Phase 12 parenting expansion requires demand evidence beyond a few clicks or Instagram likes.

Acceptance: report definitions are reproducible, source owners are assigned, one complete review has been rehearsed with labelled fixtures, and the first real review is scheduled by the team. This plan does not create a scheduled automation.
