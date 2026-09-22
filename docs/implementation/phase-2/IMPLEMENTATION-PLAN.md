# Phase 2 detailed implementation plan

## Outcome

A developer or coding agent starts from a clean checkout, runs the same checks as CI, reviews a protected preview and follows a documented release path. A failed required check prevents ordinary PR merging.

This phase builds delivery safeguards. The recipe-first product scope remains unchanged.

Application-relative paths below start under `my-curated-haven-web/`. Paths beginning `.github/` or `docs/` are repository-root paths.

## P2-01: verify the baseline and deployment relationship

Owner: engineering. Dependencies: Phase 1 inventory.

1. Fetch current main and read applicable repository instructions.
2. Record the current commit, Node/npm versions, package scripts and lockfile state.
3. Run npm ci, lint and build without changing the lockfile.
4. Record existing failures. Separate failures caused by code from unavailable build-time network access, including next/font downloads.
5. Inspect the linked Vercel project. Record its project identity, application root, install/build commands, runtime, production branch and domain mapping.
6. Identify the production deployment SHA. Do not assume the newest main commit is deployed.
7. Read branch/ruleset configuration and existing check names. Planning found main unprotected, but this is a time-specific observation.
8. Review current framework security advisories and package audit output. The lockfile version is historical evidence, not a recommendation to retain an unsafe release.
9. If a security patch is required, make a focused dependency change with a reviewed lockfile diff and repeat baseline checks. Do not run blanket forced upgrades.

Deliverable: baseline record in the implementation PR.

Acceptance: source, runtime, deployment mapping and pre-existing failures are documented. No production credentials are needed to run the current static marketing app.

## P2-02: standardize runtime and install behaviour

Owner: engineering. Dependencies: P2-01.

1. Select a supported Node LTS version available on the actual host. Node 24 is the proposed major version, subject to host and dependency verification.
2. Pin the tested exact local/CI version in an application .nvmrc file. Document the npm version used and add a packageManager declaration.
3. Set package engines to the selected supported major range. Do not allow unsupported majors through an overly broad range.
4. Match the host major version. If the managed host controls patch updates, record the observed patch rather than claiming byte-identical runtimes.
5. Keep npm and the existing package-lock.json. Do not introduce a second package manager.
6. Use npm ci for clean install in CI. Lockfile mismatch must fail instead of updating dependencies silently.
7. Check the nested application root explicitly in setup instructions and host settings.
8. Add ignores for browser reports and local environment files as needed. Preserve a trackable .env.example.

Deliverable: a clean-checkout setup which another developer reproduces.

Acceptance: installation leaves package.json and package-lock.json unchanged. Local and CI report the selected runtime. Host runtime is compatible and recorded.

## P2-03: define environment boundaries

Owner: engineering. Dependencies: P2-01 and P2-02.

1. Use [ENVIRONMENTS.md](ENVIRONMENTS.md) as the variable contract.
2. Document local, CI, preview and production contexts.
3. Keep the current static-site test path independent of Supabase, Stripe and production user data.
4. Create a comments-only .env.example if no app variables are required. Do not add invented credentials or unused configuration.
5. Document future public-versus-server variables, but do not configure future services during this phase.
6. Verify the repository's ignore rules allow the example file while excluding actual local secrets.
7. Ensure CI logs display variable names or validation outcomes, never values.
8. Keep preview automation credentials out of browser code and untrusted PR jobs.

Deliverable: environment setup instructions with no secret values.

Acceptance: the static build and local browser tests run without production credentials. No new backend access is introduced.

## P2-04: establish explicit quality commands

Owner: engineering. Dependencies: P2-02.

Proposed scripts:

| Script | Intended command or behaviour |
| --- | --- |
| lint | Existing eslint invocation, with changed-code warnings resolved |
| typecheck | next typegen followed by tsc --noEmit |
| build | next build |
| start | next start |
| test:e2e | playwright test |
| test:e2e:ui | playwright test --ui |
| verify | lint, typecheck, build, then test:e2e |

Confirm next typegen support in the installed release before using the script. Generated route types must exist during clean-checkout type checking.

1. Add a compatible pinned @playwright/test development dependency and update the npm lockfile.
2. Keep existing TypeScript strictness and normal build failure behaviour.
3. Install browser binaries through an explicit setup step, not a project postinstall script.
4. Ensure verify builds once before browser tests start a production-mode server.
5. Address actual baseline errors with narrow fixes. Do not disable lint or types to create a green check.
6. Avoid adding unit-test frameworks until there is meaningful isolated logic to test.

Deliverable: a small, documented command surface.

Acceptance: npm run verify succeeds from a clean install, and a failing test propagates a nonzero exit status.

## P2-05: add focused browser coverage

Owner: engineering. Dependencies: P2-04.

1. Create playwright.config.ts with a local base URL, production start command and managed server lifecycle.
2. Use Chromium desktop and a mobile-sized Chromium project initially.
3. Add WebKit coverage for touched mobile navigation before Phase 1 application release. Record an actual iPhone/Safari review separately where available.
4. Test current homepage, About, Support, Privacy and Terms routes for successful loads and usable page structure.
5. Test brand-home navigation, mobile-menu opening and a working Support destination.
6. Check internal navigation destinations without invoking mailto actions or external purchases.
7. Keep Phase 1 deferred-page assertions pending until those source changes land. Introduce them in the same implementation PR as the changed route behaviour.
8. Capture failure evidence from local synthetic tests. Keep preview access credentials out of retained traces.
9. Use semantic locators and observable outcomes. Do not assert whole marketing paragraphs or static arrays against their own values.

Deliverable: tests tied to [TEST-STRATEGY.md](TEST-STRATEGY.md).

Acceptance: the tests detect a broken route or menu interaction, run against a production build, and close the server after execution.

## P2-06: add GitHub Actions CI

Owner: engineering. Dependencies: P2-03 through P2-05.

Create `.github/workflows/web-ci.yml` using [CI-SPECIFICATION.md](CI-SPECIFICATION.md).

1. Run on pull requests targeting main and pushes to main.
2. Give the workflow a stable required job name, proposed `web-quality`.
3. Use the nested app as the run-command working directory and cache npm downloads using its lockfile.
4. Install, lint, generate types, type-check, build and run the focused browser suite.
5. Use minimal read permissions and immutable action references verified against official repositories.
6. Avoid secrets in the local-build job. Do not use pull_request_target to execute PR code.
7. Configure bounded job timeouts, failure artifacts and stale-run cancellation.
8. Start with no path filter. Documentation PRs should receive the same named result rather than leave a required check missing.
9. If merge queue is later enabled, add its event before requiring this workflow on queued merges.

Deliverable: a successful workflow run on the implementation PR.

Acceptance: CI checks the intended checkout and app directory. Logs identify runtime, commit and command results. A job failure blocks the proposed merge gate.

## P2-07: verify protected previews

Owner: engineering with project administrator where required. Dependencies: P2-01, P2-03 and P2-06.

1. Retain the existing Vercel Git integration unless inspection reveals a specific problem.
2. Verify every preview URL used for review has the chosen access protection. A random URL or noindex is not access control.
3. Preserve public access to the production custom domain.
4. Confirm anonymous access is denied before restoring unpublished legacy pages in a shared preview.
5. Confirm an authorized reviewer reaches the intended app deployment and commit.
6. Document preview environment settings and indexing policy.
7. Prefer local browser CI plus authenticated human preview review first. Add automatic protected-preview tests only if needed.
8. If automation is added, bind the trusted deployment to the repository, project, PR and exact commit. Keep bypass credentials away from untrusted code and do not print token-bearing URLs.
9. Do not change paid account features without an identified requirement and authorized purchase.

Deliverable: an authenticated preview URL and recorded anonymous-access check.

Acceptance: protection covers the reviewed host and variants, reviewers retain access, and production remains public.

## P2-08: establish the merge and deployment gate

Owner: repository/project administrator and engineering. Dependencies: first successful P2-06 run.

1. Create or update a main ruleset requiring a PR and the exact successful web-quality check.
2. Require the branch to satisfy the chosen freshness rule, such as being up to date with main, and document how conflicts are resolved.
3. Choose review requirements compatible with the actual team. Do not require an independent reviewer who does not exist.
4. Restrict force pushes and deletion on main. Record existing bypass permissions without expanding them.
5. Treat Vercel deployment success as separate from application test success.
6. Confirm the production branch. If merges trigger automatic deployment, CI must pass before merge because a later push check is too late to prevent deployment.
7. Do not add a second production deployment workflow alongside Vercel Git without a documented switch-over.
8. Run one controlled failing-test check on a disposable PR branch. Verify the check fails and ordinary merge is blocked. Remove the failure and verify recovery.
9. Do not merge the failing branch or alter protections to finish the demonstration.
10. If administrative access is unavailable, record the exact remaining setup and leave Phase 2 externally incomplete.

Deliverable: verified ruleset/check mapping and deployment-trigger record.

Acceptance: the normal merge path refuses the deliberate failure, then permits the corrected commit when requirements pass.

## P2-09: document release and rollback

Owner: engineering. Dependencies: P2-07 and P2-08.

1. Follow [PREVIEW-AND-RELEASE.md](PREVIEW-AND-RELEASE.md).
2. Record the last known-good production deployment and its source SHA.
3. Document how to identify the current deployment and confirm the canonical domain.
4. Use a nonproduction drill or a reviewed walkthrough to verify rollback steps. Do not disrupt production for a test.
5. Define smoke checks for homepage, Support, legal pages and implemented deferred routes.
6. Preserve source and host history. Git rollback and deployment rollback are distinct.
7. Add a PR template covering scope, evidence, preview and rollback.
8. Complete the handoff with actual outcomes, not unchecked claims of completion.

Deliverable: release evidence and a Phase 1 integration handoff.

Acceptance: another operator identifies the deployed SHA, follows smoke checks and locates the rollback target without guessing.

## File map

| Repository path | Planned change |
| --- | --- |
| my-curated-haven-web/.nvmrc | Selected tested Node version |
| my-curated-haven-web/package.json | Runtime declarations and quality scripts |
| my-curated-haven-web/package-lock.json | Reviewed test-tool or security-patch changes |
| my-curated-haven-web/.env.example | Safe environment contract |
| my-curated-haven-web/.gitignore | Example-file exception and test output exclusions |
| my-curated-haven-web/playwright.config.ts | Production-mode browser test setup |
| my-curated-haven-web/tests/e2e/ | Focused route and navigation tests |
| my-curated-haven-web/README.md | Accurate setup and command instructions |
| .github/workflows/web-ci.yml | Required quality job |
| .github/pull_request_template.md | Scope, verification, preview and rollback fields |
| docs/implementation/phase-2/ | Execution evidence added as tasks complete |

Host settings and repository rulesets are external configuration. Record their state without exporting credentials.

## Suggested implementation batches

| Batch | Tasks | Exit condition |
| --- | --- | --- |
| A | P2-01 to P2-04 | Clean install and documented commands |
| B | P2-05 and P2-06 | Browser suite and CI passing |
| C | P2-07 and P2-08 | Preview protection and merge gate verified |
| D | P2-09 | Release runbook and Phase 1 handoff complete |

Keep the first CI workflow reviewable before making its check required. This is the bootstrap step, not permission to bypass an existing rule.

## Completion boundary

This plan is complete as documentation after its links, scope and repository placement are verified. Phase 2 engineering is complete only after all listed execution evidence exists.
