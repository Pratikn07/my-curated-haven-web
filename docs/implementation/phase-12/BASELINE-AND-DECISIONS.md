# Baseline and decisions

## Evidence boundaries

Reviewed web main at `6d43d8f1cf75510d82fda00105998ff1875b954d`, after PR #28. Reviewed native main at `5e5caa73f5a5d0705572739dd881a96abe9be23b`. This review inspected repository source and previous evidence files. No live database query, real customer interview, production payment or launch measurement formed part of this planning change.

Earlier documents describe different project arrangements at different dates. Phase 4 discusses a separate backend, while later Phase 7/8 records refer to hosted project `ccrgvammglkvdlaojgzv`. Treat neither as a substitute for a fresh environment map. Verify which web and native deployments consume each project, which repository owns migrations and which identity provider supplies each user UUID.

## Findings

| ID | Observed evidence | Phase 12 consequence |
| --- | --- | --- |
| B12-01 | Web already uses Next.js, with recipes, accounts, collection and checkout routes | Extend the current app. No framework conversion is required |
| B12-02 | `src/styles/tokens.css` contains the Phase 3 cream, terracotta, sage and accessible action tokens | Reuse tokens and UI primitives, review only new layouts |
| B12-03 | PR #28 added access-gated saves, signup disclosure and closure-request wording | Preserve these fixes. Phase 7 evidence still records the hosted migration and native sign-in compatibility as pending |
| B12-04 | `src/app/api/stripe/webhook/route.ts` still parses unsigned JSON when the verification branch is skipped | Phase 8 remediation remains a source-level prerequisite for paid launch. Do not treat a merged plan as a fix |
| B12-05 | `src/lib/payments/config.ts` still enables checkout unless explicitly false and supplies mock defaults | Recheck nonlocal fail-closed behaviour and fulfilment before customer expansion |
| B12-06 | Phase 11 documents staged launch and operations, with execution pending | No first-month success or retention figure is available from those plans |
| B12-07 | Native recipes, saved recipes, profiles, milestone and tips source exists | Reuse selectively after contract and access review, rather than inventing parallel systems |
| B12-08 | Native chat handler reads body `userId` with a service-role client after checking only header presence in the inspected handler | Do not reuse this authorisation pattern. Deployed reachability and impact need separate verification |
| B12-09 | Native child and recipe preference stores use AsyncStorage | Do not copy private child state into browser local storage as a shortcut |
| B12-10 | No weekly planner implementation surfaced in the inspected native `src` and migration filename/text searches | Planner persistence is proposed new functionality. Confirm the inventory before creating tables |
| B12-11 | Web generated types include legacy child and milestone tables | A generated type proves a schema contract exists in the generation source, not approval to expose those records |
| B12-12 | `src/proxy.ts` blocks deferred routes and preserves private account caching | Keep the public route boundary. Navigation removal alone does not protect a pilot |

Web paths in this package are relative to `my-curated-haven-web/` unless prefixed with repository-root `supabase/` or `docs/`. Native paths belong to `Pratikn07/parenting-app` and are reference targets, not edits authorised by this documentation PR.

## Entry levels

| Level | Allowed work | Required evidence |
| --- | --- | --- |
| Planning now | Inventory, synthetic prototypes, research scripts and decision templates | Existing product scope and source baseline |
| Research | Approved recruitment and review of existing product feedback | Research purpose, channel permission, retention owner and Phase 11 operating context |
| Feature implementation | Local/staging work on one selected slice | Problem evidence, selected scope, data/access design, budget and owners |
| Customer pilot | Real exposure to a bounded cohort | Phase 10/11 prerequisites, feature acceptance, operational coverage and release approval |
| Wider release | Routine availability | Mature pilot evidence, commercial clarity and explicit rollout decision |

Research without private production data proceeds while launch preparation is incomplete. Customer pilots must not conceal unresolved recipe payment, access or content defects. Security repair stays on the existing remediation track.

## Decision register

All rows start **pending**. Recommendations below are proposals, not approved commitments.

| ID | Decision | Proposed starting point | Accountable role | Blocks |
| --- | --- | --- | --- | --- |
| D12-01 | Recipe operation meets expansion entry | Phase 11 closure or an explicit evidence-backed continuation record | Product owner + operations | Customer pilot |
| D12-02 | Problem and target segment | One recurring recipe-adjacent job | Product owner | Scope selection |
| D12-03 | Selected route | Compare improve, planner, reviewed resources and hold | Product owner | Build |
| D12-04 | Pilot access and duration | Opt-in free research access, no new charge, proposed 28 days | Product owner | Invitation copy and gate |
| D12-05 | Primary metric and decision floor | Pre-register counts, mature window and guardrails | Product + measurement | Pilot |
| D12-06 | Project and migration authority | Verified existing product system | Engineering lead | Shared DB change |
| D12-07 | Identity and native compatibility | Reuse verified auth UUIDs and preserve valid rights | Engineering + native maintainer | Shared release |
| D12-08 | Data and retention | Account-level recipe IDs only for initial pilot | Product + privacy owner | Persistence |
| D12-09 | Feature owner, support and cost ceiling | One owner and backup, explicit engineering/operating budget | Product + operations | Build/pilot |
| D12-10 | Editorial responsibility | Review content and reject unsupported health claims | Content owner | Content release |
| D12-11 | Route and navigation | `/account/meal-plan` only if planner selected | Product + design | UI implementation |
| D12-12 | Commercial extension | No subscription or new offer by default | Business owner | Any paid extension |
| D12-13 | Pilot end and data handling | Notice, export/delete window and retention decision before recruitment | Product + operations | Pilot |
| D12-14 | Expansion outcome | Continue, revise, retire or hold, supported by evidence | Product owner | Phase closure |

One person might fill several roles. Name the person and backup in execution records. A role label alone is not operational ownership.

## Sources to recheck

Repository sources are the authority for observed code. Provider documentation was checked on 2026-09-24 for design constraints: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [API security](https://supabase.com/docs/guides/api/securing-your-api), [user management](https://supabase.com/docs/guides/auth/managing-user-data) and [changelog](https://supabase.com/changelog). The markdown changelog endpoint failed through the web reader, so HTML was inspected. Recheck relevant breaking changes before implementation, including monitoring API changes. No provider upgrade is required by this plan.
