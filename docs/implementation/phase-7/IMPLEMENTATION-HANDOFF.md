# Phase 7 implementation handoff

## Start here

Read the [detailed plan](IMPLEMENTATION-PLAN.md), [source reuse requirements](EXISTING-ACCOUNTS-AND-DATA.md) and [release checks](VALIDATION-AND-RELEASE.md).

The task is optional accounts and saved recipes. Preserve anonymous access to all three free recipes. Reuse existing identity and saved-data authority where verified. Do not rebuild the parenting catalog or require child onboarding.

## Completion tracker

| Task | Initial status | Evidence |
| --- | --- | --- |
| P7-01 | Pending | Verified project, providers, saved schema and reuse decision |
| P7-02 | Pending | Routes, auth states and mobile flow review |
| P7-03 | Pending | Request-scoped identity, cookie and cache checks |
| P7-04 | Pending | Sign-in, delivery, abuse and native compatibility tests |
| P7-05 | Pending | Owner-only persistence and idempotency checks |
| P7-06 | Pending | Confirmed Save/Remove, failure and expiry behaviour |
| P7-07 | Pending | Private list, cross-device refresh and unavailable items |
| P7-08 | Pending | Account page, local sign-out and closure procedure |
| P7-09 | Pending | Navigation, indexing and privacy regression checks |
| P7-10 | Pending | Required CI, release evidence and rollback reference |

## Decisions during implementation

| Topic | Proposed default | Evidence needed |
| --- | --- | --- |
| Sign-in | Email one-time code | Existing-provider and shared-template compatibility |
| Identity | Existing verified auth project | Project ownership, user continuity and access review |
| Bookmarks | Existing saved_recipes relation | Current schema, policies and ID mapping |
| New web Save eligibility | Published free recipes | Compatibility with broader native bookmark access |
| Account fields | Verified email only | Optional name only with a concrete use |
| Cross-device updates | Refresh/return to page | No real-time subscription required |
| Account closure | Verified support-assisted process | Explicit shared-account scope and tested runbook |

Proceed with independent UI work when a backend dependency is blocked. Use synthetic fixtures only in local and protected preview environments. Record blockers without claiming implementation completion.

## Phase 8 handoff

Provide the verified auth UUID, secure session helpers, protected-route conventions and tested identity continuity. Phase 8 defines checkout, payment events, purchased collection access, refunds and order records.

Do not equate signed-in, saved or profile-complete state with ownership of paid recipes. Customers must not write entitlements.

Before paid sales, revisit account deletion, retained transaction data and access recovery. Do not invent a refund policy or permanent access promise in Phase 7.

## Ownership

Product/content owner approves account wording and expected native/web continuity. Technical owner verifies identity, policy changes, delivery configuration and cache behaviour. Support owner maintains the verified closure and recovery procedure.

Do not ask the user to reapprove the established brand, three-free-recipe scope or one-time paid model. Escalate concrete incompatibilities with a documented proposed resolution.

## Documentation scope

This package contains planning only. No new users, test emails, saved rows, provider changes, application routes or database migrations are created by merging these documents.
