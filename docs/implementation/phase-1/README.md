# Phase 1 implementation package

[All implementation plans](../README.md) · [Phase 2 foundation plan](../phase-2/README.md)

Status: planning documents only. Application changes and deployment are not completed by this package.

## Outcome

Preserve My Curated Haven's existing website and prepare its public surface for a recipe-first launch. Keep deferred parenting pages available in source control without exposing unfinished offerings to visitors.

The application already uses Next.js. Phase 1 does not replace Expo with Next.js or rebuild the entire parenting app. Mobile product design, recipes, accounts, payments, and backend migration follow later.

## Read in order

1. [Product decisions and scope](PRODUCT-SCOPE.md)
2. [Detailed implementation plan](IMPLEMENTATION-PLAN.md)
3. [Route and preservation inventory](ROUTE-INVENTORY.md)
4. [Content and claims review](CONTENT-REGISTER.md)
5. [Acceptance tests and release checklist](VALIDATION-AND-RELEASE.md)
6. [Implementation handoff](IMPLEMENTATION-HANDOFF.md)

## Evidence baseline

- Repository: Pratikn07/my-curated-haven-web.
- Main commit reviewed: eb5d5b7c27fbda31586fdfcc96c6b1fbc2921caf.
- Repository root contains the application directory `my-curated-haven-web/`.
- Next.js dependency declared as ^16.0.7, React 19.2.0, Tailwind CSS 4, TypeScript.
- Package scripts: dev, build, start, lint. No test script or GitHub Actions workflow found in the reviewed tree.
- No AGENTS.md found in the reviewed repository tree. Recheck before implementation.
- Existing submodule entries: parenting_app and SuperClaude_Framework. Preserve both.
- Source review is not proof of deployed behaviour, working native products, business claims, or current hosting settings.
- The live domain must be checked again before implementation and before release. This package records source findings, not a fresh live-site audit.

## Phase boundaries

| Phase | Purpose |
| --- | --- |
| 0 | Confirm product decisions and unresolved commercial terms |
| 1 | Preserve existing work, control public routes, align navigation and claims |
| 2 | Establish repeatable development, CI, preview and deployment checks |
| 3 onward | Mobile design system, backend, recipes, accounts, payment, analytics and launch |

Phase 1 inventory starts immediately. Phase 1 code release depends on the minimum build, preview and rollback safeguards from Phase 2. Do not publish recipe or checkout links before their destinations work.

## Definition of complete

All Phase 1 acceptance checks pass against a recorded implementation commit and preview deployment. Deferred page source is preserved. Public navigation has no dead links. No unsupported availability or purchase promises remain on the revised public surface. Release evidence and rollback instructions accompany the implementation PR.

This documents package does not itself satisfy those checks.
