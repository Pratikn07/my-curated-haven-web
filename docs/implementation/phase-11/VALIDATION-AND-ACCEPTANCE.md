# Validation and acceptance

## Execution rules

All 64 scenarios start not run. These are acceptance scenarios, not a claim of 64 automated tests. Map each to actual tests or manual execution records, with source/configuration version, actor, environment, timestamp, expected/actual result and evidence.

Use local/staging for fault injection, destructive setup, payment tests and restore rehearsals. Use provider sandbox/test mode for test transactions. Production validation is readonly where possible, with separately authorised account/operator actions and observation of genuine customer sales after launch. Never generate live test-card transactions or self-purchases to fill a coverage gap.

A missing dependency is blocked, not passed. A not-applicable result needs approved scope. This matrix supplements Phase 10's 86 cases and Phase 8's detailed payment matrix. It does not replace them.

## Readiness

| ID | Action | Expected result and proof |
| --- | --- | --- |
| OP-R01 | Compare release packet with deployed source/build/schema/manifest/policies | Exact matching versions, or documented revision and required retest |
| OP-R02 | Inspect product and Instagram project references and runtime credentials | Separate correct projects, restricted commerce role, no credentials in public evidence |
| OP-R03 | Remove required Supabase/commerce/Stripe config in protected nonlocal staging | Data/checkout fail safely, no simulation or local fallback, public marketing degradation follows approved contract |
| OP-R04 | Send missing/invalid signature and wrong account/mode to staging webhook | Rejected without ledger/access mutation, valid signed control event still works |
| OP-R05 | Attempt forged mock-prefixed Session and completed-but-unpaid provider fixture | No entitlement. Only canonical eligible paid state fulfils under approved method policy |
| OP-R06 | Compare live-offer configuration record with approved commercial decision | Exact price/currency/quantity/membership/policy, no unapproved $15 fixture assumption |
| OP-R07 | Send OTP through production-suitable sender to authorised test recipients | Delivery, expiry, resend, rate limiting and redirects verified without logging codes |
| OP-R08 | Check native user and current hardening migration against real role boundaries | Same verified UUID/valid native rights, legacy paid-body reads closed, deployed migration recorded |

## Deployment and stop

| ID | Action | Expected result and proof |
| --- | --- | --- |
| OP-D01 | Rehearse production-target build/promotion and compare public variables | Correct environment artifact, no preview/test origin or keys in production target |
| OP-D02 | Verify DNS/TLS/apex-www redirects and canonical URLs | Official origin resolves, no loop or mixed preview links |
| OP-D03 | Apply pending migrations to isolated representative DB and use old/new compatible app versions | Clean replay, explicit privileges, no destructive purchase-history change |
| OP-D04 | Run official-domain readiness with checkout disabled | Three complete real free recipes, support, preview and deliberate disabled-sale state |
| OP-D05 | Stop checkout during concurrent requests and open hosted Sessions in staging | Server denies new creation, existing Sessions follow documented policy, confirmed access still fulfils |
| OP-D06 | Revert to the tested safe deployment | Domain points to expected version, flags/secrets/jobs verified, security fixes not lost |
| OP-D07 | Simulate configuration/content drift after candidate sign-off | Readiness fails/holds stage, new record and targeted retest required |
| OP-D08 | Inspect Git auto-deploy/rollback/domain-assignment behaviour | Documented promotion boundary and predictable next deployment, no accidental public expansion |

## Cohorts and expansion

| ID | Action | Expected result and proof |
| --- | --- | --- |
| OP-C01 | Anonymous visitor opens any of three free recipes during invited stage | Full read/print without invitation or optional consent |
| OP-C02 | Verified noninvited user posts directly to checkout | Server rejects creation before provider call, honest unavailable/invited UI |
| OP-C03 | Invited user submits valid sandbox attempt and retries concurrently | One recoverable logical attempt, correct policy version and identity |
| OP-C04 | Remove invitation after genuine/sandbox-confirmed purchase | Existing right and fulfilment remain, new-sale eligibility changes only |
| OP-C05 | Make rollout-state source unavailable or stale across instances | New checkout fails closed, existing owners unaffected, alert indicates uncertainty |
| OP-C06 | Review stage with zero/few genuine purchases | Evidence marked insufficient, hold/revised exposure decision recorded, no fabricated purchases |
| OP-C07 | End operator coverage or overload support before expansion | Hold promotion/new invited sales according to staffing policy, handoff and backup recorded |
| OP-C08 | Open wider stage, then share an old invitation/campaign URL | Current server policy applies, query tags grant no rights, all sources monitored |

## Commerce jobs and messages

| ID | Action | Expected result and proof |
| --- | --- | --- |
| OP-P01 | Complete sandbox payment without browser return | Independent processing grants correct access and delivers approved message once |
| OP-P02 | Deliver duplicate/out-of-order events while worker/reconciler overlap | Canonical final ledger and source projection, no duplicate business/message effect |
| OP-P03 | Crash worker around receipt/commit/ack boundaries, then reclaim lease | Durable recovery, stale worker fenced, no acknowledged lost payment |
| OP-P04 | Omit a webhook, paginate canonical reconciliation with late update | Missing order detected/recovered, checkpoint advances safely with overlap |
| OP-P05 | Test pending/failed/full/partial refund and dispute states | Approved unique adjustments and rights-source policy, no broad revocation |
| OP-P06 | Refund an older purchase while newer/native/support right remains | Effective access preserved by other valid source, audit identifies affected order |
| OP-P07 | Fail receipt provider then retry/restart | Purchase stays valid, no duplicate message, bounce/failure surfaced for support |
| OP-P08 | Disable optional analytics or exhaust its queue | Critical payment/access latency and fulfilment remain within accepted target |

## Monitoring and incidents

| ID | Action | Expected result and proof |
| --- | --- | --- |
| OP-M01 | Inject confirmed-paid/access-pending fixture beyond target | Alert reaches primary/backup with safe order reference, customer recovery owned |
| OP-M02 | Stop scheduler while queue is empty | Freshness alert still fires, quiet backlog does not hide scheduler failure |
| OP-M03 | Break recipe data while homepage stays HTTP 200 | Content-aware synthetic detects product outage and links correct runbook |
| OP-M04 | Generate normal declines/cancellations and genuine application errors | Error denominator separates them, low-volume absolute triggers still work |
| OP-M05 | Make monitor source unavailable | Dashboard says unknown/stale, stage expansion held until critical visibility returns |
| OP-M06 | Inject critical incident and unavailable primary operator | Backup acknowledges, stop control operates within accepted target, timeline recorded |
| OP-M07 | Trigger cost threshold without payment fault | Review/optional-cost action, no automatic loss of purchased access |
| OP-M08 | Inspect logs, alert payloads, traces and shared screenshots | No secrets, codes, full customer payloads or paid bodies in public evidence |

## Support and content

| ID | Action | Expected result and proof |
| --- | --- | --- |
| OP-S01 | Rehearse paid-but-pending case | Verified identity/payment, safe reconciliation, no repay instruction |
| OP-S02 | Request account transfer using only forwarded receipt/email | No unauthorised ownership transfer, approved verification path offered |
| OP-S03 | Process authorised sandbox refund with interruption/retry | One intended adjustment, actual provider state and source access reconciled |
| OP-S04 | Rehearse recipe correction/withdrawal | Affected content isolated, manifest/history retained, approved remedy/support route |
| OP-S05 | Compare every launch recipe against approved source/review register | Exact real IDs/revisions, no synthetic content or unreviewed default values |
| OP-S06 | Review final announcement and links in Instagram iOS/Android | Brand/offer accurate, readable path and auth/Checkout recovery, no implied future bundle |
| OP-S07 | Close customer case then reopen with unresolved symptom | Case history/owner retained, resolution metric reflects actual outcome |
| OP-S08 | Hand unresolved cases to backup at end of window | Next action/time/owner known, private data stays restricted |

## Backup, recovery and maintenance

| ID | Action | Expected result and proof |
| --- | --- | --- |
| OP-B01 | Inspect actual backup tier, retention and recovery point | Verified capability and accepted RPO, no unsupported zero-loss claim |
| OP-B02 | Restore representative DB snapshot to isolated target | Schema/auth/catalog/ledger/saves validated, measured recovery time, outbound jobs disabled |
| OP-B03 | Restore recipe files separately and verify protected paths | Storage objects recover with correct access policy, DB metadata alone insufficient |
| OP-B04 | Reconcile post-snapshot provider changes and independent grants | Confirmed payments/refunds recovered, right aggregation correct, non-provider gaps documented |
| OP-B05 | Restore snapshot containing previously deleted optional data | Suppression/deletion records reapplied before exports, no privacy reintroduction |
| OP-B06 | Rotate staging worker/provider credential through approved process | Old credential retired, callbacks/jobs recover, no leaked secret or duplicate processing |
| OP-B07 | Remove temporary operator access and run ownership handoff | Required jobs still work with least privilege, backup operator access verified |
| OP-B08 | Attempt rollback to artifact predating security fixes | Runbook rejects unsafe target and uses stopped-sales forward-fix path |

## Measurement and first month

| ID | Action | Expected result and proof |
| --- | --- | --- |
| OP-A01 | Decline optional analytics and complete sandbox/genuine eligible purchase | No optional capture, authoritative order/access records remain correct |
| OP-A02 | Withdraw consent with queued export and another active tab | Future optional sends suppressed, necessary financial records preserved |
| OP-A03 | Reconcile synthetic totals across two currencies/refund states | Separate currency totals, successful adjustments only, no payout/profit confusion |
| OP-A04 | Review unavailable/stale Instagram data and untagged visit | Unknown/stale labels, no zero-fill or person-level joining |
| OP-A05 | Review seven-day return metric for young cohort | Immature cohort excluded/labeled, browser/consent gaps stated |
| OP-A06 | Review stage conversion with invited and noneligible visitors | Explicit eligible denominator and raw counts, no inflated failure/success inference |
| OP-A07 | Run weekly change decision with sparse data and rising support | One bounded hypothesis, guardrail and owner, no unsupported expansion conclusion |
| OP-A08 | Complete day-30 review and Phase 12 proposal | Operational acceptance separate from demand claim, prior purchase promises preserved |

## Acceptance gates

| Gate | Required record | Hard stop |
| --- | --- | --- |
| L-G01 Candidate and policy | Phase 10 G01–G12 plus D11 decisions | Any unresolved critical/major QA or material commercial gap |
| L-G02 Production readiness | OP-R01–R08 and OP-D01–D04 | Wrong environment, unsafe payment path, missing essential mail/content |
| L-G03 Operating controls | OP-C01–C05, OP-P01–P08, OP-M01–M08 | Unreliable fulfilment, unenforced gate or missing critical visibility |
| L-G04 Recovery and support | OP-D05–D08, OP-S01–S08, OP-B01–B08 | Unsafe rollback, unproven recovery or no case ownership |
| L-G05 Stage expansion | Stage-specific record and OP-C06–C08 | Hard-stop incident, unstaffed window or unmet approved evidence requirement |
| L-G06 First-month closure | OP-A01–A08, routine operations and final review | Unresolved recurring money/access/privacy issue or no ongoing owner |

No routine waiver for incorrect charging, data exposure, unverified rights or unsafe content. Minor exceptions follow Phase 10 rules with impact, workaround, owner and expiry. Optional analytics/Instagram unavailability is acceptable only with tested disabled/unavailable handling.

## Evidence security

The GitHub repository is public. Commit sanitised summaries and synthetic examples only. Keep customer/financial detail, credential references revealing secrets and raw diagnostics in the approved restricted system. Record retention owner and period. A public PR link is not a secure support case store.
