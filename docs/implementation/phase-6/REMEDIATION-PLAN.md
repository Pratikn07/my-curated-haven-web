# Phase 6 remediation plan

Status: plan only. This document does not change application code, tests, or the live database.

Reviewed on 2026-09-23 against `main` at `82eff91` (`fix(phase-5): do not treat an empty allergen list as reviewed`). The live catalog on project `ccrgvammglkvdlaojgzv` has three published recipes, all in `free_recipe_slots`, and 67 drafts. Meal and diet filters already compare case-insensitively, so `breakfast` matches the `Breakfast` control. That filter behavior is not a defect.

## Goal

Keep the public recipe browser, sitemap, and sibling links limited to the three free slots, and stop the detail page from stating a specific allergen clearance that the review record did not make. Prove the three live recipes render their source ingredients and steps. Confirm print on paper before calling print done.

## P6-R1: list only free slots

The public index uses `getPublishedCatalog`, which returns every row with `publication_state = 'published'`.

| Call site | Current read |
| --- | --- |
| `my-curated-haven-web/src/app/recipes/page.tsx` | `getPublishedCatalog` feeds the browser and filters |
| `my-curated-haven-web/src/app/sitemap.ts` | `getPublishedCatalog` adds every published slug |
| `my-curated-haven-web/src/app/recipes/[slug]/page.tsx` | `getCachedCatalog` takes the first two other published recipes as siblings |

Today those calls match the free set only because Phase 5 left every other recipe as `draft`. Publishing a paid recipe for sale would put it on `/recipes`, in the sitemap, and in the sibling row.

`getFreeRecipeSlots` in `my-curated-haven-web/src/lib/data/recipes.ts` already reads `free_recipe_slots` and joins the published catalog fields. Use that as the only source for the public index.

Work:

1. Add a helper that returns the slot recipes as `RecipeCatalogItem[]`, ordered by slot. If the slot query fails, throw. Do not substitute the full published catalog.
2. Point the recipes page, the sitemap, and the sibling section at that helper. Sibling cards skip the current slug and keep the existing limit of two.
3. Leave `getPublishedCatalog` in place for callers that intentionally need every published row. Do not use it for the public free-recipe surfaces.
4. Keep a published paid recipe reachable at `/recipes/[slug]` when Phase 8 publishes it. The page already returns `access_denied` without a body. This task does not add that recipe to the free index.

Acceptance:

- With a fourth published recipe that is not in `free_recipe_slots`, `/recipes`, the sitemap, and sibling cards omit it.
- The three slot recipes still appear, in slot order, before filters run.
- A failed slot query shows the existing recipes-page error state. It does not render an empty catalog as if no recipes match the filters.

## P6-R2: narrow the no-allergen sentence

`my-curated-haven-web/src/app/recipes/[slug]/page.tsx` shows this copy when `allergen_review_state` is `reviewed_no_allergens`:

> Reviewed: Does not contain major common allergens (dairy, egg, nuts, soy, wheat).

Phase 5 now stores `unknown` for an empty allergen array, except Soft-Baked Blueberry & Oat Bars (`50663aaa-7e47-4b08-9fd8-a58b390db96d`), whose selection record in [FREE-RECIPES-SELECTION.md](../phase-5/FREE-RECIPES-SELECTION.md) documents that review. The `unknown` branch already tells the reader the recipe has not been formally reviewed. Keep that branch.

The named list (dairy, egg, nuts, soy, wheat) is not in the oat-bars review record. The page must not invent it.

Work:

1. For `reviewed_no_allergens`, say that the recipe was reviewed and no allergens were listed, and that the reader should check ingredient packaging. Do not name a fixed allergen panel.
2. Do not infer `reviewed_no_allergens` from an empty array in the page. The database state is the only switch.
3. Leave `reviewed_listed` as the badge list of the stored allergen names.

Acceptance:

- A body with `unknown` does not show the clearance sentence.
- The oat-bars page, while its state stays `reviewed_no_allergens`, does not claim a specific dairy, egg, nut, soy, or wheat clearance.
- A listed allergen still renders as a badge.

## P6-R3: assert the three live recipes

`my-curated-haven-web/tests/e2e/data-access.spec.ts` checks synthetic slugs such as `synth-free-oat-bake`. Those fixtures do not prove the live free recipes.

Work:

1. Add a test that, given the local or preview rows for these slugs, the detail page shows the source ingredient text and the ordered steps from [FREE-RECIPES-SELECTION.md](../phase-5/FREE-RECIPES-SELECTION.md):
   - `sweet-potato-and-spinach-frittata-fingers`
   - `soft-baked-blueberry-and-oat-bars`
   - `salmon-and-pea-fish-cakes`
2. If those rows are absent in the local seed, skip the test with an explicit reason. Do not replace the assertion with the synthetic sentinel strings.
3. Do not write production recipes into the test database to make the test pass.

Acceptance: when the three approved rows are present, each page shows its reviewed ingredients and steps. A missing fixture skips. It does not pass.

## P6-R4: print check, no code unless it fails

`my-curated-haven-web/src/styles/recipe-print.css` and `PrintButton` already hide navigation and the sibling row. Automated DOM checks do not show page breaks.

Work:

1. Open print preview for the longest of the three live methods at A4 and US Letter.
2. Confirm the title, ingredients, steps, allergen note, and storage note are present, and that a step is not clipped at a page boundary.
3. Change the print stylesheet only if that preview shows a clipped step or a blank page. Record the preview in the Phase 6 evidence file.

Acceptance: either the preview is recorded as acceptable, or a follow-up patch names the rule that clipped the step.

## Out of scope

- Phase 7 save rules, sign-in copy, and account closure.
- Phase 8 checkout, webhooks, price checks, and the paid manifest.
- Revoking `SELECT` on `public.recipes`. The parenting app still reads that table.
- Re-running `20260923053000_phase5_recipe_ingestion.sql`.

## Verification

1. `npm run lint` and `npm run typecheck` in `my-curated-haven-web`.
2. Playwright on `/recipes` with an extra published recipe that has no free slot. The extra slug is absent from the list, the sitemap, and sibling cards.
3. The three slot recipes still render for a signed-out visitor, including ingredients and steps.
4. Allergen copy matches P6-R2 for `unknown`, `reviewed_listed`, and `reviewed_no_allergens`.
5. `web-quality` passes on the implementation pull request.

## Rollback

The public index change is web-only. Redeploy the previous `main` commit if a free recipe disappears from `/recipes`. Slot membership in the database stays as it was. The allergen sentence change is copy. Restore the previous sentence only if the oat-bars review record is updated to name those allergens.
