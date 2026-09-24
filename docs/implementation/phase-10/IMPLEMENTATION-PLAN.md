# Detailed Phase 10 implementation plan

## Outcome and working method

Produce a repeatable launch QA suite and a signed release evidence record. Demonstrate the complete parent journey and the failure cases behind it. Finish with an explicit go/no-go recommendation for a named candidate, followed by the Phase 11 handoff.

This phase extends existing tests and closes demonstrated defects. It does not rebuild the parenting catalog, redesign the approved theme, or introduce new product scope. A discovered source defect goes into a focused implementation PR with a failing boundary test where useful.

All tasks below start pending. Dependencies identify order, not completion. Proposed operational targets in supporting documents need owner acceptance before becoming release gates.

## Task sequence

### P10-01: establish the candidate and owners

**Depends on:** current source inventory. **Owner:** release lead with engineering.

- Refresh main, Phase 7–9 PR status, deployment configuration and unresolved commercial decisions.
- Record the candidate fields in [baseline](RELEASE-SCOPE-AND-BASELINE.md). Separate source present, deployed, tested and approved.
- Name each gate owner and define the intended full paid launch scope.
- Create an evidence directory and case register using the [handoff templates](IMPLEMENTATION-HANDOFF.md).

**Targets:** `docs/implementation/phase-10/evidence/<candidate>/` (create during execution), release record, defect register.

**Done when:** every prerequisite has evidence or a blocking owner/action. No unknown SHA, database identity or collection version remains in the candidate record.

### P10-02: isolate environments and fixtures

**Depends on:** P10-01. **Owner:** backend engineer and QA.

- Build synthetic actors and recipe fixtures listed in [test strategy](TEST-STRATEGY-AND-FIXTURES.md).
- Guard destructive setup by explicit local/staging allowlists. A missing environment value must stop setup.
- Verify separate product and Instagram projects, Stripe test mode and nonproduction analytics destination. Require an explicit isolated-test guard for payment simulation and reject missing signatures/configuration in nonlocal deployments before provider staging work.
- Make fixture creation repeatable and namespace runs so parallel workers do not share mutable orders or accounts.

**Targets:** `supabase/seed.sql`, focused test helpers under `my-curated-haven-web/tests/`, proposed private commerce fixtures after Phase 8 schema exists.

**Done when:** a clean environment reproduces the same fixture invariants and a production-target setup attempt refuses to run without making changes.

### P10-03: make automated gates trustworthy

**Depends on:** P10-02. **Owner:** engineering.

- Inspect every test skip. Preserve legitimate desktop/mobile applicability skips with reasons, but fail required data/security suites on unavailable services or missing buyer fixtures.
- Keep positive test discovery, lint, typecheck, build, browser suites, clean migration replay, pgTAP and type drift checks.
- Capture machine-readable result counts and test artifacts. Distinguish infrastructure failure, assertion failure, skipped and flaky results.
- Reproduce and fix registry/download reliability through bounded retries or documented supported configuration without weakening tests.

**Targets:** `.github/workflows/web-ci.yml`, `playwright.config.ts`, `tests/e2e/data-access.spec.ts`, fixture helpers. Paths within the app are relative to `my-curated-haven-web/`.

**Done when:** an unavailable required database produces a red job, all mandatory cases execute, and a clean runner produces inspectable evidence. See [CI specification](CI-AND-ENVIRONMENT-RELIABILITY.md).

### P10-04: prove public discovery and three free recipes

**Depends on:** P10-03 and Phase 6. **Owner:** frontend engineer and QA.

- Automate QA-J01–QA-J08 from the [journey matrix](CUSTOMER-JOURNEY-MATRIX.md).
- Assert the exact approved free IDs, full bodies and print access with no session.
- Test URL filters, refresh/back, clear-all, zero results, malformed parameters and network failures.
- Update old “no purchase link” assertions to reflect the explicit checkout flag, preserving disabled-state coverage. Separate synthetic CI IDs from the approved staging/production manifest.

**Targets:** `tests/e2e/recipes.spec.ts`, `public-site.spec.ts`, `src/app/recipes/`, recipe filters and navigation.

**Done when:** all three recipes remain usable without registration or optional tracking, and no draft or paid body leaks through anonymous discovery.

### P10-05: prove accounts and native identity continuity

**Depends on:** P10-02, P10-03 and merged Phase 7. **Owner:** auth engineer and QA.

- Run QA-J09–QA-J14 with real staging auth and synthetic mail delivery.
- Cover expired/reused links or codes, unsafe redirects, multi-tab logout, another account in the same browser and a new device.
- Prove saved rows are private and native users retain the same verified UUID and valid rights.
- Verify missing auth/session configuration fails safely without exposing secrets or creating duplicate identities.

**Targets:** Phase 7 auth/proxy/account components, saved-recipe policies, proposed account E2E suite.

**Done when:** account A cannot read or mutate B's saved data, free reading survives auth outages, and native continuity has an explicit regression result.

### P10-06: prove checkout and recovery

**Depends on:** P10-05, approved commercial policy and Phase 8 with the refreshed signature/simulation blockers resolved. **Owner:** commerce engineer and QA.

- Execute QA-J15–QA-J24 against Stripe test-mode hosted Checkout.
- Verify price/currency/quantity derive from the approved server mapping. Browser edits must not change them.
- Test cancellation, decline, authentication challenge, double tap, timeout and return-page refresh.
- Complete a payment without returning to the site. Confirm fulfilment from server truth and access on a second device.
- Test every payment method actually enabled. Do not advertise wallets solely because Stripe supports them somewhere.

**Targets:** Phase 8 checkout routes and UI, return/pending states, owned-library pages, staged provider configuration.

**Done when:** one purchase produces the intended durable right, ambiguous attempts never invite an unsafe second charge, and failures offer usable recovery.

### P10-07: prove payment races and rights projection

**Depends on:** P10-06 and the Phase 8 worker/ledger. **Owner:** backend/commerce engineer.

- Run QA-S01–QA-S12 with deterministic failure injection and real database constraints.
- Test duplicates, out-of-order events, worker crash boundaries, expired leases and simultaneous reconciliation.
- Verify refunds/disputes against approved policy and preserve unrelated native, support and repurchase rights.
- Assert ledger, effective entitlement and deduplicated analytics output separately.

**Targets:** Phase 8 inbox/worker/reconciliation tests, transaction integration tests and pgTAP policies.

**Done when:** money and ownership reconcile after recovery, with no duplicate charge, lost confirmed purchase or incorrect cross-source revocation.

### P10-08: prove privacy and paid-content boundaries

**Depends on:** P10-05–P10-07. **Owner:** backend engineer and independent reviewer where available.

- Run QA-S13–QA-S24 using anonymous, ordinary user, owner and operator credentials at actual HTTP/database boundaries.
- Probe legacy tables, views, RPCs, storage, route responses, RSC payloads, prefetch, cache and search metadata.
- Test account deletion and optional analytics retention with synthetic data and approved policies.
- Inspect bundles and logs for credentials, tokens, personal details and full paid recipe text.

**Targets:** RLS tests, access adapters, server routes, storage policies and analytics adapters.

**Done when:** every sensitive surface has positive and negative evidence, legacy compatibility remains verified, and no serious privacy/access defect is open.

### P10-09: validate mobile, accessibility and print

**Depends on:** integrated customer pages from P10-04–P10-06. **Owner:** frontend engineer, QA and editorial reviewer.

- Execute QA-M01–QA-M12 across required devices and interaction modes.
- Run axe plus manual keyboard, VoiceOver/TalkBack, zoom and focus checks.
- Check the Phase 3 palette with real text, errors, disabled states and images. Fix contrast or readability locally before considering a broad redesign.
- Produce actual A4 and US Letter print-to-PDF evidence for free and entitled recipes, including long content.

**Targets:** Phase 3 tokens, shared controls, recipe print CSS and final account/payment layouts.

**Done when:** core journeys are usable on real mobile devices, no critical accessibility barrier remains, and printed recipes are complete and legible.

### P10-10: verify recipe content and customer promises

**Depends on:** approved release manifest and P10-04/P10-06. **Owner:** editorial lead and commerce owner.

- Review every launch recipe, including all paid members, against source identity, quantities, method, yield, allergens, storage and image rights.
- Resolve inferred or placeholder values. Review dietary labels against actual ingredients.
- Compare homepage, collection page, Checkout description, receipt, terms and support wording.
- Confirm no claims of subscription, all future additions, unlimited AI or parenting features enter the first offer.

**Targets:** content manifest and review register, catalog revisions, product/legal/support copy.

**Done when:** each recipe and each commercial promise has an accountable approval. Content blockers cannot be solved by hiding the warning.

### P10-11: measure performance and discoverability

**Depends on:** P10-09/P10-10 and stable staging. **Owner:** frontend engineer.

- Execute QA-P01–QA-P10 with recorded hardware, network and cache conditions.
- Measure cold and warm navigation on representative pages and record actual payload sizes.
- Check official-origin canonical URLs, sitemap membership, social previews, status codes and structured data.
- Confirm paid content remains absent from public HTML, metadata, JSON-LD and indexes.

**Targets:** image/font loading, route data queries, `sitemap.ts`, `robots.ts`, metadata and performance evidence.

**Done when:** accepted lab budgets pass or an explicitly allowed noncritical exception is recorded. Do not present lab measurements as field Core Web Vitals.

### P10-12: validate measurement without product dependency

**Depends on:** Phase 9 implementation if enabled, P10-07/P10-08. **Owner:** analytics engineer.

- Run QA-A01–QA-A08 with consent declined, granted, withdrawn and provider unavailable.
- Reconcile fixture orders/refunds against the ledger and distinguish all-order totals from attributed subsets.
- Check campaign allowlists, retention, cross-account isolation and separate Instagram metrics.
- If optional analytics remains off, prove no optional requests and record the measurement limitation.

**Targets:** consent UI, event validators, export worker, dashboard queries and separate Instagram adapter.

**Done when:** enabled measurement is correct and private, or explicitly disabled without affecting use, purchases or authoritative financial records.

### P10-13: rehearse outages, recovery and support

**Depends on:** P10-07/P10-08/P10-12. **Owner:** engineering and support.

- Execute QA-O01–QA-O08 in isolated staging.
- Exercise checkout stop while webhook processing remains alive, provider/database downtime and worker backlog recovery.
- Restore a staging backup to a new isolated target and reconcile provider truth before reopening sales.
- Rehearse support for paid-but-pending, wrong-account, duplicate-attempt and refund cases without exposing private data.

**Targets:** Phase 8 runbooks, staged monitoring, backup/restore evidence and support templates.

**Done when:** named operators recover the system with recorded timings and no lost valid rights. See [rehearsal](ROLLBACK-AND-OPERATIONS-REHEARSAL.md).

### P10-14: triage defects and rerun affected checks

**Depends on:** all executed workstreams. **Owner:** QA lead with responsible engineer.

- Log reproducible defects using the severity model and link each to failed scenarios.
- Fix source defects in focused PRs, retain regression cases and retest on the new candidate.
- Reconcile all skipped, blocked, flaky and not-run cases. Missing coverage is a visible gap.
- Rerun cross-account, payment and privacy tests after any related configuration/schema change.

**Targets:** defect register, implementation PRs and updated candidate record.

**Done when:** no release-blocking defect or mandatory unexecuted case remains. Exceptions meet [gate rules](DEFECTS-AND-RELEASE-GATES.md).

### P10-15: assemble evidence and decide go/no-go

**Depends on:** P10-14. **Owner:** release lead and named gate owners.

- Verify CI on the exact candidate and final protected staging deployment.
- Complete all gate rows with evidence, owner and decision. Summaries must link to raw sanitised proof.
- Confirm commercial settings and content revisions still match the tested versions.
- Produce a no-go record with blocking actions if any hard gate fails. Produce a go recommendation only when the full scope meets the gates.

**Targets:** release report, sign-off table, test summary and known limitations.

**Done when:** the decision is traceable to current evidence and the owner knows what remains for Phase 11. A green documentation PR is not this decision.

### P10-16: hand off to staged launch

**Depends on:** P10-15. **Owner:** release lead and operations owner.

- Hand over exact artifact/configuration, rollout cohort, checkout switch, monitoring and rollback steps.
- Define production read-only smoke checks and the separately authorised controlled payment verification, if needed.
- Confirm support coverage and decision points for expanding or stopping traffic.
- Schedule field performance and real-user feedback review after launch, without claiming prelaunch evidence already covers them.

**Targets:** Phase 11 handoff record linked from this package.

**Done when:** Phase 11 has an actionable release package and named owners. No automatic production promotion follows from writing or merging this plan.

## Suggested work grouping

| Group | Tasks | Exit |
| --- | --- | --- |
| Foundation | P10-01–P10-03 | Candidate, fixtures and reliable CI |
| Integrated product | P10-04–P10-08 | Free/account/payment/security evidence |
| Experience and truth | P10-09–P10-12 | Mobile, content, performance and measurement evidence |
| Recovery and release | P10-13–P10-16 | Recovery rehearsal, defect closure and sign-off |

Plan staffing after prerequisites are known. Merged payment source still needs real provider validation and closure of the refreshed findings. Do not give a launch date by treating source presence as completed launch QA.
