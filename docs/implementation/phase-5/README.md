# Phase 5: recipe structure and editorial review

[All implementation plans](../README.md)

Status: ingestion implemented; editorial review not done.

> **Correction (2026-09-25 audit).** All 70 recipes were written by an LLM (`scripts/RECIPE_PROMPT.md` in `Pratikn07/parenting-app`) and imported without human review. Their images are AI-generated. No editorial review has happened. Where this package says "verified", "reviewed" or "approved", treat it as not done. The owner review is prepared in [FREE-RECIPE-REVIEW.md](FREE-RECIPE-REVIEW.md), and all allergen states are `unknown` until it happens. Details: [audit backlog](../../audit/AUDIT-BACKLOG.md#phase-5-recipe-structure-and-editorial-review).

Original summary: this package establishes the catalog audit, editorial mapping, selection of the three free recipes, and the database ingestion pipeline from the unified product catalog into the Phase 4 schema.

## Outcome

Audit the 70 existing recipes in `public.recipes` from the unified product database (`Pratikn07's Project`), define normalized mapping rules to the Phase 4 schema (`recipe_catalog` and `recipe_bodies`), select the three approved toddler recipes for `free_recipe_slots`, and execute an idempotent ingestion pipeline for production and local environments.

## Read in order

1. [Detailed implementation plan](IMPLEMENTATION-PLAN.md)
2. [Recipe catalog audit](RECIPE-CATALOG-AUDIT.md)
3. [Editorial mapping rules](EDITORIAL-MAPPING.md)
4. [Free recipes selection](FREE-RECIPES-SELECTION.md)
5. [Implementation handoff](IMPLEMENTATION-HANDOFF.md)

## Source Baseline & Verification

Reviewed on 2026-09-23:

- **Unified Database**: `Pratikn07's Project` (`ccrgvammglkvdlaojgzv`).
- **Source Table**: `public.recipes` containing 70 complete recipe rows across toddler meals, finger foods, baby-led weaning, purees, family meals, and snacks.
- **Target Schema**: Phase 4 contracts (`recipe_catalog`, `recipe_bodies`, `free_recipe_slots`).
- **Data Integrity**: 100% of the 70 recipes possess titles, ingredients, instructions, cooking times, servings, and public image URLs.
- **Slug Generation**: 70 out of 70 generated slugs are unique with zero collisions.
- **Selected Free Recipes**:
  1. Slot 1: *Sweet Potato & Spinach Frittata Fingers* (`0003c4cc-b2cb-4e49-97c8-f4febfed39f9`)
  2. Slot 2: *Soft-Baked Blueberry & Oat Bars* (`50663aaa-7e47-4b08-9fd8-a58b390db96d`)
  3. Slot 3: *Salmon & Pea Fish Cakes* (`a61d93da-4d19-4219-a131-bca2468ace88`)

## Scope

- Comprehensive audit of all 70 recipes in the existing catalog.
- Normalization and translation rules from legacy recipe fields to `recipe_catalog` and `recipe_bodies`.
- Editorial review and selection of the three free recipes tailored specifically to parents feeding toddlers.
- Idempotent SQL migration (`20260923053000_phase5_recipe_ingestion.sql`) to ingest the 70 recipes, publish the 3 free recipes, and assign slots 1–3.
- Automated testing and zero-drift verification against the test suite.

## Dependencies

- [Phase 4 backend foundation](../phase-4/README.md) supplies the target tables (`recipe_catalog`, `recipe_bodies`, `free_recipe_slots`) and RLS rules.
- [Phase 6 free recipe experience](../phase-6/README.md) consumes the three published free recipes and catalog metadata for browsing and detail pages.
