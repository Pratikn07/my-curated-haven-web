# Phase 6 validation and release

## Verification matrix

| Area | Required evidence |
| --- | --- |
| Existing-content reuse | Source IDs and reviewed revisions mapped to each of the three public recipes |
| Content fidelity | All quantities, units, ingredients and ordered steps compared with approved source |
| Free access | Anonymous browser and direct data requests can read the three complete approved free recipes |
| Restricted access | Draft and paid bodies unavailable through APIs, nested queries, server-rendered payloads, print and storage |
| Search and filters | Defined matching semantics, unknown-value handling, deterministic ordering and validated parameters |
| URL state | Refresh, direct link, browser Back, clear-all and page reset behave consistently |
| Failure handling | Query failure differs from no matches, missing slug differs from service outage |
| Mobile usability | Narrow-screen layout, keyboard focus, dialog cancellation, text zoom and reflow verified |
| Images | Correct recipe association, approved rights, alt text, sizing and broken-image fallback |
| Print | Complete A4 and US Letter output, including long multi-page method |
| Discovery | Correct metadata, canonical URLs, structured data and eligible sitemap entries |
| Cache changes | Withdrawal and free-slot changes remove stale public content everywhere |
| Regression | Existing public pages and deferred-route restrictions preserved |

## Automated checks worth adding

Use focused tests that address actual risks:

- Parameter parser cases for duplicates, unknown enums, overlong search, invalid page/time and deterministic normalization.
- Filtering cases for OR within meal types, AND within dietary requirements and unknown total time.
- Query contract cases ensuring listing projections never include recipe bodies or private editorial fields.
- Browser journeys from listing to complete free detail, search submission, applied filters, Back and refresh.
- Keyboard-only filter open, apply, cancel and focus restoration.
- A real failed data request that renders Retry rather than a false zero-result success.
- Security integration cases for free, paid, draft and revoked/unpublished records under the Phase 4 access model.
- Content assertions confirming all approved ingredients and steps are rendered.
- Sitemap assertions based on approved eligible fixtures, not every database row.

Use synthetic test records and isolated test state. Never modify production recipes to provoke security failures. Local tests against a simplified mock do not replace integration tests of actual access policies.

The current public-site test forbids recipe navigation and expects exactly five sitemap URLs. Update those expectations deliberately. Continue excluding deferred routes and accounts until their own phases authorize them.

Run the existing lint, typecheck, build and browser checks through the required web-quality job. Retain Chromium and WebKit coverage already established by the repository. Record any environment limitation explicitly.

## Manual review

Review real approved content in the protected preview, including unusually long titles and instructions. Test at 320 CSS pixels, a typical phone width and desktop, with text zoom and keyboard navigation.

Open print preview for A4 and Letter and inspect every page. Automated DOM assertions alone do not establish print pagination quality. Review screen-reader naming and result announcements for the search/filter journey.

Test a slow or failed image request and a failed recipe read. Confirm that retries work and that no raw backend error or secret appears in the page.

Record actual performance measurements and the environment. Use the Phase 3 performance targets as the baseline and investigate material regression. Do not declare field performance before production data exists.

## Public release gates

All are required:

1. The recipe project and ownership are verified.
2. Phase 4 security implementation and direct-access checks pass.
3. The Phase 5 content handoff is complete for three approved free recipes.
4. No synthetic recipe fixture is exposed by public routes.
5. Every public recipe is complete, including quantities and instructions.
6. Mobile, accessibility, print and discovery checks have evidence.
7. Required CI checks pass on the current PR head.
8. Preview approval and rollback ownership are recorded.

The Phase 5 document being absent does not prohibit frontend work. It does prohibit treating the content review as already complete.

No unresolved price or refund decision needs to block the free recipe experience, provided no paid sale or misleading purchase promise is exposed.

## Release procedure

Implement through small PRs. Keep main protection and required checks intact. When the launch gates pass, enable the public recipe route and navigation together through the established release mechanism.

After deployment verify the listing, each approved detail URL, images, print, sitemap, canonical origin, parameterized-page indexing and deferred routes. Record deployment ID and commit alongside results.

Suggested later analytics events are recipe_list_view, recipe_open, recipe_search_submit, recipe_filter_apply and recipe_print_requested. These are a Phase 9 handoff proposal, not permission to add tracking now. Avoid raw search strings, child details or sensitive dietary selections in future event payloads. A print request is not proof that printing completed.

## Rollback and incidents

For a layout or interaction regression, revert the affected feature commit through the normal protected process and redeploy the last verified version.

For a suspected content exposure, first stop the unauthorized access through the backend/storage boundary and invalidate affected caches. Removing a navigation link is insufficient. Confirm direct URLs and API requests no longer expose the content, then investigate and record the incident.

For an unsafe or incomplete recipe, withdraw that recipe and invalidate listing, detail and sitemap output. Do not republish stale approved-looking copies during rollback. Restore the recipe launch only after an approved replacement or correction has passed the content gates.

Backend migrations belong to the Phase 4 rollout plan. Do not use a frontend rollback as justification for destructive schema rollback.

## Evidence file template

Create `docs/implementation/phase-6/IMPLEMENTATION-EVIDENCE.md` during delivery with:

- Implemented task IDs and exact commit.
- Preview and production deployment references.
- Recipe source mapping and approval references.
- Automated test run and required-check links.
- Manual mobile, accessibility and print findings.
- Security and cache-invalidation results.
- Known limitations and assigned follow-up owners.
- Release decision, timestamp and rollback reference.

Do not populate successful results before executing the checks.
