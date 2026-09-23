# Validation matrix and release evidence

## Test layers

Use unit tests for amount/policy logic, contract validation and reducer behaviour. Use real local PostgreSQL/Supabase integration tests for constraints, transaction races, privileges, RLS and source projection. Use browser tests for sign-in boundaries, status states and paid-content leakage. Use Stripe sandbox for actual hosted Session, signature and adjustment compatibility.

Provider mocks are useful for fault injection, but do not replace sandbox integration. Browser tests alone do not prove database security. Run existing repository web and backend CI gates as well as focused commerce tests. Record installed test tooling and add a runner only when the current stack lacks one.

## Required cases

| ID | Scenario | Expected result |
| --- | --- | --- |
| V01 | Anonymous reading and printing of each free slot | Exactly three distinct complete recipes work, no sign-in/payment |
| V02 | Anonymous and authenticated nonbuyer request a paid body | Denied through app, REST, GraphQL, legacy table, view and RPC paths |
| V03 | Nonbuyer reads collection sales page | Approved preview only, no body in HTML/JSON-LD/RSC/client bundle |
| V04 | Owner requests purchased recipe and print view | Allowed for approved membership, correct recipe version |
| V05 | Draft/withdrawn recipe and unrelated paid release | Denied even with a different valid purchase |
| V06 | Retired collection release with active source | Existing access works, new checkout disabled |
| V07 | Membership edit/move into or out of frozen release | Reject both OLD/NEW parent cases |
| V08 | Concurrent membership change and publish/freeze | Serialised, committed manifest and membership agree |
| V09 | Parent collection/release/recipe deletion or freeze reset | Sold history protected, no cascade bypass |
| V10 | Checkout signed out, expired account or closed account | No Session creation, safe recovery response |
| V11 | Client tampers with owner, amount, Price, currency, quantity or destination | Reject/ignore untrusted fields, server mapping controls Session |
| V12 | Two tabs/double clicks request checkout concurrently | One unresolved attempt, same reusable Session |
| V13 | Provider create call times out before response | Creation unknown, retry same attempt/key safely |
| V14 | Provider creates Session, DB writeback fails | Recover original Session, no automatic replacement |
| V15 | Unknown attempt exceeds safe idempotency retention | Review/reconcile, do not blindly retry a pruned key |
| V16 | Payment completes while old Session is expiring | Detect paid state, grant once, block replacement |
| V17 | Owner lookup or product DB unavailable | Checkout unavailable, no “not owned” assumption |
| V18 | Wrong account, test/live mode or recurring Price | Configuration or binding rejection |
| V19 | Old Session pays after a price update | Validate old snapshot, not new site price |
| V20 | Tax-inclusive/exclusive approved configuration | Correct integer amounts and currency, no false mismatch |
| V21 | Unsupported promotion/additional item/currency conversion | Review hold, no arbitrary grant |
| V22 | Valid signed webhook with raw body | Durable receipt, then safe asynchronous processing |
| V23 | Missing/bad signature, wrong secret, body mutation or stale timestamp | Rejected without ledger/grant effects |
| V24 | Same event repeated and different events for same payment | One semantic payment/access transition |
| V25 | Webhook durable-store failure | Non-success delivery response, provider retry expected |
| V26 | Worker crashes before commit or after commit before acknowledgement | Lease recovery and deduplication, no lost or doubled grant |
| V27 | Worker lease expires during provider retrieval | Fence check rejects stale commit |
| V28 | Checkout completed but payment still unpaid/processing | Pending, no paid access |
| V29 | Delayed payment success/failure | Correct outcome through shared service |
| V30 | Customer never returns from Checkout | Webhook/reconciliation still delivers access |
| V31 | Forged Session ID, order ID or another user's return link | Neutral response, no private order disclosure |
| V32 | Paid order with projection failure | Durable retry, clear access-pending state, no repurchase prompt |
| V33 | Refund notification precedes old success notification | Canonical adjustments prevent accidental restoration |
| V34 | Multiple partial refunds eventually reach full captured amount | Revoke this source only after approved full-refund condition |
| V35 | Pending, failed, cancelled and late-failed refund | Correct distinct states, audit and policy-driven recomputation |
| V36 | Old order refund after newer paid order | New valid source keeps access |
| V37 | Native/support grant plus refunded Stripe order | Remaining valid source keeps access |
| V38 | Formal dispute, inquiry, won and lost outcomes | Correct classification, holds/restoration, no lost=all-events assumption |
| V39 | Dispute and refund overlap | No duplicate reimbursement, explicit review path |
| V40 | Future source start, finite expiry and gap between grants | No early/gap access, boundary recalculation works |
| V41 | Concurrent different-order grant/revoke for one user/release | Combined projection matches all committed sources |
| V42 | Session receipt email changed | Product owner unchanged |
| V43 | Account deletion during payment and later email recreation | No cascade financial loss or automatic transfer, support case |
| V44 | Sign-out, account switch, browser Back and CDN cache | No previous-user private payload or active body access |
| V45 | Public storage URL, guessed private path and print/download direct URL | No paid body/asset bypass |
| V46 | Signed asset URL after entitlement revocation | No new URL issued, existing URL limitation bounded/documented |
| V47 | Receipt delivery timeout and webhook replay | Access unaffected, deduplicated/reviewable notification outcome |
| V48 | Analytics rejected/disabled/provider outage | Purchase, refund and access still work |
| V49 | New-checkout switch disabled mid-payment | In-flight verification and owned access continue |
| V50 | Reconciliation outage, partial pagination and stale watermark | Incomplete run visible, no false deletions/revocations |
| V51 | Native saved-recipe and existing write flows after migration | Supported behaviour preserved without broad re-grants |
| V52 | Logs/error payloads/build output inspected | No secrets, paid bodies, auth data or unnecessary billing details |
| V53 | Unknown/unrelated Stripe payment in same account | Quarantine/ignore safely, no user assignment by email |
| V54 | Exactly three slots constraint versus missing/incomplete row | Readiness validator fails missing/duplicate/unpublished/incomplete recipe |

V02, V07–V09, V11–V18, V23–V27, V31, V36–V46 and V52 are release-blocking security/payment-integrity checks. Every applicable case still needs evidence. A skipped test requires a documented reason and a manual equivalent or an explicit blocked launch capability.

## Fixture set

Use synthetic accounts: A buyer, B nonbuyer, C owner of a different release, D closed account and E verified legacy-rights owner. Include one approved saleable release, one draft, one retired, three complete free recipes and at least two protected paid recipes. No real customer details enter fixtures.

Financial fixtures use clearly artificial values and do not establish C03. Example: order A pays 1,000 minor units, receives successful refunds of 250 and 750, then order B pays 1,200 for the same release. Expected final access is active through B. Gross captured is 2,200, successful refunds 1,000 and captured less refunds 1,200 in the same currency. A duplicate refund event changes none of these figures.

Add a currency with a different minor-unit convention to test formatter/amount logic, while keeping the live launch restricted to its approved currency. Add an exclusive-tax fixture with a separate tax component so a valid total is not compared incorrectly to base price.

For concurrency cases, use two independent DB connections and barriers around reservation, provider-read and commit boundaries. Assert final row counts, uniqueness, source eligibility, grant state and side-effect keys. A mocked single-thread test is insufficient.

## Browser and mobile journeys

Test Chromium desktop/mobile, WebKit/iOS Safari and an actual Instagram in-app browser when available. Record real-device gaps explicitly. Include email-app switching, authentication expiry on return, wallet cancellation, slow network, offline return, a back-button revisit and a second open tab.

Check focus order, status announcements, visible errors, reduced motion, text zoom, touch targets and print output using existing Phase 3 standards. Test the full success/recovery journey at 320 and 390 CSS pixels. The checkout handoff should not require a desktop-only popup.

## Sandbox verification

Use Stripe's documented sandbox/test methods for success, decline, authentication challenge and required adjustment cases. Use CLI-signed local delivery or a dedicated sandbox endpoint. The local forwarding secret differs from the hosted endpoint secret. Record which path each test covered.

Do not use real cards or production customer emails in automated tests. Live smoke actions are separate owner-authorised operational steps. No real charge/refund is required to merge the implementation when sandbox and configuration evidence satisfy the agreed gates.

## CI requirements

Preserve existing `web-quality` and `backend-quality` checks. Add meaningful payment suites without exposing production secrets to PR jobs. Default CI uses local DB and transport fixtures, with trusted sandbox integration jobs isolated from untrusted forks. Pin new packages, commit locks and fail if generated types drift.

Required local checks include clean migration replay, effective grants, pgTAP access/source projection tests, application lint/typecheck/build and focused browser suites. Run broad regression checks when schema/session changes affect native or free-recipe behaviour. Stop optional repeats once the concrete risks and repository gates are covered.

## Completion record

For each case, record tested SHA, environment, test method, expected/observed result, evidence link and owner. Distinguish automated, manual, skipped and blocked. Include sanitised provider event references rather than payload dumps.

Completion requires every applicable critical case, the commercial checklist, no unresolved access leakage, no unexplained paid/access mismatch and a rollback rehearsal. Source code presence or a green mocked unit suite alone is insufficient.

Primary provider reference: [Stripe testing](https://docs.stripe.com/testing). Recheck test methods against the pinned SDK/API version before execution.
