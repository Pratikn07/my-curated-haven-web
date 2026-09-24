# Phase 7: accounts and saved recipes

Status: implementation plan. This documentation does not deliver account features or change live user data.

## Outcome

Parents optionally sign in, save a recipe and find their saved recipes on another device. The three complete free recipes remain readable and printable without an account.

Use **My Curated Haven** and https://mycuratedhaven.com/. Preserve the attribution **Recipes by Tiny Soho, inside My Curated Haven.**

Reuse the existing parenting-app identity and saved-recipe model where the verified project and access rules support the web experience. Do not create a replacement user database or duplicate favourites collection by default.

## Package

| Document | Purpose |
| --- | --- |
| [Implementation plan](IMPLEMENTATION-PLAN.md) | Ordered tasks, file targets and acceptance criteria |
| [Remediation plan](REMEDIATION-PLAN.md) | Fixes required after the Phase 7 implementation. Documentation only |
| [Existing accounts and data](EXISTING-ACCOUNTS-AND-DATA.md) | Native source findings, identity reuse and saved-recipe ownership |
| [Authentication and sessions](AUTHENTICATION-AND-SESSIONS.md) | Email sign-in, cookies, redirects, sign-out and email delivery |
| [Account and saved-recipe experience](ACCOUNT-AND-SAVED-RECIPES.md) | Mobile flows, saved state and account lifecycle |
| [Validation and release](VALIDATION-AND-RELEASE.md) | Security cases, regression checks and release gates |
| [Implementation handoff](IMPLEMENTATION-HANDOFF.md) | PR slices, ownership and evidence checklist |

## Scope

Included: optional sign-in, verified identity, minimal account page, save/remove controls, private saved-recipe list, sign-out, session expiry handling and a verified account-closure support process.

Recommended initial web sign-in: email one-time code. This is a proposed implementation default, not an earlier user decision. Verify compatibility with existing accounts, provider settings and shared email templates before adoption. Preserve access for established native users.

Excluded: child onboarding, milestones, AI chat, social sharing of favourites, offline recipe copies, household accounts, custom account linking and payment collection. Phase 8 owns checkout, purchases and entitlement fulfilment. Saving a recipe never grants paid access.

## Prerequisites

- [Phase 4](../phase-4/README.md): verified backend project, schema, caller identity and recipe access rules.
- Phase 5: existing recipe review and editorial mapping. Its separate plan remains unwritten at this baseline.
- [Phase 6](../phase-6/README.md): the public recipe experience and stable source recipe IDs.
- [Phase 3](../phase-3/README.md): reusable components, theme and mobile accessibility rules.

Frontend work should progress in local and protected preview environments while prerequisites are completed. Enable public account creation only after the identity, email, privacy and access checks pass. Free recipe browsing must survive an authentication outage.

See the [shared index](../README.md) for phase boundaries and delivery status.
