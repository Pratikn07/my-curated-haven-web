# Release scope and baseline

## Inspected repository state

Repository: `Pratikn07/my-curated-haven-web`. Refreshed planning baseline: `09e57b595702b1289ef9d84bcf55c8e122e06496` on `main`, merging Phase 9 in [PR #20](https://github.com/Pratikn07/my-curated-haven-web/pull/20). The initial draft used `dae5aed5024d29d2e0e4edebeab7e4ab9582e737`. This refresh preserves later work and updates the dependencies before Phase 10 merges.

| Area | Source state at the refreshed baseline | Required Phase 10 action |
| --- | --- | --- |
| Phases 1–3 | Source and historical evidence present | Recheck routes, mobile design and CI against the integrated candidate |
| Phases 4–5 | Schema, RLS, ingestion and source mapping present | Test actual access boundaries, migration replay and reviewed content |
| Phase 6 | Free listing, filters, detail, print and SEO merged in PR #14 | Extend tests to the paid release without losing free access |
| Phase 7 | Account implementation merged in [PR #15](https://github.com/Pratikn07/my-curated-haven-web/pull/15) | Verify deployed auth, native continuity and private saves |
| Phase 8 | Detailed plan merged in PR #16, payment implementation in [PR #18](https://github.com/Pratikn07/my-curated-haven-web/pull/18) | Close source gaps below, commercial decisions and real provider staging validation |
| Phase 9 | Measurement implementation merged in PR #20, optional export disabled by default | Verify disabled-state isolation, then consent and provider configuration before enabling |
| Phase 10 | This planning package | Build and run the release evidence package |

Phase 6 evidence reports 88 passing and 17 skipped tests at its recorded state. Those numbers are historical, not a fresh run or proof of the forthcoming paid release. Mobile browser emulation is not a real iPhone or Instagram-browser test.

Earlier Phase 8 CI attempts failed before tests while downloading `ghcr.io/supabase/postgres:17.6.1.132`. The initial Phase 10 PR subsequently passed both jobs. Current main also configures the public ECR registry. Preserve the earlier failure as infrastructure history, not a current failure or a product-test result. See [CI reliability](CI-AND-ENVIRONMENT-RELIABILITY.md).

## Existing source to inspect before extending tests

Paths below are repository-relative. Their presence is verified at the planning baseline.

| Target | Inspection required |
| --- | --- |
| `my-curated-haven-web/tests/e2e/public-site.spec.ts` | Current tests prohibit purchase links. Replace this expectation only when the approved payment feature is ready, and test both enabled and disabled states |
| `my-curated-haven-web/tests/e2e/data-access.spec.ts` | Local-stack failures currently permit skips. Required release security tests must fail when fixtures or dependencies are unavailable |
| `my-curated-haven-web/tests/e2e/recipes.spec.ts` | Extend three-free-recipe coverage to buyer, nonbuyer, revoked and unavailable states |
| `my-curated-haven-web/tests/e2e/design-system.spec.ts` | Add real account/payment page coverage, not only design examples |
| `my-curated-haven-web/playwright.config.ts` | Three browser projects, zero retries, one CI worker. Preserve honest failure reporting |
| `my-curated-haven-web/src/app/recipes/[slug]/page.tsx` | Verify permission-aware response and metadata. Full recipe JSON-LD currently follows readable content, so paid access requires an explicit metadata boundary |
| `my-curated-haven-web/src/lib/data/access.ts` | Distinguish missing, denied and database unavailable. An outage must not tell an owner to buy again |
| `my-curated-haven-web/src/lib/supabase/server.ts` | Production must fail safely on missing configuration, without silently using local defaults |
| `supabase/migrations/20260923042735_phase4_schema.sql` | Review release membership immutability, OLD/NEW release moves, parent deletion and rights projection |
| Legacy `recipes` and `search_analytics` migrations | Inspect all remaining read paths. New RLS does not automatically close legacy full-body or raw-search access |
| `.github/workflows/web-ci.yml` | Both jobs start Supabase. Backend job checks clean replay, pgTAP, type drift and data integration |

## Refreshed implementation findings requiring explicit QA

The following observations come from source at `09e57b5`, not a production exploit test:

- `src/app/api/stripe/webhook/route.ts` verifies signatures only when both Stripe is configured and a signature is present. The alternative branch parses unsigned JSON, including when a configured deployment receives no signature. Require a fail-closed nonlocal route and QA-S05 evidence before enabling sales.
- `src/lib/payments/config.ts` supplies mock keys and enables checkout unless explicitly disabled. Checkout and fulfilment include simulated paths, including a `cs_test_mock_` prefix. Prove simulated processing is confined to explicit isolated tests and unreachable in staging provider validation or production. A missing credential must never become a successful simulated purchase.
- `tests/e2e/commerce.spec.ts` includes a purchase flow returning directly from simulated Checkout. This is useful local coverage, not evidence of a real hosted test-mode payment or signed delivery.
- Phase 8 evidence marks a $15 USD offer as verified and describes synthetic free recipes. No explicit owner approval for launch pricing appears in this conversation. Treat those values as fixtures until commercial approval and production-manifest reconciliation are recorded.
- Phase 9 revokes raw `search_analytics` privileges through a new migration. Retest the actual deployed path rather than repeating the older finding as though no fix exists.
- Phase 9 evidence records no provisioned PostHog project, unavailable Instagram credentials, no named paid-without-access paging route and pending real mobile payload inspection. Keep those readiness gaps visible.

Add a negative test for a missing webhook signature with configured Stripe, a missing secret in a nonlocal deployment and a forged mock-prefixed session. These are launch blockers until fixed and verified. Review the worker, refund/dispute and recovery implementation against the full Phase 8 matrix. Existing evidence labels alone do not prove every planned scenario.

Reinspect each finding at implementation time. Source presence and historical passing tests are not current production verification.

## Candidate identity

Before execution create a release record containing:

1. Candidate ID, exact git SHA, build/deployment ID and deployment URL.
2. Environment name, product database project reference and migration head. Keep secrets elsewhere.
3. Runtime and lockfile versions, Supabase CLI version and database image tag or digest.
4. Approved collection release ID, immutable membership/content manifest version and checksum.
5. Three free recipe IDs and their reviewed content revisions.
6. Stripe account/mode, API version and configured product/price references, without keys.
7. Commercial, privacy and refund policy versions, feature flags and analytics contract version.
8. Test fixture revision, browser/OS versions, execution time and tester.

A candidate changes when source, migrations, catalog membership, material recipe content, provider settings or access-affecting flags change. Record the change and repeat affected tests. A documentation-only correction needs a documented impact assessment, not an automatic repeat of every browser run.

## Launch scope

The intended first paid release includes public discovery, three complete free recipes, optional saving through an account, verified identity at purchase, one-time collection checkout, purchased access, print and support. Auth is optional for free reading, required for the account-bound purchase design.

A free-only release is a separate scope decision. It must hide or disable purchase calls to action, state no paid offer, prove free-content and privacy gates, and identify deferred payment work. Do not rename the full paid launch “free-only” to waive failed checkout or access checks.

Deferred features, resources, careers and contact source remain preserved according to Phase 1. Test their intended public boundary and absence from navigation, sitemap and promotional copy. Hiding a navigation item alone does not make a route private. Preserve source without presenting unfinished products to customers.

## Prerequisites before final QA

- Deploy the merged account and payment implementations to isolated staging after closing the nonlocal simulation/signature gaps above.
- Approve collection membership, one-time price/currency, tax presentation, refund handling, future additions and hosted access wording.
- Complete recipe editorial review. The source audit count of 70 is not a promise of 70 or 67 paid recipes.
- Identify engineering, QA, editorial, commerce/support and release owners. One person may fill several roles, but record each responsibility.
- Confirm test-mode provider configuration, safe synthetic users and a recovery procedure for test data.
- Resolve legacy access paths and prove preservation of native users' existing rights.
- Ensure optional analytics is either correctly implemented or explicitly disabled with tested failure isolation.

Until these prerequisites are met, implement the harness and run available checks. Mark absent-feature scenarios blocked, not passed or quietly skipped.
