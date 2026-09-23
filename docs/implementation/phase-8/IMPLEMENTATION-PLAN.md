# Phase 8 detailed implementation plan

## Working rules

Deliver the paid recipe product on the existing Next.js and Supabase foundation. Reuse recipes, identity, design components and printing. Stripe supplies the hosted payment form. My Curated Haven owns the product promise, account binding, order record and access decision.

Eighteen tasks follow. Each task lists dependencies, work, proposed targets and acceptance. Paths beginning `src/` or `tests/` are relative to `my-curated-haven-web/`. Proposed services are design targets, not claims about existing implementation.

## P8-01: verify baseline, environments and existing rights

Dependencies: Phase 4 source and access to read the intended product environment.

Confirm repository SHA, installed packages, deployed frontend, product Supabase reference, applied migrations, storage buckets, auth providers, native consumers and existing purchase rights. Keep Instagram automation separate. Compare source findings G01–G08 with live effective access using designated fixtures, never unrelated customer records.

Targets: new implementation evidence file and environment inventory, existing Phase 4/7 handoff records.

Acceptance: one verified product project and identity model, documented deployment ownership, current native access contract, no assumption based solely on a connected Instagram project. Unverified facts remain explicit blockers.

## P8-02: close product decisions and approve the paid manifest

Dependencies: P8-01 and Phase 5 editorial mapping.

Complete C01–C14 in [commercial decisions](COMMERCIAL-DECISIONS.md). Review exact existing recipe IDs, contents, quantities, instructions, yield, notes, images and print layout. Record free overlap. Decide price, currency, access conditions, refund process and future additions. Review sales copy against the approved manifest.

Targets: versioned collection manifest, commercial configuration and policy records.

Acceptance: a named release and immutable commercial snapshot with no invented recipe count, price or lifetime promise. Test fixtures are labelled and excluded from production publication.

## P8-03: harden catalog and release boundaries

Dependencies: P8-01, proposed P8-02 manifest.

Resolve G01, G02, G05 and G07. Add permanent freeze-marker enforcement, OLD/NEW release checks, transaction locking, parent-deletion restrictions and safe public previews. Audit legacy tables, APIs, exports and storage. Agree native compatibility before changing legacy grants. Prevent paid content entering public build output or metadata.

Targets: forward migrations under `supabase/migrations/`, `supabase/tests/`, existing data queries and content validation.

Acceptance: both anonymous and signed-in nonbuyers fail direct paid-body reads through every supported path. Frozen membership rejects moves, deletions, resequencing and publication races. Three complete free recipes still work anonymously.

## P8-04: add the private commerce ledger and access provenance

Dependencies: P8-01, P8-03 and [payment data](PAYMENT-DATA-AND-STATES.md).

Create private order, payment observation, refund, dispute, inbox, access-source and side-effect records with explicit constraints. Reuse the current public entitlement table as a read projection. Backfill existing legitimate access with verified provenance. Separate account deletion from financial record deletion.

Generate migrations through the installed Supabase CLI, validate via clean replay, refresh generated types and run grant/RLS tests. Recheck relevant current Supabase docs and security advisors before hosted rollout.

Targets: private schema migrations/tests, `src/lib/payments/types.ts`, `repository.ts` and generated database types.

Acceptance: unique provider/session/payment references, one unresolved checkout reservation per user/release, no client commerce writes, no public financial reads, auditable per-source access and transactionally consistent projections.

## P8-05: configure Stripe and fail-closed environment validation

Dependencies: P8-02 for live values. Sandbox setup proceeds with fixtures.

Verify Stripe business/account identity, supported payment methods, payout readiness, receipt identity and approved commercial settings. Create distinct sandbox/live Product and one-time Price mappings. Pin Stripe server SDK and API/event versions. Record required server-only secrets and separate webhook secrets per environment.

Targets: `src/lib/payments/config.ts`, `stripe.ts`, `.env.example`, locked dependencies and deployment configuration documentation.

Acceptance: startup/readiness checks reject wrong provider account, mode, missing secrets, recurring prices, unsupported currency or unapproved release. No real secret is committed or browser-exposed. Checkout stays disabled by default.

## P8-06: deliver collection sales and ownership states

Dependencies: Phase 3 components, implemented Phase 6, P8-02 and P8-03.

Build the collection detail page using existing cream, terracotta and sage tokens. Show exact contents, sample links, one-time price and policy summary. Render sign-in-to-buy, buy, preparing checkout, already owned, unavailable and retired-sale states. Read ownership privately and distinguish lookup failure from no ownership.

Targets: `src/app/collections/[slug]/page.tsx`, existing recipe locked-preview UI and `src/components/commerce/`.

Acceptance: accurate mobile copy, keyboard/screen-reader support, no body leakage, no purchase button for already owned or unknown ownership. A collection's removal from sale does not remove buyer access.

## P8-07: bind checkout to verified Phase 7 identity

Dependencies: implemented Phase 7 and P8-06.

Use existing sign-in/session helpers and safe return paths. Require a current verified account before purchase. Bind the order to the server-derived auth UUID and display the intended account before leaving the site. Never infer owner from Checkout email, client metadata or a redirect parameter. Confirm native account continuity.

Targets: existing Phase 7 sign-in return flow, `src/lib/payments/identity.ts`, account eligibility checks.

Acceptance: account A creates only account A's order, session expiry prompts recovery, account switching clears stale checkout state, and no duplicate account is created to restore an existing purchase.

## P8-08: implement retry-safe Checkout Session creation

Dependencies: P8-04, P8-05 and P8-07.

Implement authenticated POST checkout with strict origin/CSRF protection, rate limits, approved price lookup, fixed quantity, permanent commercial snapshot and a database reservation. Reserve before calling Stripe, reuse the idempotency key for the same attempt and handle unknown provider outcomes before creating a replacement.

Targets: `src/app/api/checkout/route.ts`, `src/lib/payments/checkout.ts`, order repository and request tests.

Acceptance: two tabs/double clicks create one active attempt. Network timeouts do not create a second charge opportunity. Client-supplied amount, currency, owner, return URL or Price ID never controls the Session. See [checkout implementation](CHECKOUT-IMPLEMENTATION.md).

## P8-09: receive webhooks durably and run a recoverable worker

Dependencies: P8-04 and P8-05.

Verify signatures over raw request bytes, validate account/mode/version, store a minimal event envelope and acknowledge only after durable receipt. Implement a leased worker with retry/backoff, dead-letter status and a scheduled repair path. Verify the deployment platform supports the chosen schedule and runtime. Do not depend on work continuing after an HTTP response.

Targets: `src/app/api/stripe/webhook/route.ts`, `src/lib/payments/inbox.ts`, `worker.ts` and a protected worker entry point.

Acceptance: invalid signatures reject, duplicate events deduplicate, DB outage returns retryable failure, a worker crash recovers, and no unauthenticated caller triggers arbitrary payment processing.

## P8-10: verify payment and project access atomically

Dependencies: P8-03, P8-04 and P8-09.

Retrieve canonical provider objects, validate the order binding and commercial snapshot, serialize processing per order, persist payment/refund/dispute facts and recompute eligibility. Update the existing user/release entitlement and append an audit record in one database transaction. Insert side-effect outbox entries in the same commit.

Targets: `src/lib/payments/fulfilment.ts`, private transaction functions and access-source projector.

Acceptance: successful payment yields one valid access source even if the customer never returns. Repeated/out-of-order events do not duplicate grants or restore a refunded order. Two valid sources are handled correctly. A bad price or owner binding enters review without exposing content.

## P8-11: implement return, cancellation and recovery states

Dependencies: P8-08 and P8-10.

Build owned return pages showing verifying, paid/ready, paid/access pending, payment processing, unpaid/expired, review required and unavailable. Query only the signed-in owner's order. Use bounded polling and a server-verified refresh path. A cancel URL is a navigation event, not a financial fact.

Targets: `src/app/checkout/return/page.tsx`, `src/app/checkout/cancel/page.tsx`, owned status/refresh handlers.

Acceptance: a forged Session ID reveals nothing, delayed webhooks produce honest pending copy, losing the browser does not lose access, and a confirmed payer never receives an automatic “pay again” prompt during recovery.

## P8-12: deliver purchased library, reading and printing

Dependencies: implemented Phase 6/7, P8-03 and P8-10.

List owned collections, preserve access to retired sales releases and reuse recipe pages/print layouts. Authorise every body and asset request under the current caller. Mark private responses no-store. If protected downloads exist, require verified ownership before issuing short-lived URLs. Printed copies are outside revocation control once obtained.

Targets: `src/app/account/collections/page.tsx`, collection library/detail routes, existing `src/lib/data/access.ts`, recipe and asset handlers.

Acceptance: owner/nonowner/refunded/expired/account-switched cases pass across HTML, server component payloads, direct API requests and print/download endpoints. Existing saved recipes do not confer purchase rights.

## P8-13: deliver receipts and access communication

Dependencies: P8-05, P8-10, P8-12 and verified transactional email setup.

Configure Stripe payment receipts. If adding a separate access email, send only after access commit through a deduplicated outbox and approved sender. Link to the account-bound library, never an unprotected paid attachment. Keep transactional messages separate from marketing consent.

Targets: private side-effect outbox, `src/lib/payments/notifications.ts`, versioned receipt/access templates.

Acceptance: email failure does not revoke access or refund payment. Replayed payment events do not resend repeatedly. Receipt address changes do not transfer ownership. Test only designated inboxes.

## P8-14: implement refunds, disputes and repurchase rules

Dependencies: P8-02, P8-04 and P8-10.

Process provider refund/dispute changes independently of original sale events. Recompute eligibility by order and then across all access sources. Implement approved full/partial/pending refund rules, dispute restrictions, late refund failure and restoration handling. Provide a restricted support workflow with evidence and operator audit.

Targets: `src/lib/payments/adjustments.ts`, worker handlers, ledger tables, refund/dispute fixtures and support runbook.

Acceptance: refunding an old order does not revoke a newer valid purchase. An open dispute is not automatically a lost dispute. Late payment success does not erase a confirmed refund. Human refund decisions follow the approved policy.

## P8-15: reconcile, monitor and isolate failures

Dependencies: P8-09 through P8-14.

Schedule checks for unresolved Session creation, paid orders without grants, pending inbox jobs, provider/ledger mismatches, failed receipts and refund/dispute changes. Keep amount totals separated by currency. Add structured redacted logs, named alerts, bounded retries and a secure operator replay command.

Targets: `src/lib/payments/reconcile.ts`, protected scheduled job, health checks, dashboards and [operations runbook](OPERATIONS-AND-ROLLOUT.md).

Acceptance: the operator detects an injected missing grant/export and recovers without extra charges or duplicate access. Turning off new checkout leaves webhooks, recovery and owned reading active.

## P8-16: provide the Phase 9 measurement contract

Dependencies: P8-04, P8-10 and [Phase 9](../phase-9/README.md).

Expose sanitised business transitions for checkout creation, confirmed payment, access activation and successful refunds. Supply immutable release IDs, currency/minor-unit amounts, occurrence times and opaque analytics references through a consent-aware optional export.

Targets: versioned event adapter and outbox integration, with naming aligned to Phase 9.

Acceptance: disabling analytics has no effect on purchase or access. All-order operational reporting includes valid purchases regardless of optional consent. A return-page view never produces authoritative purchase confirmation.

## P8-17: execute the security and failure matrix

Dependencies: integrated P8-03 through P8-16.

Run the [validation matrix](VALIDATION-MATRIX.md) against exact release candidates. Include real local database policies, signed webhook fixtures, sandbox provider journeys, mobile Safari, Chromium and Instagram in-app browser. Test concurrency with real transactions, not only mocked repository calls. Verify no paid body appears in public metadata, build artifacts or cached responses.

Targets: `supabase/tests/`, `tests/e2e/commerce.spec.ts`, payment unit/integration suites and CI configuration.

Acceptance: required checks pass, no open critical/high access or payment defects, all commercial gates closed, rollback rehearsed and evidence names tested SHAs and missing coverage honestly.

## P8-18: release in stages and hand over operations

Dependencies: P8-17 and owner-approved commercial configuration.

Apply the rollout checklist, verify live provider mapping without initiating unapproved real charges, confirm webhooks and worker health, then enable a controlled sales cohort. Any live smoke charge/refund requires separate explicit authorisation at execution time. Expand only after monitoring confirms reliable payment and access.

Targets: final implementation evidence, support checklist, configuration versions and launch handoff.

Acceptance: every launch gate has evidence and an owner, existing customers retain access during rollback, and Phase 10/11 receive a usable test/operations package. Merging this planning PR does not satisfy these implementation gates.
