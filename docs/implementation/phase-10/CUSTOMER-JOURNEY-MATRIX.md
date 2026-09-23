# Customer journey matrix

All scenarios start not run. Run against the named release candidate and fixtures from [test strategy](TEST-STRATEGY-AND-FIXTURES.md). Record both expected and actual outcomes. The security matrix adds adversarial and server-side checks to these user journeys.

For each browser case capture the final state, relevant redacted network response and any linked database assertion. A screenshot alone cannot prove ownership or payment correctness.

## Discovery and free recipes

| ID | Setup and steps | Required result and proof |
| --- | --- | --- |
| QA-J01 | New anonymous session, open official landing URL from an approved Tiny Soho campaign link, decline optional tracking | Brand, toddler promise and three-free-recipes path are clear. No forced signup or optional analytics request. Capture mobile page and network log |
| QA-J02 | Open each of the three approved free slugs directly, without a cookie | Complete ingredients, quantities, method and reviewed supporting notes load. Assert exact source IDs and body presence |
| QA-J03 | Search a known title, apply multiple supported filters, refresh, then back/forward | Results and URL agree, state persists, no stale count. Assert result IDs, not only card count |
| QA-J04 | Apply a no-match filter, clear one chip, then clear all | Honest empty state recovers. Focus remains usable and result count announces once |
| QA-J05 | Supply unknown, oversized and malformed filter/search parameters | Safe handling without crash, injection or unsafe log payloads. No exposure of draft/paid body through search |
| QA-J06 | Interrupt recipe API/database access while loading catalog and detail | Distinct unavailable/retry state. No false “zero recipes”, purchase prompt or exposed internal error. Restore and retry |
| QA-J07 | Print each free recipe while signed out | Print includes complete reviewed recipe and attribution, excludes navigation, and does not require a purchase or tracking consent |
| QA-J08 | Open draft/withdrawn/nonexistent slug and deferred feature routes, inspect nav and sitemap | Approved unavailable/noindex behaviour, no draft body or unfinished promise. Preserved source remains in the repo |

## Accounts and saving

| ID | Setup and steps | Required result and proof |
| --- | --- | --- |
| QA-J09 | Anonymous visitor selects Save, completes valid auth, returns to recipe | Clear reason for account, safe return path, one saved row for own UUID. Free reading was available before auth |
| QA-J10 | Submit expired/reused/incorrect auth token and an external return URL | Helpful recovery, no session creation from invalid token, no open redirect, no token in analytics/logs |
| QA-J11 | Save twice, unsave twice, then load on a second device | Idempotent visible state agrees with server, no duplicate saves, confirmed server result drives UI |
| QA-J12 | A signs out, B signs in using the same browser, repeat with another open tab | No A account/saved/paid content displayed to B, session changes propagate, back/forward does not leak cached data |
| QA-J13 | Existing native user signs in on web, saves a recipe and later signs in on native | Verified same UUID, existing rights and saves remain compatible. Record client/source versions tested |
| QA-J14 | Expire buyer session while opening a paid recipe, reauthenticate | Request reauthentication rather than repurchase. Original ownership restored without manual grant or new charge |

## Collection, purchase and access

| ID | Setup and steps | Required result and proof |
| --- | --- | --- |
| QA-J15 | Open collection offer signed out and signed in | Same approved membership, price/currency, one-time wording, print access and policy links. No future-feature promises |
| QA-J16 | Verified nonbuyer selects Buy, completes test-mode card purchase | Hosted Checkout has exact server-selected price/quantity/currency. Ledger confirms payment and right activates once. Record redacted provider/order references |
| QA-J17 | Cancel Checkout, then retry from collection page | No charge/right from cancellation, useful return state, recover or expire prior attempt safely before a new attempt |
| QA-J18 | Use provider decline and authentication-challenge scenarios | Honest recoverable states, no access on failed payment, successful challenge fulfils exactly once |
| QA-J19 | Double tap Buy, send concurrent requests in two tabs, simulate creation timeout | One logical active attempt and safe recovery. Never two avoidable sessions/charges from an ambiguous provider result |
| QA-J20 | Complete payment then close browser before return navigation | Durable webhook/worker fulfils without browser. Sign in on second device and read/print the collection |
| QA-J21 | Delay fulfilment, refresh return page, revisit later | Payment/access pending states reflect truth. No fake success, no duplicate grant and no “pay again” instruction |
| QA-J22 | Tamper return session/order reference and attempt B's purchase URL as A | No ownership transfer, no disclosure of B's order details, no new right from a browser query parameter |
| QA-J23 | Buyer opens owned library, recipe deep link and print on two devices, then reloads | Exact purchased manifest available through server-authorised paths. Unrelated release remains inaccessible |
| QA-J24 | Existing owner selects collection CTA, and buyer attempts purchase while checkout disabled | Owner gets access route, not accidental duplicate purchase. Disabled checkout explains availability while existing reading/fulfilment works |

## Practical execution notes

Run discovery and core purchase navigation on desktop Chromium, mobile Chromium and mobile WebKit. Manually repeat arrival, auth and Checkout handoff in actual Instagram browsers on iOS and Android. Record unsupported wallet cases by method/device rather than claiming all wallets work.

Payment evidence must connect provider confirmation, private order, entitlement projection and authorised read. Do not mark QA-J16 or QA-J20 passed solely because a return screen says “success”. Refund and dispute journeys belong to QA-S06–QA-S09 and support rehearsal QA-O07.

If the account or payment implementation is absent, those cases are blocked. The absence is expected at the planning baseline, but remains a blocker for a full paid release.
