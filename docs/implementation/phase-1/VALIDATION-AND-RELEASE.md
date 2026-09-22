# Phase 1 acceptance and release plan

Status: specification only. No application tests, preview checks or production checks are recorded as passed by this documents package.

## Baseline and build checks

Run from the repository's nested application directory:

```sh
cd my-curated-haven-web
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

Use the committed lockfile and a runtime compatible with the installed framework. Record the exact runtime. The TypeScript command should use the locally installed compiler after npm ci.

For production-mode local verification:

```sh
npm run start -- --port 3000
```

Record each command's exit status. Do not disable lint rules or type checking to obtain a passing result. If the baseline fails, identify the source and fix the relevant blocker before release.

## Required acceptance checks

| ID | Check | Expected evidence |
| --- | --- | --- |
| A01 | Source preservation | Four deferred implementations mapped to retained source, baseline reachable |
| A02 | Main public routes | /, /about, /support, /privacy and /terms return 200 with intended content |
| A03 | Deferred direct requests | Each selected deferred URL returns 404 and no old page body, or the documented Contact redirect |
| A04 | URL variants | Slash/query variants and client navigation reveal no deferred page content |
| A05 | Delivery boundary | Deferred text absent from rendered HTML, RSC responses and loaded browser bundles |
| A06 | Navigation | Header, mobile menu, footer and body links contain only working public destinations |
| A07 | Metadata | Official brand/domain, recipe-focused description and correct indexing signals |
| A08 | Sitemap | Only approved public canonical URLs, no deferred or unbuilt destinations |
| A09 | Support | Correct email and useful contact instructions, no false submission or live-chat state |
| A10 | Product claims | Content register resolved for public surfaces or release blocker recorded |
| A11 | Mobile layout | No clipped controls or page overflow at 320, 375, 390 and 768px |
| A12 | Keyboard access | Menu state, focus, Escape and link selection work |
| A13 | Existing users | Required support and legal URLs continue working |
| A14 | Diff scope | No unintended submodule, backend, payment or dependency changes |
| A15 | Production build | Install, lint, type check and build pass for the implementation SHA |
| A16 | Preview and rollback | Preview reviewed, access protection verified where needed, rollback target recorded |

A visually empty page is not evidence of A05. Inspect responses and loaded assets. Source preservation is not a claim of confidentiality for previously public material.

## Focused automated coverage

Once Phase 2 provides a browser-test runner, add a compact regression suite for direct route access, navigation destinations and mobile menu behaviour. Use a production-mode server. Cover each deferred route and public support/legal routes.

Avoid snapshotting every component or testing configuration arrays against themselves. The value is verifying user-visible routes and the content delivery boundary.

If a runner is not yet available, record repeatable HTTP and browser checks for the preview. Repeat the critical cases under CI before the Phase 1 code release. Do not report planned automation as already configured.

## Manual review

1. Open the preview on a phone-sized viewport and desktop.
2. Use the full navigation with keyboard and touch.
3. Refresh each public and deferred URL directly.
4. Inspect the page title, description, canonical URL and robots metadata.
5. Open the generated sitemap and check every listed URL.
6. Confirm email actions open the intended address and do not claim ticket submission.
7. Read the homepage, About and Support as a new parent arriving from Tiny Soho.
8. Compare retained legacy source with the baseline for accidental content loss.

## Release gate

A documentation branch is ready once its files and links are verified. Application release requires additional evidence:

- [ ] Actual deployment provider, production branch and baseline deployment identified.
- [ ] Minimum Phase 2 install/build/preview safeguards are operational.
- [ ] Checks A01 through A16 pass or an explicit reviewed exception exists.
- [ ] Unresolved support or native-user dependencies are resolved.
- [ ] No unresolved commercial terms appear as public promises.
- [ ] Implementation PR includes exact commit and preview URL.
- [ ] Release follows current owner authorization and repository rules.
- [ ] Previous known-good deployment is available for rollback.

Product owner reviews wording and scope. Engineering verifies build, routes and delivery. One person may hold both responsibilities, but both review outcomes must be recorded.

## After an authorized deployment

Check the canonical domain against the route matrix. Verify support and legal pages first, then deferred URLs, navigation and sitemap. Record deployed SHA and timestamp. Check existing host logs for new route/server errors without adding a separate analytics project.

Release failure examples: homepage error, unavailable support/legal pages, deferred content still exposed, broken navigation or an incorrect production origin.

## Rollback

1. Record the current implementation deployment and the prior known-good deployment.
2. Prefer restoring the prior hosting deployment for an urgent outage.
3. Revert the specific implementation commits through normal Git review. Do not reset shared main or force-push.
4. Rebuild and deploy through the existing release process when source rollback is needed.
5. Repeat homepage, support, legal and navigation smoke checks.
6. Document the cause and the fix required before another release.

Restoring the original deployment also restores its original public content. If deferred-content exposure is the failure, prefer a targeted fix or a known-good deployment with the desired route restrictions. Choose the rollback target based on the actual failure.

## Evidence record template

- Source SHA:
- Runtime and package manager:
- Baseline checks:
- Implementation checks:
- Preview URL and access protection:
- Route response results:
- Mobile and keyboard results:
- Content reviewer:
- Exceptions:
- Production deployment, if authorized:
- Rollback target:
- Follow-up owner:
