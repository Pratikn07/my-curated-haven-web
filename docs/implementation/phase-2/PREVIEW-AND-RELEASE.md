# Preview, release and rollback runbook

## Known hosting evidence

GitHub's Vercel status reports successful deployment for the Phase 1 documentation head. The project referenced by the status is my-curated-haven-web in the connected Vercel account.

This confirms integration activity. The dashboard's project settings, plan, protection, production branch and current custom-domain deployment have not been audited in this documents task.

## Hosting inventory before implementation release

Record:

- Project and account identity.
- Application root directory.
- Framework preset, install and build commands.
- Node major and observed deployed runtime.
- Production branch.
- Canonical domain mapping.
- Whether a main push automatically deploys.
- Preview protection scope and reviewer access.
- Environment names, without values.
- Last known-good deployment and SHA.
- Operator able to restore a deployment.

Preserve existing project identity and domain ownership.

## Preview setup

1. Use the existing Git integration to build the implementation branch.
2. Confirm the deployment metadata matches the intended commit.
3. Choose supported host access protection for shared previews. Prefer the current account's available authentication mechanism.
4. Scope protection so the production custom domain stays public.
5. Test the actual deployment URL and branch alias anonymously. Neither should expose unpublished content.
6. Open the same deployment as an authorized reviewer and confirm the intended page.
7. Review redirect targets, assets and secondary routes under the same protection policy.
8. Apply a nonproduction noindex policy as an additional discovery measure.
9. Do not publish legacy-page review links until protection is verified.

If suitable protection is unavailable, keep unpublished review local until a supported approach is selected. Do not add a client-side password prompt.

[Deployment Protection](https://vercel.com/docs/deployment-protection) describes provider options. Availability depends on the current project/account configuration.

## Optional automated preview checks

Start with required local production-mode tests and authenticated manual preview review. This avoids introducing deployment credentials merely to test public routes.

If later automation is needed, validate the deployment belongs to the expected project, repository, PR and commit. Use a trusted runner with an explicitly scoped credential. Do not expose the credential to fork code, arbitrary base URLs or retained browser traces.

Keep the authorization test itself separate: an anonymous request should still be denied while an authorized request succeeds.

## Ordinary release sequence

1. Read the PR scope and verify the expected commit.
2. Confirm web-quality passes for the required event and current base.
3. Review the preview and record any phase-specific manual checks.
4. Resolve open blockers and follow current owner release authorization.
5. Merge through the normal main requirements.
6. Observe the host deployment for the resulting main commit.
7. Wait for completed deployment status and verify the canonical domain.
8. Run the smoke checks below.
9. Record source SHA, deployment identifier, timestamp and operator.

Do not equate a merged PR with a completed deployment. If auto-deploy is disabled, document the single approved release action and execute only within current authorization.

## Production smoke checks

For current application behaviour:

- Homepage returns expected content.
- About and Support load.
- Privacy and Terms remain reachable.
- Header and mobile menu navigate correctly.
- Assets load without application errors.

After Phase 1 code implementation, also check deferred URL responses, recipe-first metadata and sitemap allowlisting. Do not expect those changes after merging documentation alone.

Before later paid launches, extend this list through the dedicated payment and access phases. No payment test belongs to Phase 2 production verification.

## Failure response

If the host build fails, inspect the specific error and keep the prior working deployment active where supported. If the new deployment breaks a required route or exposes unpublished pages, choose a rollback or targeted fix based on the failure.

Do not assume a failing post-merge Actions run automatically stops or rolls back a Vercel deployment.

## Rollback steps

1. Identify the active deployment and last verified target.
2. Check whether restoring the target would re-expose deferred content or break required support URLs.
3. Use the host's supported rollback/promotion process for the chosen deployment.
4. Verify the canonical domain after restoration.
5. Revert the relevant source commit through a normal PR so main matches the intended state.
6. Repeat quality checks and smoke tests.
7. Record incident cause, rollback target and follow-up owner.

Do not reset or force-push shared main. Do not disable access protection or merge gates to perform a routine repair.

Managed hosting rollback behaviour must be verified against the actual account. A safe preview drill or reviewed walkthrough is sufficient for Phase 2. No artificial production outage is required.

## Deployment evidence record

| Field | Value at execution |
| --- | --- |
| Implementation PR and SHA | Pending |
| Required CI run | Pending |
| Preview URL and SHA | Pending |
| Anonymous access result | Pending |
| Authorized review result | Pending |
| Ruleset/check identity | Pending |
| Production branch and trigger | Pending |
| Production deployment | Pending |
| Smoke-check result | Pending |
| Known-good rollback target | Pending |

See [Vercel Git deployment guidance](https://vercel.com/docs/git) for the integration model. Recheck provider instructions before changing host settings.
