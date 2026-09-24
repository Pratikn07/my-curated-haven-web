# Test strategy and fixtures

## Test layers

| Layer | Proves | Does not prove |
| --- | --- | --- |
| Focused unit tests | Pure filter parsing, event validation, amount/state calculations | RLS, actual Stripe behaviour or browser accessibility |
| Database tests | Role boundaries, constraints, transaction races, migration compatibility | Customer navigation or provider configuration |
| HTTP integration | Session-bound routes, signatures, redirects, response/cache boundaries | Real-device interaction |
| Browser automation | Customer journeys, visible states, network payloads and layout | Physical print output, all assistive technology or real wallet availability |
| Provider sandbox | Hosted Checkout, challenge/decline paths and genuine signed delivery | Live merchant readiness or production settlement |
| Manual staging | Real mobile, Instagram browser, screen reader, print and support rehearsal | Long-term field performance or production traffic capacity |

Prefer tests at the boundary where a failure matters. A mock returning an entitlement cannot prove a database policy. A seeded buyer is useful for access tests but cannot replace the purchase-to-access journey.

## Environment matrix

| Environment | Data and services | Allowed QA use |
| --- | --- | --- |
| Local/CI | Disposable local Supabase, synthetic actors, provider doubles | Clean migration replay, deterministic races and browser regression |
| Protected staging | Separate nonproduction product database, Stripe test mode, test mail destination | Real provider integrations, auth, recovery and manual devices |
| PR preview | Protected preview, isolated safe configuration | Review UI and applicable smoke tests without production secrets |
| Production | Approved live configuration and real customer records | Read-only release smoke and authorised operational verification in Phase 11 |

No destructive fixture reset against production. The harness must check target host/project against an explicit nonproduction allowlist before migrations, deletes or fixture writes. Do not copy production emails, children’s details, purchase histories or Instagram identities into fixtures.

The Playwright external-server option removes the need to start a local web server, but does not guarantee a safe target. Add an explicit staging-origin assertion before any state-changing suite. Keep preview protection credentials in the secret store and out of browser traces.

## Synthetic actor matrix

| Actor | Starting rights | Required assertions |
| --- | --- | --- |
| Anonymous | Three free recipes only | No paid body, saved rows, private reports or ledger |
| A, nonbuyer | Verified account, own saved rows | Saves own recipes, cannot buy using B's identity |
| B, buyer | Confirmed purchase for release R1 | Reads/prints R1, no rights to unrelated release R2 or A's saves |
| C, revoked | Refunded or revoked R1 source | Denied if no other valid source, useful explanation |
| D, native member | Independently valid parenting-app right | Right survives web refund and web-account flows |
| E, multiple sources | Native/support/purchase sources and two purchase attempts | Revoke only affected source, aggregate remaining rights |
| F, expired session | Previously entitled but invalid session | Reauthenticate without a false repurchase prompt |
| Operator | Narrow reporting/support capability | Only permitted operational fields, audited action, no browser service key |

Use unique synthetic emails at an owned test domain or local mail sink. Never use plausible addresses at someone else's domain for delivery. Separate verified and unverified users. Never authenticate customers by changing a browser-supplied user ID.

## Recipe and transaction fixtures

The reviewed production manifest must retain the approved free source identities:

| Free slot | Source ID |
| --- | --- |
| 1 | `0003c4cc-b2cb-4e49-97c8-f4febfed39f9` |
| 2 | `50663aaa-7e47-4b08-9fd8-a58b390db96d` |
| 3 | `a61d93da-4d19-4219-a131-bca2468ace88` |

Current CI uses `synth-free-*` recipes with separate synthetic UUIDs. Preserve this isolation and record the mapping. Run the real free-ID assertions against a reviewed staging manifest, not the unrelated local seed. Local fixture success must not be described as production content verification.

Add synthetic paid R1/R2 recipes, a draft, a withdrawn item, long ingredient/step content, an absent image and malformed input fixtures. Mark synthetic bodies with unique sentinel strings to detect leakage across HTML, RSC, JSON-LD, storage and public search. Keep synthetic data out of production publication and sitemaps.

Fixture setup asserts exactly three complete published free bodies, a frozen collection manifest, expected user/source rights and zero unrelated provider events. Reset each test's mutable rows through privileged setup only. Runtime requests use the real role under test.

Commerce fixtures cover paid, pending, failed, expired, full/partial/pending/failed refund, open/won/lost dispute, duplicate events and repurchase. Use Stripe's current test fixtures for provider-generated outcomes. For race tests, control worker barriers and network responses deterministically. Do not rely on arbitrary sleeps to produce a race.

Keep provider-mode tests separate from deterministic local tests. A test that inserts a synthetic signed payload proves signature/handler mechanics, not Stripe delivery configuration. Final staging requires actual test-mode Checkout plus provider delivery evidence.

## Commands and execution

The inspected app uses Node 24, npm and Playwright. From the repository root, with a confirmed disposable local target:

```bash
supabase start
supabase db reset
supabase test db
supabase gen types typescript --local > /tmp/mch-phase10-types.ts
diff -u my-curated-haven-web/src/lib/types/database.ts /tmp/mch-phase10-types.ts
```

From `my-curated-haven-web/`:

```bash
npm ci
npm run lint
npm run typecheck
npx playwright install --with-deps chromium webkit
npm run build -- --webpack
npx playwright test --list
npm run test:e2e
```

Confirm installed CLI help and repository scripts at implementation time. Commands above describe the current baseline, not already executed Phase 10 checks. New commerce suites need their own documented command after implementation. An explicit zero test count or skipped mandatory suite fails release verification.

## Evidence discipline

Each case records scenario ID, candidate, environment, actor, steps, expected result, actual result, timestamp, test runner/device, result and proof link. Allowed results: pass, fail, blocked, not run, or not applicable with an approved scope reason.

Retain redacted assertions and summaries with the release record. Store full sensitive traces only in an approved restricted location with a named retention period. This repository is public. Never commit cookies, auth URLs/codes, payment secrets, webhook signatures, raw customer payloads or full production exports. Screenshots and PDFs must use synthetic people and approved recipe content.

Automated retries, if later introduced, must preserve first-failure evidence. A final pass after retry is a flaky result requiring triage. Product assertions are not retried indefinitely until green.
