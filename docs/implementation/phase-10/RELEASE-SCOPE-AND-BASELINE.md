# Release scope and baseline

## Inspected repository state

Repository: `Pratikn07/my-curated-haven-web`. Planning baseline: `dae5aed5024d29d2e0e4edebeab7e4ab9582e737` on `main`, merging Phase 6 in [PR #14](https://github.com/Pratikn07/my-curated-haven-web/pull/14).

| Area | Source state at this baseline | Required Phase 10 action |
| --- | --- | --- |
| Phases 1–3 | Source and historical evidence present | Recheck routes, mobile design and CI against the integrated candidate |
| Phases 4–5 | Schema, RLS, ingestion and source mapping present | Test actual access boundaries, migration replay and reviewed content |
| Phase 6 | Free listing, filters, detail, print and SEO merged | Extend tests to the paid release without losing free access |
| Phase 7 | Plan on main, account implementation proposed in [PR #15](https://github.com/Pratikn07/my-curated-haven-web/pull/15) | Require merged and deployed implementation before account sign-off |
| Phase 8 | Detailed plan in open [PR #16](https://github.com/Pratikn07/my-curated-haven-web/pull/16), payment implementation absent on main | Require commercial decisions, implementation and staging validation |
| Phase 9 | Detailed measurement plan on main | Verify implementation if enabled, otherwise prove optional capture is off |
| Phase 10 | This planning package | Build and run the release evidence package |

Phase 6 evidence reports 88 passing and 17 skipped tests at its recorded state. Those numbers are historical, not a fresh run or proof of the forthcoming paid release. Mobile browser emulation is not a real iPhone or Instagram-browser test.

Phase 8 CI failed before tests while downloading `ghcr.io/supabase/postgres:17.6.1.132`. Treat this as an infrastructure blocker, not a passing product test or proof of a product defect. See [CI reliability](CI-AND-ENVIRONMENT-RELIABILITY.md).

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

Reinspect these findings after Phases 7–9 merge. A planned fix is not a verified fix.

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

- Merge and deploy the approved account and payment implementations to isolated staging.
- Approve collection membership, one-time price/currency, tax presentation, refund handling, future additions and hosted access wording.
- Complete recipe editorial review. The source audit count of 70 is not a promise of 70 or 67 paid recipes.
- Identify engineering, QA, editorial, commerce/support and release owners. One person may fill several roles, but record each responsibility.
- Confirm test-mode provider configuration, safe synthetic users and a recovery procedure for test data.
- Resolve legacy access paths and prove preservation of native users' existing rights.
- Ensure optional analytics is either correctly implemented or explicitly disabled with tested failure isolation.

Until these prerequisites are met, implement the harness and run available checks. Mark absent-feature scenarios blocked, not passed or quietly skipped.
