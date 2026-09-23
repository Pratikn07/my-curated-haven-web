# Phase 9 implementation handoff

## Suggested PR sequence

| PR | Tasks | Review focus |
| --- | --- | --- |
| A: inventory and privacy foundation | P9-01, P9-02 | Source verification, legacy search access, native compatibility, decisions |
| B: contracts and consent | P9-03, P9-04 | Allowlisted payloads, optional provider isolation, mobile preferences |
| C: recipe and account measurement | P9-05, P9-06 | Accurate triggers, identity limits, no product regressions |
| D: business outcomes and attribution | P9-07, P9-08 | Payment truth, consent-aware export, separate Instagram reporting |
| E: reports and operational checks | P9-09, P9-10 | Defined denominators, currency/time boundaries, freshness and reconciliation |
| F: release evidence and review process | P9-11, P9-12 | End-to-end evidence, switches, owners and next-phase handoff |

These are implementation slices, not a requirement to deliver unfinished public UI between PRs. Keep unfinished integrations disabled. Rebase onto the current repository implementation rather than creating duplicate Phase 6–8 services.

## Decisions before activation

| Decision | Proposed starting point | Owner |
| --- | --- | --- |
| Analytics provider and region | One managed provider, PostHog proposed, region verified before setup | Founder and engineering |
| Spend ceiling | Set after expected event volume and current provider pricing are reviewed | Founder |
| Optional tracking policy | Off until accepted, easy withdrawal, no replay | Founder and privacy reviewer |
| Retention | 90-day raw optional events, 13-month safe aggregates, enforceability verified | Founder and engineering |
| Attribution | Registered campaign within current consented session | Founder |
| Reporting timezone | UTC initially, consistently labelled | Founder |
| Legacy search compatibility | Restrict raw data and preserve only reviewed native requirements | Engineering |
| Instagram export | Separate, read-only, aggregate workflow | Instagram system owner |
| Phase 8 integration | Use actual ledger, checkout and entitlement transition contracts | Payments implementer |
| Operational response | Named owner and tested alert routing | Founder and engineering |

Product price, currency, paid membership, refunds and future recipe additions remain Phase 8 commercial inputs. Phase 9 records the final decisions as dimensions where appropriate and does not choose them.

## Access needed during implementation

The current planning work needs no credentials. Implementation will require the verified product Supabase connection, separate read-only Instagram reporting access, the approved analytics workspace, deployment configuration access and Phase 8's test-mode payment environment. Grant only the required access through connected services or secret settings. Never place keys in these documents.

## Completion evidence

- Implementation PRs, merged SHA and deployed environment.
- Final event schema, provider settings and approved consent/retention policy.
- Effective-grant and access-test results for the legacy search finding.
- Feature-by-feature status for Phases 6, 7 and 8 rather than a blanket completion claim.
- Validated dashboard queries, reconciliation fixtures and restricted report links.
- Campaign registry, verified Instagram source contract and refresh evidence.
- Sanitised mobile journeys, withdrawal/deletion checks and outage tests.
- Named owners, disable-switch instructions and first review date.

Phase 10 receives a launch measurement checklist. Phase 11 receives reporting and recovery procedures. Phase 12 receives observed demand and uncertainty, not an automatic instruction to expand the parenting product.

Documentation merge means the plan is available. It does not mean tracking, payments or Instagram reporting are live.
