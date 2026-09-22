# Phase 1 implementation handoff

## Starting instruction for an implementation agent

Read this package in order, starting with README.md. Read current repository instructions before edits. Implement only Phase 1 when application implementation is requested. The present package records a plan and does not claim any application task is complete.

Use the existing Next.js application under `my-curated-haven-web/`. Preserve the official brand My Curated Haven and the domain https://mycuratedhaven.com/. Keep Tiny Soho attribution as “Recipes by Tiny Soho, inside My Curated Haven.”

## First actions

1. Fetch current main and record the commit. Compare with baseline eb5d5b7c27fbda31586fdfcc96c6b1fbc2921caf.
2. Read applicable AGENTS.md instructions and inspect working-tree changes.
3. Check the actual deployed version, hosting configuration and public routes.
4. Run baseline install, lint, type-check and build.
5. Complete route ownership and source-preservation mappings.
6. Implement P1-01 through P1-07 in dependency order.
7. Verify behaviour against the acceptance matrix.
8. Push a reviewable implementation branch with evidence.

Do not overwrite unrelated work or force-push shared branches. Keep both gitlink entries unchanged.

## Product boundaries to preserve

The future recipe launch offers three complete free recipes and one defined paid collection through a one-time purchase. Printable recipes are included in the product direction. The collection does not include unlimited AI, milestones or future parenting tools.

Do not build the recipe database, authentication or Stripe flow during Phase 1. Do not replace the product with a PDF-only funnel. Do not invent the paid count, price, refund terms or future-addition policy.

Preserve Features, Resources, Careers and Contact implementations. Default recommendation: remove their public links and preserve their bodies outside active routes. Public entry points should return the documented unavailable response. Navigation removal alone does not meet the proposed private-page intent.

## Routine choices to resolve without interruption

- Shared navigation file names and component extraction.
- Small accessibility fixes needed by the changed navigation.
- Import fixes required by source-preserving moves.
- Focused route tests matching the acceptance matrix.
- Organizing commits around the listed implementation batches.

## Missing facts to record

Missing business terms do not block preservation and navigation work. They block related purchase promises.

A missing support contact or an unresolved dependency on existing native support does block the affected public cutover. Complete independent work, state the missing fact and obtain the necessary answer before changing that service.

Unknown hosting configuration blocks deployment, not writing code or documentation. Do not invent a Vercel project, production branch mapping, deployment secret or Supabase environment.

## Phase 2 handoff

Provide Phase 2 with:

- Verified application root and baseline commands.
- Current runtime and lockfile.
- Pre-existing build or lint failures.
- Host and production branch details.
- Preview protection requirements.
- Route acceptance cases.
- Rollback deployment reference.
- Unresolved questions with owners.

Phase 2 should make the checks repeatable in CI before the Phase 1 implementation reaches production. The full Phase 2 plan is a separate deliverable.

## Final implementation report format

State what changed, what remained deferred, how verification ran, and the exact branch/commit. Include the PR or branch link and the preview link where available. Distinguish source changes from deployed behaviour.

Do not claim production completion without a verified production deployment. Do not mark tests passed when execution was blocked. Record blockers and the specific next action.
