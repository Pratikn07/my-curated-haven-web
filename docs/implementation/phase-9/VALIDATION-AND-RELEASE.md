# Validation and release

## Required implementation tests

| Area | Scenario | Required result |
| --- | --- | --- |
| Consent | New visitor, decline, accept, withdraw and reload | No optional requests or IDs until accepted, no replay after acceptance, withdrawal stops collection |
| Shared browser | Two tabs, sign-out, another account signs in | Withdrawal propagates, identity reset does not associate separate accounts |
| Payloads | Email, auth callback query, support text, diet value or unknown property | Rejected or removed before network, including SDK defaults |
| Navigation | Prefetch, strict-mode rerender, back navigation and genuine revisit | Only actual committed views counted, genuine revisits retained |
| Recipe use | Locked preview, accessible detail, search, failed save, cancelled print | Correct event semantics, no invented print completion or successful save |
| Provider outage | Blocked script, request timeout, full retry queue | Reading, printing, sign-in and payment remain usable |
| Environment | Local, preview, staging and production | No nonproduction events in production analytics or live financial totals |
| Purchase trust | Forged browser event and return URL with unknown session | No change to authoritative orders or access |
| Payment delivery | Duplicate/concurrent webhook, delayed payment, missing return page | One business transition and one deduplicated export |
| Refunds | Full, partial, pending, failed and repeated refund notifications | Only successful distinct adjustments affect refund totals |
| Late consent change | Withdraw while server export is queued | Export suppressed, financial record preserved |
| Data access | Anonymous, customer A, customer B and report operator | No raw search cross-user exposure, no public financial/analytics reports |
| Campaigns | Valid, unknown, oversized and sensitive-looking query values | Only registry values persist after consent |
| Instagram | Missing credential, stale export, cumulative snapshots | Source marked unavailable/stale, no double counting, website unaffected |
| Retention | Expired events, deletion request and queued export | Retention job works, deleted optional data is not reintroduced |
| Disable switch | Turn optional analytics off with checkout in progress | No optional capture, fulfilment and refunds continue |

Add schema/sanitiser and attribution unit tests, focused browser tests under `my-curated-haven-web/tests/e2e/`, and pgTAP tests when access policies or private reporting objects change. Test real boundaries rather than mirroring implementation internals.

Use synthetic fixtures with known totals. An example reconciliation fixture has three paid orders in one currency with amounts 1,000, 1,500 and 2,000 minor units. One successful partial refund is 300 and one successful full refund is 1,500. Expected: three paid orders, 4,500 captured, 1,800 refunded, 2,700 captured less refunds. A pending refund does not change these totals. Only two orders might have optional attribution, which must not reduce the all-order count to two. These amounts are test data, not the proposed product price.

## Verification commands and evidence

Run the repository's current web CI gates: lint, typecheck, build and browser tests. Run backend clean replay, database tests and generated-type checks when database changes are present, and honour all configured required PR checks. Discover installed CLI commands through help before using them.

Inspect mobile Safari and Chromium request payloads after acceptance, across sign-in, checkout return and withdrawal. Test Instagram's actual in-app browser manually when available. If unavailable, record that gap and do not claim coverage based only on a simulated mobile viewport.

Use a separate staging analytics project and Stripe test-mode fixtures. Production secrets must not be exposed to untrusted PR jobs. No real card charge or refund is required to validate this phase in CI.

Evidence records the tested SHA, environment, event-contract version, dashboard definitions, fixture results, consent screenshots, redacted payload samples, provider settings and any remaining gaps. Do not commit raw production exports, identities or secrets.

## Release gates

1. Verify product and Instagram project identities separately.
2. Resolve the legacy raw-search access finding with a tested compatibility path.
3. Approve provider, region, budget, retention and accurate privacy disclosures.
4. Pass consent, minimisation, environment isolation and failure-isolation checks.
5. Enable free recipe events only after Phase 6 works.
6. Enable account events only after Phase 7 works.
7. Enable purchase reporting only after Phase 8 confirms ledger and entitlement correctness.
8. Verify dashboards and reconciliations against known fixtures, then a controlled staging journey.
9. Name the reporting and operational owners and hand checks to Phase 10.

An unavailable Instagram export does not block a safe recipe release. Label that dashboard section unavailable. A privacy leak, broken checkout or inaccurate authoritative payment count does block the affected release. A missing optional analytics provider should leave the product running with optional measurement off.

## Rollback

Disable optional browser capture and provider exports using their switches. Clear or suppress pending optional sends when privacy requires it. Keep order processing, webhook verification, entitlements, refund handling and ledger reconciliation active. Do not delete purchase records or relax recipe access to repair a chart.

If the defect exposes data, close the actual table, view, RPC or export path. Hiding a dashboard or removing a navigation item is insufficient. Preserve a sanitised incident record, fix the access boundary and repeat the targeted regression before re-enabling collection.
