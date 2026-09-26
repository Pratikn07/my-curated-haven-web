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

## Automated production smoke check

`.github/workflows/production-smoke.yml` runs `my-curated-haven-web/scripts/production-smoke.mjs` after every successful Vercel production deployment and every hour at minute 17. It is read-only. It checks:

- `/`, `/recipes`, `/about`, `/support`, `/privacy`, `/terms`, `/sign-in` return 200 without the "Temporarily Unavailable" state.
- `/features` returns 404.
- `/sitemap.xml` lists at least 3 recipe URLs, and each one returns 200.
- `https://www.mycuratedhaven.com/` redirects permanently to the apex domain, keeping path and query.

A failed run emails the GitHub account that owns the workflow. Run it by hand with `npm run smoke:production` or the workflow's "Run workflow" button. The manual checklist above still applies to the header, mobile menu and anything the script cannot see.

## Rollback walkthrough (reviewed 2026-09-25)

Reviewed against the live project without rolling back production. Source: [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback).

Facts about this project that change the procedure:

- **Plan: Hobby.** Instant Rollback can return only to the immediately previous production deployment. For an older target, use `vercel promote <deployment-id>`.
- **A rollback turns off automatic production deploys.** After it, merges to `main` build but do not go live until someone promotes a deployment. The dashboard shows **Undo Rollback**; the CLI equivalent is `vercel promote <deployment-id>`.
- **A rollback restores the old build with the environment values it was built with.** `NEXT_PUBLIC_*` values are compiled in. Deployments built before 2026-09-25 16:34 PDT lack the Supabase variables and serve broken recipe pages, so never roll back to them. The earliest safe target is `dpl_DjWtdCdddiX29H4ZC3XyEZTJG3RQ`.

Steps:

1. Find the current production deployment: `vercel ls my-curated-haven-web --environment production`, or the dashboard's Production Deployment tile.
2. Pick the target. It must be a production deployment built on or after `dpl_DjWtdCdddiX29H4ZC3XyEZTJG3RQ` (2026-09-25 16:34 PDT) that passed the smoke check.
3. Previous deployment: dashboard → **Instant Rollback**, or `vercel rollback <deployment-id>`. Older deployment: `vercel promote <deployment-id>`.
4. Run `npm run smoke:production`, or the "Production smoke" workflow by hand.
5. Revert the faulty commit on `main` through a normal PR.
6. After the revert deploys, run **Undo Rollback** (or `vercel promote` on the new deployment) so automatic production deploys resume. Confirm with `vercel ls` that the newest production deployment holds the domain.
7. Record the cause, target, and follow-up owner in the PR.

## Deployment evidence record

Filled in by the 2026-09-25 audit.

| Field | Value |
| --- | --- |
| Implementation PR and SHA | PR #5, merged as `95cf6cd` on 2026-09-23 |
| Required CI run | `web-quality` passed on `7f82282`: https://github.com/Pratikn07/my-curated-haven-web/actions/runs/35801270099 |
| Preview URL and SHA | https://my-curated-haven-web-git-ph-8aaf86-pratik-r-nandoskars-projects.vercel.app (PR #5) |
| Anonymous access result | HTTP 302 to Vercel SSO with `x-robots-tag: noindex`, rechecked 2026-09-25 on the latest preview. Project setting `ssoProtection: all_except_custom_domains` |
| Authorized review result | Not done. Previews have no Supabase variables by design, so recipe pages need the Phase 10 staging environment |
| Ruleset/check identity | Ruleset `23852646` on `main`: PR, up-to-date branch, `web-quality` and `backend-quality` required, no force-push or deletion, no bypass |
| Production branch and trigger | `main`. A merge to `main` creates a Vercel production deployment |
| Production deployment | Checked by the audit on 2026-09-25: `dpl_8HaQjnUFVFjumatpYfURbSUHe4YB` (source `3a7a575`) |
| Smoke-check result | `npm run smoke:production` passed 13/13 against https://mycuratedhaven.com on 2026-09-25 |
| Known-good rollback target | `dpl_GikaQfWv3LRS1HvD6zwJg23csstt` (source `46e546d`). Earliest safe target: `dpl_DjWtdCdddiX29H4ZC3XyEZTJG3RQ` |

See [Vercel Git deployment guidance](https://vercel.com/docs/git) for the integration model. Recheck provider instructions before changing host settings.
