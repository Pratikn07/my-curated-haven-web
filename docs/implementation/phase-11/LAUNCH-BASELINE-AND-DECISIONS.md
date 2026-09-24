# Launch baseline and decisions

## Verified source baseline

Repository: `Pratikn07/my-curated-haven-web`. Main at inspection: `fca003c0c274a6530440f93a6bc5a070bb7b8933` on 2026-09-24.

| Area | Source evidence | Phase 11 implication |
| --- | --- | --- |
| Free recipes | Phase 6 source and historical evidence | Keep anonymous read/print available throughout rollout |
| Accounts | Phase 7 merged in PR #15 | Verify deployed OTP delivery and existing UUID continuity |
| Commerce | Phase 8 merged in PR #18 | Source exists, but findings below block paid launch until resolved |
| Analytics | Phase 9 merged in PR #20 | Optional capture/export defaults off. Provider and Instagram readiness remain separate |
| Launch QA | Phase 10 plan merged in PR #17 | Require executed G01–G12 evidence for the actual release candidate |
| Access hardening | PR #19, `e58cbb7`, adds migration `20260924120000_phase4_access_hardening.sql` | Legacy recipe reads, release sealing and access errors have newer fixes. Verify deployed migration and native compatibility |
| Missing configuration | PR #21, `fca003c`, preserves marketing pages while recipe clients fail closed | An HTTP 200 homepage is insufficient evidence of a healthy recipe product |

This is a source review. No fresh production database, Stripe dashboard, mail provider, DNS or customer records were inspected while writing the plan. A prior implementation evidence file does not prove production configuration or commercial approval.

## Outstanding source findings

Paths below are relative to `my-curated-haven-web/` unless specified otherwise. Revalidate before fixing. Record a resolved finding only with a commit and boundary test.

| Finding | Observed source | Required resolution before paid release |
| --- | --- | --- |
| B01 Unsigned webhook fallback | `src/app/api/stripe/webhook/route.ts` parses JSON when the signature is missing, including configured Stripe deployments | Reject missing/invalid signatures outside explicit isolated tests. Verify raw-body signing, account and mode |
| B02 Simulated checkout outside explicit test guard | `src/lib/payments/config.ts` supplies mock keys and enables checkout unless false. Checkout/fulfilment include mock session paths | Nonlocal missing configuration fails closed. Mock-prefixed sessions never create production rights |
| B03 Incomplete payment truth verification | `fulfilment.ts` accepts session completion as an alternative to paid status, fabricates charge references in paths and records test mode in return reconciliation | Verify canonical provider objects, actual account/mode/amount/currency/price, genuine IDs and approved delayed-method handling |
| B04 Durable worker/scheduler not established by inspected source | Webhook invokes fulfilment inline. No dedicated worker deployment or scheduler manifest was found in the inspected repository | Implement and prove independently scheduled retry/reconciliation, leases, recovery and backlog alerts. Do not depend on a customer return page |
| B05 Commerce configuration fallback | `repository.ts` falls back to `DATABASE_URL`, then local postgres credentials | Explicit environment validation, restricted commerce role and verified project identity. No production localhost fallback |
| B06 Operational paging and provider readiness | Phase 9 evidence leaves paging route, PostHog project and Instagram credential unset | Establish required commerce paging. Keep optional reporting disabled/unavailable until ready |
| B07 Synthetic content/commercial evidence | Local seeds/tests use synthetic recipes and a $15 offer | Approve actual catalog/manifest and commercial settings independently. Never deploy test seed as the launch catalog |

These findings identify implementation and verification work, not a claim of an exploited production vulnerability. Treat B01–B05 as hard paid-launch blockers. B06's commerce alerts are required. Its optional analytics/Instagram parts do not block a safe recipe launch when disabled.

The new access-hardening fixes supersede older Phase 10 observations about source lacking those fixes. Preserve historical evidence, then execute the latest direct-access tests and verify native use before production migration. Do not roll back hardening to recover an old client.

## Decision register

Every entry needs a named owner, value, approval date and version before the affected stage. Values below describe requirements, not decisions already approved.

| ID | Decision | Owner role | Required before |
| --- | --- | --- | --- |
| D11-01 | Exact paid manifest, count, content revision and included print formats | Product/editorial | Production offer preparation |
| D11-02 | Price, currency, tax presentation and eligible selling regions | Product/commerce | Stripe live offer configuration |
| D11-03 | Refund policy, partial refunds, dispute handling and customer wording | Commerce/support | Invited paid cohort |
| D11-04 | Future additions, updates, hosted access duration and discontinuation process | Product | Publishing the offer |
| D11-05 | Merchant identity, receipt descriptor, support address and payout administration | Commerce | Genuine paid sales |
| D11-06 | Production host/project, auto-deploy behaviour, domain and rollback target | Engineering | Production preparation |
| D11-07 | Product DB identity, native compatibility, backups and measured recovery objectives | Engineering | Migration/promotion |
| D11-08 | Staffed launch windows, operator/backup, customer response target | Release/support | First cohort invitation |
| D11-09 | Cohort sizes, observation windows and server eligibility policy | Release/product | Invited launch |
| D11-10 | Monitoring thresholds, provider budget ceiling and escalation contacts | Engineering/product | Traffic expansion |
| D11-11 | Optional analytics provider/region/retention and campaign registry | Product/privacy owner | Optional capture/export |
| D11-12 | Launch message, channels, timing and sender | Product/marketing | External announcement |

Use approved policy from Phase 8 rather than creating conflicting terms here. Route jurisdiction-specific tax, refund and privacy questions to the appropriate business adviser. This plan supplies no legal determination or invented refund entitlement.

## Roles and authority

- Product owner approves offer, commercial promises, cohorts and external communications.
- Release lead checks evidence, records each stage decision and coordinates rollback.
- Engineering owns configuration, migration, payment recovery, monitoring and incident containment.
- Editorial approves recipe content, images, allergens and corrections.
- Support owns customer cases, escalation and policy-consistent responses.

One person might hold multiple roles. Record coverage and a backup. Never begin a sales cohort while the only operator is unavailable.

The present user request authorises writing/pushing the plan and merging its PR. Operational implementation, production mutations and announcements need their applicable execution authority. Existing approval in a later implementation session should be honoured without repeated confirmation. Prepare concrete configurations and release evidence before requesting any missing final launch decision.
