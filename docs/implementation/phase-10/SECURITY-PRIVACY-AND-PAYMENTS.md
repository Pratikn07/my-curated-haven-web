# Security, privacy and payments

Use the merged [Phase 8 design](../phase-8/README.md) and pin the implemented version in the candidate record. Its 54 validation cases remain required for payment implementation. The scenarios here select integrated launch risks and add cross-phase checks. This matrix does not replace Phase 8's detailed tests.

## Payment and access invariants

- Browser claims never create payment truth or ownership.
- Every confirmed order belongs to the verified purchasing UUID and immutable collection release.
- Duplicate delivery does not create duplicate business effects.
- An ambiguous provider creation result is recovered before a new charge attempt.
- Effective access is the union of independently valid sources. Refunding one order must not revoke another valid purchase, native right or support grant.
- Purchase, fulfilment, refund and dispute states remain separately observable.
- Revenue reporting originates in durable records, not a return-page event.

## Payment and concurrency cases

| ID | Fault injection or action | Expected assertions |
| --- | --- | --- |
| QA-S01 | Duplicate and concurrent valid webhook events | One durable inbox identity/business transition, no duplicate order/right/export |
| QA-S02 | Deliver paid/refund/dispute events out of order | Canonical provider state and approved precedence converge correctly, no regression to obsolete state |
| QA-S03 | Crash before inbox commit, after inbox commit/before ack, before entitlement commit and after commit/before completion marker | Provider retry or worker recovery loses no confirmed purchase. Uncommitted work rolls back, committed work is safely reprocessed |
| QA-S04 | Worker lease expires while original worker resumes, concurrent reconciliation runs | Fencing rejects stale writes and serialisation protects the user/release projection. No duplicate grant or lost revocation |
| QA-S05 | Missing/wrong signature with Stripe configured, altered raw body, wrong account/mode, irrelevant or malformed event | Invalid input rejected, valid irrelevant event handled intentionally. No financial or access mutation, no raw secret logging |
| QA-S06 | Pending, failed and successful full refund | Apply the approved policy at the correct state transition. Pending/failed must not be treated as successful financial adjustment |
| QA-S07 | Partial and repeated refunds, paginated refund objects | Sum unique successful adjustments in minor units, enforce approved access policy, reconcile all pages and currencies separately |
| QA-S08 | Open, won, lost and reopened formal dispute | Approved suspension/restoration policy. Winning cannot restore a separately refunded/expired source |
| QA-S09 | Old purchase refunded after a new valid purchase, plus an independent native/support source | Revoke only the affected source. Effective access remains while any qualifying source is valid |
| QA-S10 | Provider session creation succeeds but network response is lost, then attempt retention boundary is crossed | Recover using durable attempt/provider references. No blind new charge or unsafe retry after idempotency assumptions expire |
| QA-S11 | Edit browser price, quantity, currency, account ID or release ID, including direct route POST | Server mapping and verified identity win. Foreign/ineligible release refused and amount matches approved offer |
| QA-S12 | Attempt sealed release membership insert/delete, move between releases, and parent deletion | Database protects both old/new release membership and historical manifest. No cascade silently alters purchased content |

Test realistic transaction concurrency against PostgreSQL, not solely mocked function calls. Observe both denied and permitted operations. Record event/order references in redacted form, row counts and final effective access.

## Direct access and privacy cases

| ID | Surface and action | Expected assertions |
| --- | --- | --- |
| QA-S13 | Anonymous/nonbuyer/buyer/other-user reads through PostgREST, views and RPCs | Public preview projection is minimal, only free or entitled bodies readable, private ledger inaccessible |
| QA-S14 | Legacy `recipes` full-body reads and `search_analytics` raw rows using ordinary credentials | No bypass of new paywall/privacy rules. Native compatibility proven through an approved path, not blanket reopening |
| QA-S15 | Enumerate protected storage paths and request signed URLs as wrong user | Public previews contain only approved assets. Private files require current right, URL expiry matches approved policy |
| QA-S16 | Warm owner response, then request same URL as nonbuyer/anonymous through CDN and Next.js navigation/prefetch | No cross-user HTML, RSC, metadata, print or cache leakage. Authenticated bodies are never shared publicly |
| QA-S17 | Sign out/revoke a right while tabs, back-forward cache and a signed URL exist | New server reads deny access after policy propagation. Bound existing URL lifetime explicitly. Already downloaded/printed material is not falsely promised revocable |
| QA-S18 | Attempt ordinary-user INSERT/UPDATE/DELETE of entitlement, order, membership and other user's saved rows | RLS/privileges reject unauthorised mutation. Legitimate own save works and trusted worker uses least necessary authority |
| QA-S19 | Missing/wrong server env, forged mock-prefixed session, inspect client bundle and errors | No simulated purchase or unsigned processing outside explicit isolated tests. No service/Stripe secret in client assets, local fallback in production or credentials/raw database messages in responses |
| QA-S20 | Forged or expired session and cross-origin state-changing requests | Current identity verified, safe redirect allowlist and appropriate CSRF/origin controls applied, state unchanged on invalid requests |
| QA-S21 | Review webhook/auth/support logs, analytics payloads, URLs and error monitoring | No auth codes/cookies, raw recipe search text, payment secrets or child/personal details beyond approved minimal operational data |
| QA-S22 | Synthetic account deletion and optional analytics deletion with queued exports | Approved retention policy preserved, optional data not reintroduced, support/recovery implications explicit. Do not erase required financial history by accidental cascade |
| QA-S23 | Product service attempts to read Instagram automation data, report role accesses operational tables | Project separation and restricted credentials work. Product users cannot query Instagram identities or private reports |
| QA-S24 | Content injection in recipe title, method, query, image URL and metadata | Escaped/sanitised rendering and structured data, no script execution or unsafe redirects, safe response on invalid content |

No claim of complete penetration testing follows from this checklist. Record tested surfaces and remaining scope. Any demonstrated cross-user leak, paid-content bypass or payment integrity defect blocks the relevant launch.

## Optional measurement cases

Run alongside [Phase 9 validation](../phase-9/VALIDATION-AND-RELEASE.md).

| ID | Steps | Required result |
| --- | --- | --- |
| QA-A01 | Fresh browser, decline, reload and navigate | No optional SDK requests, cookies, IDs or queued replay. Essential auth/payment still works |
| QA-A02 | Accept, navigate/prefetch/back, print then cancel dialog | Count actual defined views, no prefetch inflation, print request is not reported as completed printing |
| QA-A03 | Withdraw in another tab while browser/server export is queued | Stop capture, propagate withdrawal, suppress optional queued sends and preserve necessary financial records |
| QA-A04 | Block analytics host, timeout requests and fill retry queue | Free reading, saving, auth, checkout and fulfilment remain usable |
| QA-A05 | Send unknown properties, sensitive queries and forged purchase events | Allowlist validation rejects/removes unsafe properties, no authoritative payment count from browser input |
| QA-A06 | Reconcile three orders of 1,000/1,500/2,000 minor units with successful refunds of 300/1,500, plus pending refund | Three paid orders, 4,500 captured, 1,800 refunded, 2,700 captured less refunds. Attributed subset does not replace all-order totals |
| QA-A07 | Known/unknown campaign values and repeated/stale Instagram exports | Only approved campaign values after consent. Separate source freshness and no double counting cumulative snapshots or person-level joining |
| QA-A08 | Sign out A/sign in B, run retention/deletion, inspect environment routing | No cross-account identity carryover, expired optional data removed, no test events in production project |

Amounts in QA-A06 are synthetic test data, not pricing. If measurement is disabled, test disabled-path isolation and mark provider-specific cases not applicable with explicit scope. Inaccurate mandatory payment records still block launch even with optional analytics off.

## Primary references

- [Supabase row level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Stripe Checkout fulfilment](https://docs.stripe.com/checkout/fulfillment)
- [Stripe webhook delivery](https://docs.stripe.com/webhooks)
- [Stripe testing](https://docs.stripe.com/testing)

Recheck current provider behaviour, API versions and configured methods during implementation. Provider examples do not replace the application's own ownership and recovery rules.
