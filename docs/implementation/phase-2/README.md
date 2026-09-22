# Phase 2: development and release foundation

[All implementation plans](../README.md)

Status: implementation plan only. This documentation merge does not install CI, change hosting settings, configure secrets or deploy new application behaviour.

## Goal

Make each later change reproducible, testable and reviewable before reaching My Curated Haven's production site.

## Read in order

1. [Detailed implementation plan](IMPLEMENTATION-PLAN.md)
2. [Runtime and environment contract](ENVIRONMENTS.md)
3. [CI and merge-gate specification](CI-SPECIFICATION.md)
4. [Test strategy and acceptance matrix](TEST-STRATEGY.md)
5. [Preview, release and rollback runbook](PREVIEW-AND-RELEASE.md)
6. [Implementation handoff and task checklist](IMPLEMENTATION-HANDOFF.md)

## Verified starting point

- Repository: Pratikn07/my-curated-haven-web.
- Source baseline after Phase 1 plan merge: 20a02721f90721a38829e272981c403e7600e6f9.
- Application directory: `my-curated-haven-web/`.
- Lockfile resolves Next.js 16.0.7 and React 19.2.0.
- Package scripts are dev, build, start and lint. No test script or Actions workflow was found in the inspected application baseline.
- TypeScript strict mode is enabled.
- Root layout uses Google-hosted fonts through next/font.
- GitHub reports a successful Vercel deployment for Phase 1 head 11ec544edc2e222d669a5407cb7e89cc525f337f.
- GitHub reports main as unprotected and returned no repository rulesets during planning.
- Phase 1 plan merged through PR #1. Its application tasks have not been executed by this work.

Vercel integration is evidenced. Exact project settings, account plan, preview protection, runtime, production branch mapping and current domain deployment still require inspection. A successful deployment status does not prove functional browser tests or protected access.

## Dependencies and completion

Phase 2 uses [Phase 1 route expectations](../phase-1/ROUTE-INVENTORY.md), but must not test future behaviour as though already implemented.

Bootstrap with tests for working current routes. Add deferred-route and new navigation assertions in the Phase 1 implementation PR which introduces those behaviours.

Phase 2 is complete after a clean checkout passes the required checks, CI rejects a deliberate failing test, a protected preview is verified, the production release path is documented, and merge requirements are configured and verified. Missing administration access must be reported as incomplete external setup.

## Scope

Include runtime pinning, reproducible installation, meaningful browser tests, CI, environment documentation, preview protection, merge checks and rollback evidence.

Exclude recipe schemas, Supabase migrations, Stripe configuration, login, design-system replacement and native-app migration.

## Evidence date

Repository and official documentation reviewed on 2026-09-22. Recheck installed package compatibility, security advisories and host capabilities before execution.
