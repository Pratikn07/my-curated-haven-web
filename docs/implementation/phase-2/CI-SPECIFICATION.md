# CI and merge-gate specification

This is a workflow design, not an installed workflow. No Actions configuration is changed by publishing this document.

## Trigger and identity

| Setting | Proposed value |
| --- | --- |
| File | .github/workflows/web-ci.yml |
| Workflow name | Web CI |
| Required job name | web-quality |
| Events | pull_request targeting main, push to main |
| Optional manual use | workflow_dispatch |
| Permissions | contents: read |
| Runner | Supported pinned Ubuntu runner label |
| Command directory | my-curated-haven-web |
| Timeout | Initial budget 20 minutes, adjust from observed runs |
| Concurrency | One active run per workflow and PR/ref, cancel superseded runs |

Do not set initial path filters. Every PR should report the required check. Future docs-only optimization needs an always-reporting gate before any checks are skipped.

If merge queue is enabled later, include merge_group before activating queue requirements.

## Job sequence

1. Check out the event commit with a verified immutable action SHA. Do not initialize unrelated submodules.
2. Install the pinned Node version from the nested application .nvmrc.
3. Configure npm download caching keyed to the nested package-lock.json.
4. Print the commit, runtime and package-manager versions.
5. Run npm ci.
6. Run npm run lint.
7. Run npm run typecheck. Generate Next route types before TypeScript when the selected script requires them.
8. Install the pinned Playwright browser binaries and required Linux dependencies.
9. Run npm run build.
10. Run npm run test:e2e. Playwright owns the production-mode local server.
11. Retain useful failure artifacts.
12. Finish with the actual command result. Do not mask failures with continue-on-error.

Build and test in the same job initially. This avoids reconstructing .next output across machines or uploading the application build as a test artifact.

Use the exact successful job identity shown by GitHub when configuring required checks. Record the name and app/source where supported.

## Playwright contract

- Base URL defaults to http://127.0.0.1:3000.
- webServer starts npm run start with explicit loopback hostname and port.
- CI must not reuse an unrelated existing server.
- Tests run after the production build.
- Start with one worker in CI for predictable resource use.
- Default CI retries: zero. Diagnose failures before introducing a retry policy.
- Use explicit readiness and bounded timeout rather than a fixed sleep.
- Local tests use synthetic data and require no network access to private backends.
- Chromium desktop and mobile-sized projects run initially. Add WebKit for the mobile navigation release.
- If no tests are discovered, the job must fail.

## Artifact policy

Keep failure screenshots, reports and local-run traces for a proposed seven-day retention period. Use unique artifact names per run and browser. Upload only the declared test-output directories.

This repository is public. Do not include environment files, credentials, production user content, authenticated browser storage or whole workspaces in artifacts.

Protected-preview tests need a separate evidence policy. Disable raw trace/HAR retention when a protection credential would appear in headers or cookies. Keep credentials out of URLs.

## Workflow trust boundary

Pin third-party actions to verified full commit SHAs. Use read-only token permissions, avoid persisting checkout credentials where unnecessary, and execute untrusted PR code without secrets. Do not use pull_request_target to check out and execute contributor code.

Pass untrusted text through structured arguments or environment variables rather than shell interpolation. Keep deployment actions separate from the basic quality job.

[GitHub secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use) supports this trust model.

## Required-check bootstrap

1. Introduce the workflow in a reviewed implementation PR.
2. Observe a successful run and capture the exact reported job name.
3. Configure the main rule to require PRs and the successful quality job.
4. Require current-base validation using the selected branch freshness setting.
5. Choose review requirements suitable for the actual maintainer team.
6. Prevent ordinary force pushes and branch deletion.
7. Record administrative bypasses without expanding them.
8. Demonstrate failure blocking on a disposable PR, then restore a passing state.

Do not set a nonexistent check as required. Do not bypass existing required checks to bootstrap this workflow.

GitHub reported main unprotected and no rulesets during planning. Reinspect before changing settings. Administration access has not been established by this documents task.

## Merge and deployment relationship

Vercel currently reports GitHub deployment statuses. Confirm the actual production branch in project settings.

If Vercel deploys main pushes automatically, PR checks must pass before merge. A failed push workflow after merge does not undo a production deployment.

Keep one production deployment mechanism. Do not add a parallel CLI deploy job unless the team intentionally replaces or changes the Git integration.

Deployment status and web-quality serve different purposes. A successful host build does not replace browser assertions. Preview feedback status does not prove product functionality.

## Controlled failure verification

Use one temporary branch and PR. Introduce a harmless failing route assertion, observe the failing web-quality job and verify ordinary merge is blocked. Remove the deliberate failure, rerun and verify recovery. Never merge the deliberately failing state.

Retain links to both outcomes as evidence. Avoid multiple artificial failure drills unless a concrete gap remains.

## Acceptance

- Workflow runs for a normal PR and reports a stable result.
- Clean install, lint, generated types, build and browser checks pass.
- Failure evidence is useful and contains no secrets.
- A deliberate test failure reaches the job result and blocks ordinary merging.
- Main rules reference the observed check name.
- Production deployment trigger is documented.
- Missing external configuration is reported as incomplete.

Reference: [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
