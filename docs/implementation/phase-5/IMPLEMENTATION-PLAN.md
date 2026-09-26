# Phase 5: recipe structure and editorial review implementation plan

[Phase 5 overview](README.md) · [All implementation plans](../README.md)

Status: ingestion implemented; editorial review not done.

> **Correction (2026-09-25 audit).** All 70 recipes were written by an LLM (`scripts/RECIPE_PROMPT.md` in `Pratikn07/parenting-app`) and imported without human review. Their images are AI-generated. No editorial review has happened. Where this package says "verified", "reviewed" or "approved", treat it as not done. The owner review is prepared in [FREE-RECIPE-REVIEW.md](FREE-RECIPE-REVIEW.md), and all allergen states are `unknown` until it happens. Details: [audit backlog](../../audit/AUDIT-BACKLOG.md#phase-5-recipe-structure-and-editorial-review).


## Goal

Audit the 70 existing recipes in `public.recipes` from the unified product database, formalize the editorial mapping rules into the Phase 4 schema, select the canonical three free recipes for toddler feeding, and execute the ingestion migration.

## Tasks and Work Breakdown

### Task 5.1: Catalog Source Audit and Health Check
- Inspect all 70 rows in `public.recipes` on the unified project (`Pratikn07's Project`, `ccrgvammglkvdlaojgzv`).
- Measure completeness across titles, descriptions, ingredients, instructions, cooking times, servings, dietary tags, allergens, and images.
- Verify that every title generates a distinct, URL-safe slug with zero collisions.
- Produce [RECIPE-CATALOG-AUDIT.md](RECIPE-CATALOG-AUDIT.md).

### Task 5.2: Editorial Mapping Rules
- Define the contract mapping from legacy `public.recipes` to `public.recipe_catalog` and `public.recipe_bodies`.
- Specify slugification algorithm, allergen review state mapping (`reviewed_listed`, `reviewed_no_allergens`), yield formatting, and tips-to-notes conversion.
- Produce [EDITORIAL-MAPPING.md](EDITORIAL-MAPPING.md).

### Task 5.3: Selection of the Three Free Recipes
- Evaluate candidate toddler recipes for diversity across meal types, nutrition profiles, preparation styles, and common allergens.
- Select the 3 canonical free recipes:
  - Slot 1: *Sweet Potato & Spinach Frittata Fingers* (Breakfast/Finger Food, egg/milk allergens)
  - Slot 2: *Soft-Baked Blueberry & Oat Bars* (Snack/Finger Food, allergen-free)
  - Slot 3: *Salmon & Pea Fish Cakes* (Dinner/Family, fish/wheat allergens)
- Produce [FREE-RECIPES-SELECTION.md](FREE-RECIPES-SELECTION.md).

### Task 5.4: Ingestion Migration Pipeline
- Create idempotent database migration `supabase/migrations/20260923053000_phase5_recipe_ingestion.sql`:
  - Copies and transforms recipes from `public.recipes` to `public.recipe_catalog` and `public.recipe_bodies`.
  - Sets the 3 selected recipes to `published` with `published_at = now()`.
  - Sets the remaining 67 recipes to `draft`.
  - Populates `public.free_recipe_slots` (slots 1, 2, 3) if the approved recipes are present.
- Test clean migration replay with `supabase db reset`.

### Task 5.5: Automated Verification and Quality Gates
- Verify pgTAP access matrix tests pass (`supabase test db`).
- Verify zero drift on generated TypeScript types (`supabase gen types typescript --local`).
- Run code quality suite: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`.
- Deploy migration to remote production Supabase and verify row counts.
- Produce [IMPLEMENTATION-HANDOFF.md](IMPLEMENTATION-HANDOFF.md).

## Verification Criteria

1. `supabase db reset`: Replays all 20 migrations without errors.
2. `supabase test db`: 15/15 pgTAP tests pass.
3. `npm run test:e2e`: All 67 browser and data access integration tests pass.
4. Remote Supabase: `public.recipe_catalog` has 70 rows, `public.recipe_bodies` has 70 rows, and `public.free_recipe_slots` has 3 rows.
