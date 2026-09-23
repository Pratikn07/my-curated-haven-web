# CI and environment reliability

## Current pipeline

At the planning baseline, `.github/workflows/web-ci.yml` runs `web-quality` and `backend-quality` on pull requests and main pushes. Both use Ubuntu 24.04 and Supabase CLI 2.104.0. Web checks start/reset Supabase before lint, typecheck, build and Playwright. Backend checks clean replay, pgTAP, generated-type drift and data-access integration.

The Playwright configuration has three projects, one worker in CI and zero retries. Existing data-access setup permits skipping when the local database is unreachable. P10-03 must make required release checks fail in that condition. Legitimate project applicability skips, such as desktop-only navigation, remain explicit.

## Recent registry failure

Phase 8 PR #16 workflow run `35913726676` failed twice before tests during database image download. Logs reported `toomanyrequests` for `ghcr.io/supabase/postgres:17.6.1.132`. This is recorded evidence of a dependency download problem. It does not establish a reset deadline or show whether application tests would pass.

Classify each future failure from the actual log. A container registry 429 is different from invalid image tag, missing credentials, unhealthy database, migration error or test assertion. Do not keep retrying a deterministic product failure as though it were rate limiting.

## Recovery procedure

1. Record run/job/attempt, candidate SHA, failed step, registry/image and redacted error.
2. Check whether the job ran tests. Mark unexecuted suites blocked by infrastructure.
3. For a transient registry error, honour a trustworthy retry hint where available and perform a bounded rerun of failed jobs. Avoid repeated simultaneous pulls.
4. If persistent, inspect the CLI's supported registry configuration and provider status/documentation. Evaluate authenticated pulls, an officially supported mirror, or a validated cache only when supported and appropriate for public packages.
5. Put any workflow fix in a focused reviewed change. Keep pinned versions/provenance, do not leak credentials, and test a clean runner/cache miss as well as cache hit.
6. Rerun all required checks against the final PR candidate. Preserve original failures in the run history.

Never remove a required check, turn startup errors into success, add `continue-on-error`, fake a status, skip data tests, or merge around protection to resolve a download failure. Do not select an arbitrary database image version solely because it downloads. Compatibility with migrations and generated types must remain proven.

## Required result accounting

For each project/suite report discovered, executed, passed, failed, skipped and flaky counts. Link each skipped case to a reason and owner. A required payment/access case that is skipped due to absent credentials, fixtures or service is blocked, not passed.

Keep a small explicit mapping from scenario IDs to actual test names/manual records. Test-file existence is not execution evidence. Require positive discovery and assert mandatory cases appear in the results. New tests should fail if their setup is unavailable instead of silently exiting.

If retries are introduced, preserve first-failure trace and classify retry success as flaky. Resolve or explicitly assess the instability before release. No flaky payment, privacy, identity or access-control case is acceptable as a launch pass.

## Environment configuration checks

- Fail startup or affected feature safely when production configuration is missing. Avoid local fallback URLs in a production build.
- Verify auth callback and return origins for each environment without allowing arbitrary redirects.
- Confirm Stripe account/mode and webhook secret belong to the same environment.
- Verify database migrations and content manifest at deployment, not solely in source.
- Confirm optional analytics is routed to a nonproduction destination in preview/staging.
- Keep secrets out of forks/untrusted PR jobs and traces. Publish only redacted evidence.
- Test preview protection with an unauthenticated request and ensure it does not accidentally block the deliberately configured provider callback without a safe design.

## Evidence retention

Current CI uploads browser failure artifacts for seven days. Before expiry, retain a sanitised summary and authorised durable proof for the release record. Propose 30 days for restricted detailed QA artifacts and 12 months for redacted release decisions, subject to the owner's retention policy. Do not copy raw customer data into a public GitHub artifact or commit.

Docs-only changes still honour configured PR checks. For this planning PR, link validation and task/scenario consistency are the relevant local checks. Running future payment QA is not possible until the implementation exists.

References: [GitHub workflow reruns](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs), [Playwright retries](https://playwright.dev/docs/test-retries).
