# Detailed Phase 11 implementation plan

## Outcome

Launch the approved recipe product in stages and operate reliably through the first 30 days. A parent should reach three free recipes, understand the one-time offer, buy the defined collection, recover access later and receive useful support. Confirmed purchases must survive provider delays, deployment changes and background-job failures.

Phase 11 consumes [Phase 10 gate evidence](../phase-10/DEFECTS-AND-RELEASE-GATES.md). It does not waive QA, recreate the parenting database or add unrelated parenting tools. Source fixes discovered during readiness go into focused implementation PRs with regression tests.

All tasks start pending. Numbers in supporting runbooks are proposed operating targets until accepted in D11-08–D11-10. Do not schedule a public announcement before prerequisites have owners and evidence.

### P11-01: accept the release candidate and decisions

**Owner:** release lead and product owner. **Depends on:** executed Phase 10 gates.

- Refresh main, open fixes, production deployment identity and the baseline findings B01–B07.
- Record candidate SHA, build ID, migration head, manifest hash, free recipe revisions, provider mode and policy versions.
- Close D11-01–D11-12 for the relevant stage. Treat fixture prices and historical evidence separately from approval.
- Create the release register, responsibility table and exception log.

**Targets:** Phase 11 execution records and Phase 10 sign-off links. **Done when:** an exact candidate and approved scope have accountable owners, with no unresolved hard launch gate.

### P11-02: close payment and environment blockers

**Owner:** commerce/backend engineer. **Depends on:** baseline inspection, before production configuration.

- Fix B01–B05 through the Phase 8 design and Phase 10 regression matrix.
- Reject unsigned/noncanonical payment claims, confine simulation to explicit isolated tests and fail closed on missing nonlocal credentials.
- Preserve real provider IDs, account/mode and authoritative amounts through payment/refund processing.
- Verify new Supabase hardening against native clients and all body/storage paths.

**Targets:** `src/lib/payments/`, `src/app/api/stripe/webhook/route.ts`, commerce SQL and integration tests. **Done when:** specific fixes and real sandbox evidence close each finding. Updating a status label is insufficient.

### P11-03: create the production configuration record

**Owner:** engineering. **Depends on:** P11-01/P11-02.

- Inventory Vercel project/root/build/runtime, official domain, product Supabase project, mail sender, Stripe account and secret store.
- Separate development, preview, staging and production. Restrict who changes configuration.
- Check public build-time values versus runtime secrets. Record redeployment requirements and rotation owner.
- Prepare startup/readiness checks proving recipe and commerce dependencies, not only homepage response.

**Targets:** environment validation modules, deployment settings inventory, [readiness checklist](PRODUCTION-READINESS.md). **Done when:** every required value has a verified non-secret reference, owner and validation result.

### P11-04: prepare auth email, customer receipts and support routing

**Owner:** engineering and support. **Depends on:** P11-03.

- Configure a production-suitable auth mail service, approved sender/domain and safe redirect origins.
- Validate OTP delivery, expired/resend paths and rate-limit behaviour with authorised recipients.
- Assign payment receipt responsibility and purchased-access message responsibility. Deduplicate retries.
- Verify support mailbox routing, staffing and escalation using authorised tests.

**Targets:** Supabase auth/provider configuration, Phase 7 auth UI, transactional outbox and support runbook. **Done when:** delivery and bounce/error handling have evidence. A mailto link or local mail sink is insufficient.

### P11-05: freeze and publish the approved content/offer

**Owner:** editorial and commerce. **Depends on:** D11-01–D11-05, P11-02.

- Compare every launch member with reviewed parenting source IDs/revisions, images and storage paths.
- Confirm exactly three complete free recipes and the immutable paid manifest.
- Prepare reviewed, targeted publication changes with a dry-run diff. Exclude synthetic seed data.
- Match collection copy, one-time Stripe Price, receipt, refund and future-access wording.

**Targets:** existing catalog/release tables, private offer/manifest, public copy and publication record. **Done when:** approved content and commercial configuration agree end to end, with no invented count or price.

### P11-06: deploy durable commerce operations

**Owner:** backend engineer. **Depends on:** P11-02/P11-03.

- Implement verified inbox receipt, independent worker, abandoned-work recovery and periodic canonical reconciliation.
- Register an authenticated scheduler or durable queue with concurrency limits, bounded retries and operator visibility.
- Separate critical fulfilment from optional analytics and customer-message delivery.
- Prove no-return fulfilment, worker outage recovery and refund/dispute reconciliation.

**Targets:** new worker/scheduler entrypoints, deployment configuration, Phase 8 ledger functions, [job contracts](PAYMENTS-AND-BACKGROUND-JOBS.md). **Done when:** jobs run without browser traffic and recover from controlled faults without duplicate business effects.

### P11-07: implement server-enforced rollout controls

**Owner:** commerce engineer. **Depends on:** P11-02/P11-06.

- Add a private rollout record with disabled/invited/open modes, version and audited editor.
- Enforce invitation eligibility using verified UUIDs before checkout reservation and provider creation.
- Keep existing owners' access, refunds and fulfilment independent of new-sale eligibility.
- Default new checkout off when configuration is missing/unavailable. Test propagation on all serving instances.

**Targets:** proposed rollout storage/adapter, checkout route/service, collection CTA and operator controls. **Done when:** direct POSTs from noneligible users fail and stopping checkout takes effect within the accepted target. A hidden URL does not count.

### P11-08: establish monitoring and escalation

**Owner:** engineering/release lead. **Depends on:** P11-03/P11-06/P11-07.

- Implement the signals, definitions and thresholds in [monitoring](MONITORING-AND-INCIDENTS.md).
- Track independent provider-versus-ledger reconciliation, backlog age, failed reads, auth delivery, successful-payment access delay and job freshness.
- Add route/content-aware uptime checks and test alert delivery to primary and backup.
- Define missing-data behaviour and cost controls. Keep customer data out of public logs and dashboards.

**Targets:** restricted operations queries, monitoring provider, alert routing and dashboard. **Done when:** injected staging faults alert the named owner and recovery clears the signal with evidence.

### P11-09: rehearse promotion, stop and rollback

**Owner:** release engineer. **Depends on:** P11-03–P11-08 and Phase 10 QA-O cases.

- Rehearse candidate build/promotion with the intended environment and domain strategy.
- Verify database-compatible rollback target, current flags and retained security fixes.
- Demonstrate checkout stop with an open hosted Session and a confirmed pending purchase.
- Record actual operator steps, access requirements and timings.

**Targets:** [release runbook](RELEASE-AND-ROLLBACK.md), deployment evidence and compatibility table. **Done when:** rollback preserves valid ownership and does not reopen legacy access or simulated payments.

### P11-10: prove backup and recovery coverage

**Owner:** backend/operations engineer. **Depends on:** P11-05/P11-06.

- Verify actual backup/PITR entitlement, retention, latest recovery point and storage-object coverage.
- Restore to an isolated target with outbound jobs disabled. Reconcile post-snapshot provider events and independent rights sources.
- Measure recovery time/data gap for ledger, auth, saved recipes, content and files separately.
- Document credential/configuration restoration and privacy deletion records needing reapplication.

**Targets:** backup inventory, restricted recovery scripts and rehearsal record. **Done when:** restoration and reconciliation pass, with accepted recovery objectives supported by evidence.

### P11-11: prepare support and content-correction procedures

**Owner:** support and editorial. **Depends on:** P11-04/P11-05/P11-08.

- Prepare case intake, minimal identity verification, severity, response targets and escalation.
- Rehearse paid-but-pending, wrong account, refund, duplicate attempt and unsafe/inaccurate recipe reports.
- Use audited source grants and approved refund workflow. Never ask customers for passwords, OTPs or card numbers.
- Define urgent recipe withdrawal, owner communication and preserved purchase history.

**Targets:** support runbook, response templates and correction register. **Done when:** a second operator completes the rehearsal from written instructions without undocumented database edits.

### P11-12: complete final production preflight

**Owner:** release lead. **Depends on:** P11-01–P11-11.

- Match tested SHA/schema/manifest/policies to the production-target artifact.
- Confirm CI, Phase 10 gates, operator coverage, provider readiness and rollback candidate.
- Run read-only production checks with new checkout disabled. Check real recipes and sign-in configuration, not only the landing page.
- Produce a concrete stage-entry packet for the authorised rollout decision.

**Targets:** stage L1 record and [validation](VALIDATION-AND-ACCEPTANCE.md). **Done when:** all hard prerequisites pass and the release lead records go/no-go. Do not run test card payments in live mode.

### P11-13: release the invited cohort

**Owner:** release/product/support. **Depends on:** P11-12 and approved L2 entry.

- Enable invited checkout for a bounded list of verified users with staffing in place.
- Send only authorised invitations with truthful offer and support information.
- Observe genuine purchases, no-return fulfilment, delivery and support signals.
- Keep a decision log, pause new sales on hard-stop conditions and honour valid existing purchases.

**Targets:** rollout record, cohort register and launch evidence. **Done when:** L2 exit criteria pass or a documented hold/stop occurs. Lack of purchases is inconclusive, not proof of reliability.

### P11-14: expand through limited and wider release

**Owner:** release/product/marketing. **Depends on:** P11-13 evidence and stage approval.

- Expand to the next approved invited cohort, then open public checkout only after stage gates pass.
- Publish approved Tiny Soho placements with registered campaign tags and three-free-recipe entry path.
- Record external post/link references, exposure time, support staffing and operational state.
- Stop future promotion separately from checkout if traffic/support pressure rises.

**Targets:** L3/L4 stage records, campaign registry and approved communication package. **Done when:** wider availability is intentional, measured and reversible at the new-sale boundary.

### P11-15: operate the first 72 hours

**Owner:** engineering and support. **Depends on:** L2 onward.

- Review alert freshness, paid/access mismatches, refund cases and mail health at the staffed cadence.
- Reconcile provider and ledger totals by currency and resolve every paid-without-access case.
- Track support load and repeated confusion before changing copy.
- Log all configuration/content changes and repeat affected checks.

**Targets:** daily operations log and incident/defect register. **Done when:** outstanding money/access issues have owners and no unacknowledged critical alert remains between handoffs.

### P11-16: run weekly product and cost reviews

**Owner:** product, analytics and commerce. **Depends on:** P11-15 and sufficient observation.

- Use [first-30-days definitions](FIRST-30-DAYS.md) for free usage, qualified purchase funnel, paid access, repeat use and support.
- Keep consented behavioural denominators separate from all-order financial totals and Instagram reach.
- Review refunds/fees, hosting/database/mail costs and operator workload without confusing cash balance with profit.
- Choose one bounded improvement with a hypothesis and guardrail. Avoid concurrent price/content/CTA changes.

**Targets:** weekly decision record and ranked improvement backlog. **Done when:** decisions state sample size, cohort maturity, uncertainty and owner.

### P11-17: stabilise routine operations

**Owner:** operations/release lead. **Depends on:** P11-15/P11-16.

- Confirm scheduled jobs, retries, retention, backup freshness, renewal/expiry ownership and access reviews.
- Close recurring incidents with regression proof and update runbooks.
- Remove temporary privileged access and test records according to approved retention, preserving financial audit requirements.
- Move from staffed launch monitoring to the agreed ongoing coverage, with explicit gap handling.

**Targets:** operational checklist, access inventory and maintenance calendar. **Done when:** routine operations no longer depend on one person's memory or an open browser.

### P11-18: close Phase 11 and hand evidence to Phase 12

**Owner:** product/release lead. **Depends on:** final acceptance gates and first-30-days review.

- Publish a sanitised release summary, stage history, unresolved limitations and operational ownership.
- Compare actual outcomes with the launch hypothesis, including nonbuyers and support feedback without overclaiming tiny samples.
- Prioritise recipe improvements before unrelated features where evidence supports them.
- Draft Phase 12 options for gradual parenting expansion. Do not bundle future tools into prior purchases without a new approved promise.

**Targets:** final handoff and Phase 12 decision inputs. **Done when:** operation is accepted, evidence is traceable and expansion work has a separate scope decision.

## Dependency groups

| Group | Tasks | Exit |
| --- | --- | --- |
| Trust and readiness | P11-01–P11-05 | Approved candidate, safe commerce and production configuration |
| Operating controls | P11-06–P11-11 | Jobs, rollout gate, alerts, recovery and support |
| Staged launch | P11-12–P11-14 | Deliberate production entry and evidence-led expansion |
| First month | P11-15–P11-18 | Stable service, reviewed outcomes and Phase 12 handoff |

Assign durations only after resolving blockers and provider setup. Observation windows start after stage entry, not after the plan merge. No fixed launch date follows from this document.
