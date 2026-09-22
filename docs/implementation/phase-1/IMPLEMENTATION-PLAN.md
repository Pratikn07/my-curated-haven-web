# Phase 1: preserve the website and prepare the recipe launch

Status: ready for implementation planning. No task below is marked executed.

## 1. Goal and implementation rules

Prepare a small, truthful public website while retaining all existing parenting work for future releases. Maintain the official My Curated Haven brand and domain.

Use the existing Next.js application at `my-curated-haven-web/`. Paths below are relative to this application unless stated otherwise. Do not run a new-project generator over the repository.

Separate the documentation push from application implementation. On a later implementation request, use the sequence below. Apply current repository instructions and deployment authorization at execution time.

## 2. Work sequence and deliverables

### P1-01: capture a recoverable baseline

Owner: engineering. Dependencies: none.

1. Fetch the current default branch and record its commit. Compare against the reviewed baseline in README.
2. Read applicable AGENTS.md files and inspect existing uncommitted work. Use an isolated implementation branch or worktree if needed.
3. Inventory routes, components, assets, redirects, public links and metadata using [ROUTE-INVENTORY.md](ROUTE-INVENTORY.md).
4. Record the application working directory, lockfile, runtime version, package scripts, hosting provider, production branch and deployed commit.
5. Save mobile and desktop screenshots of current public pages, plus their response statuses. Do not assume source main equals the live deployment.
6. Run the existing install, lint and build commands before changes. Record pre-existing failures separately.
7. Keep the baseline commit reachable. A named baseline tag is optional and needs no forced overwrite.
8. Preserve both repository-root gitlinks. No submodule update is required.

Deliverable: baseline evidence in the implementation PR, including source SHA, deployment identifier, screenshots and command outcomes.

Done when another engineer has enough information to restore the original source and identify the corresponding deployed version.

### P1-02: finalize route and content ownership

Owner: engineering with product review. Dependencies: P1-01.

1. Reconcile the actual route list with the supplied inventory.
2. Assign each route one status: public now, deferred, or future.
3. Trace links beyond Navbar: Footer, homepage sections, Support, About, metadata, redirects and any generated menus.
4. Review the native app/store dependency on Support, Privacy and Terms. Preserve required public URLs and accurate existing-user guidance.
5. Confirm the support email is monitored. A string in source does not prove delivery.
6. Record any exception to the recommended deferred-route behaviour before implementation.

Deliverable: updated route matrix with source path, destination, public state and rationale.

Done when each existing route has a clear public response and an identified source-preservation location.

### P1-03: preserve deferred page implementations

Owner: engineering. Dependencies: P1-02.

Default deferred pages: Features, Resources, Careers and the standalone Contact experience.

1. Move each deferred page implementation into a named file outside `src/app`, for example `src/legacy/pages/FeaturesPage.tsx`.
2. Preserve content, interactive behaviour and assets required for later restoration. Make only import-path or filename fixes required by the move.
3. Record old-to-new file mappings. Use Git rename tracking where possible.
4. Keep route entry files as small server-rendered unavailable responses, or remove only the route entry after preserving its implementation. Prefer consistent early `notFound()` wrappers for the four listed routes.
5. Production route wrappers must not import or render the legacy pages. Do not hide the content through CSS or a client-side conditional.
6. Do not add an unauthenticated `/preview` route or a query-string bypass.
7. Verify deferred copy is absent from HTML, React Server Component responses and route-specific browser bundles. An unused module should not be imported through a shared barrel file.
8. Keep legacy-only assets catalogued. Assets under `public/` remain directly downloadable. Move unpublished-only assets outside public delivery if their exposure matters, after checking all references.
9. For initial internal review, run the recorded baseline locally. Add a shared preview only after host-level access protection is verified.

Avoid a broad environment-variable feature framework for four static deferred routes. Keep the change easy to inspect and reverse.

Done when old content is recoverable from named source files and absent from the production page response.

### P1-04: create a single public navigation definition

Owner: engineering. Dependencies: P1-02 and P1-03.

Proposed new file: `src/config/site-navigation.ts`.

1. Define current header links centrally: Home, About and Support.
2. Define footer links: About, Support, Privacy and Terms.
3. Have desktop navigation and the mobile menu consume the same current public links.
4. Remove Features, Resources, Careers and Contact links from all public surfaces.
5. Preserve the My Curated Haven brand link to the homepage.
6. Hide recipe, collection, account and purchase links until their destinations ship. Do not use `href="#"` placeholders.
7. Review app download links against confirmed native-product availability. They should not remain the primary recipe-acquisition action. Preserve required native-user access if such users exist.
8. Make the menu button expose expanded state and its controlled menu. Support keyboard navigation, visible focus, close-on-link-selection and Escape.
9. Use a styled link for navigation actions rather than a button nested inside an anchor.
10. Check the header at 320, 375, 390 and 768 CSS pixels, then at desktop width.

Done when desktop, mobile and footer destinations agree with route status and every visible action works.

### P1-05: align the public story and support

Owner: product/content and engineering. Dependencies: P1-04.

1. Update `src/app/layout.tsx` metadata to a recipe-focused title and description using the official spelling.
2. Update `Hero.tsx` with the toddler-recipe promise and Tiny Soho attribution.
3. Remove milestone and AI feature overlays from the public hero. Preserve original source through the baseline.
4. Review homepage `Features` and `HowItWorks` rendering. Retain their original implementations, but unmount sections which describe unavailable parenting functionality.
5. Provide a short transition section instead of an unfinished recipe grid. A functional Support action is sufficient before recipe pages exist.
6. Update About to explain the connection between My Curated Haven and Tiny Soho. Use the owner's stated brand history. Do not fabricate qualifications.
7. Consolidate useful Contact content into Support. The current Contact form opens a mail client. Do not describe the form as a submitted support ticket.
8. Show a monitored email link and clear instructions. Do not promise live chat or response times without an operating service.
9. Reconcile native subscription FAQ entries with real users and the forthcoming one-time web purchase. If existing users need those instructions, identify them explicitly as native-app support.
10. Apply [CONTENT-REGISTER.md](CONTENT-REGISTER.md) to all public copy, including image text, alt text and dormant components before future reuse.
11. Keep Privacy and Terms public. Review factual mismatches, but do not invent refund or access terms.

Done when the site describes today's available experience without selling unbuilt parenting features or publishing unresolved commercial promises.

### P1-06: make discovery and direct requests match route status

Owner: engineering. Dependencies: P1-03 through P1-05.

1. Add or update `src/app/sitemap.ts` from an explicit allowlist of public, indexable routes.
2. Use https://mycuratedhaven.com as the canonical production origin. Avoid request-host-derived canonical URLs.
3. Exclude deferred pages and all planned-but-unbuilt destinations.
4. Add or review `src/app/robots.ts`. Do not treat robots rules as authentication.
5. Give unavailable responses appropriate indexing treatment. Next.js `notFound()` injects a noindex tag, but the returned HTTP status needs verification against the installed version and rendering path.
6. Keep the unavailability check before streaming starts. If the deployed response returns a soft 404 with status 200, correct the rendering or hosting behaviour and retest.
7. Apply noindex to shared nonproduction previews and require access protection before restoring unpublished pages there.
8. Check trailing slash, query-string and client-navigation requests. No variant should expose deferred content.
9. Remove links from public source before deployment so prefetch does not fetch obsolete routes.
10. Inspect deployment/CDN caching after release. Historic search results and third-party caches are not erased immediately by a source change.

Done when live response bodies, statuses, metadata and sitemap entries agree with the route matrix.

### P1-07: verify and prepare release

Owner: engineering and product reviewer. Dependencies: P1-01 through P1-06, plus minimum Phase 2 safeguards.

1. Follow [VALIDATION-AND-RELEASE.md](VALIDATION-AND-RELEASE.md).
2. Attach results to the exact implementation commit.
3. Use a protected preview to review desktop, mobile, support, legal URLs and unavailable routes.
4. Review the diff for accidental deletions, lockfile churn, exposed credentials, new backend calls and unrelated changes.
5. Confirm a hosting rollback target and rehearse source restoration locally.
6. Include a concise PR description covering the public change, retained source, tests and unresolved release blockers.
7. Follow the current deployment authorization and repository release rules. A plan-only push does not deploy application code.
8. After any authorized release, run the documented live smoke checks and retain the results.

Done when the release evidence supports every required acceptance check. Report code-complete, preview-verified and production-deployed as separate states.

## 3. File-level change map

| File or area | Expected implementation work |
| --- | --- |
| `src/config/site-navigation.ts` | New shared public link configuration |
| `src/components/Navbar.tsx` | Public links, mobile menu state, action semantics |
| `src/components/Footer.tsx` | Current links, support access, brand copy |
| `src/components/Hero.tsx` | Recipe promise and truthful transition content |
| `src/app/page.tsx` | Current homepage section composition |
| `src/components/Features.tsx`, `HowItWorks.tsx` | Preserve implementations, review public mounting |
| `src/components/CTASection.tsx`, `Testimonials.tsx` | Register unverified copy, do not publish by default |
| `src/app/layout.tsx` | Brand metadata and canonical origin |
| `src/app/about/page.tsx` | Brand history and factual claims |
| `src/app/support/page.tsx` | Verified support and accurate product distinction |
| Four deferred route entry files | Early unavailable response |
| `src/legacy/pages/` | Preserved deferred page implementations |
| `src/app/not-found.tsx` | Helpful unavailable page with Home and Support links |
| `src/app/sitemap.ts`, `robots.ts` | Published route discovery |
| `src/app/privacy/page.tsx`, `terms/page.tsx` | Factual review, preserve public access |

Do not restructure the whole app into new route groups or upgrade packages as an incidental Phase 1 change.

## 4. PR-sized implementation batches

| Batch | Tasks | Review focus |
| --- | --- | --- |
| A | P1-01 and P1-02 | Baseline evidence and route decisions |
| B | P1-03 and P1-04 | Source preservation and public access |
| C | P1-05 | Accurate content and support |
| D | P1-06 and P1-07 | Metadata, acceptance evidence and release readiness |

Implement B and C together on a preview if splitting deployments would create dead links or mixed promises. A commit boundary does not require a separate production deployment.

## 5. Main risks and responses

| Risk | Response |
| --- | --- |
| Hidden links still expose old pages | Verify direct requests and remove legacy imports from public routes |
| Existing users lose support | Confirm native dependencies before changing support guidance |
| Recipe links ship before recipes | Keep future navigation absent until destination readiness |
| Original work becomes hard to recover | Preserve source mappings and a reachable baseline |
| Placeholder claims survive in metadata | Review the claims register across all public surfaces |
| Private preview leaks unpublished content | Use local baseline review until host protection is verified |
| Baseline build already fails | Record and fix the specific blocker before release |
| Main has newer changes | Rebase or rebuild the branch on the new base, preserve others' work |

## 6. Official references

Reviewed for planning. Recheck version-specific behaviour before implementation.

- [Next.js notFound](https://nextjs.org/docs/app/api-reference/functions/not-found)
- [Next.js sitemap convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Google noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing)

These references support routing and indexing mechanics. The product scope and file-change recommendations come from the owner's decisions and repository review.
