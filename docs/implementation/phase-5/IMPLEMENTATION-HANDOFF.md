# Phase 5: Implementation Handoff to Phase 6

[Phase 5 overview](README.md) · [Implementation plan](IMPLEMENTATION-PLAN.md) · [Phase 6 overview](../phase-6/README.md)

## Status: Complete & Verified

Phase 5 has resolved the content audit, editorial review, mapping rules, and database ingestion pipeline, successfully unlocking the data needed for Phase 6 (**Free Recipe Experience**).

---

## Deliverables Summary

1. **Source Catalog Audit**: Audited all 70 recipes from `public.recipes`. Confirmed 100% data completeness for ingredients, instructions, cooking times, servings, and public images.
2. **Free Recipe Selection**: Verified and assigned the 3 toddler recipes into `public.free_recipe_slots`:
   - Slot 1: *Sweet Potato & Spinach Frittata Fingers* (`sweet-potato-and-spinach-frittata-fingers`)
   - Slot 2: *Soft-Baked Blueberry & Oat Bars* (`soft-baked-blueberry-and-oat-bars`)
   - Slot 3: *Salmon & Pea Fish Cakes* (`salmon-and-pea-fish-cakes`)
3. **Database Migration Pipeline**:
   - Authored `supabase/migrations/20260923053000_phase5_recipe_ingestion.sql`.
   - Verified clean replay across all 20 migrations with `supabase db reset`.
   - Populates `recipe_catalog`, `recipe_bodies`, and `free_recipe_slots` idempotently.
4. **Automated Quality Gates**:
   - `supabase test db`: 15/15 pgTAP tests PASS.
   - `supabase gen types typescript --local`: 0 drift.
   - `npm run lint`, `npm run typecheck`, `npm run build`: 0 errors.
   - `npm run test:e2e`: 67 passed, 17 skipped.

---

## Handoff Contract for Phase 6 (Frontend UI)

Phase 6 implements the public recipe browsing and detail views. It should consume the following server DTOs and database state:

### 1. Catalog Browsing Route (`/recipes`)
- Fetch published recipes using `getPublishedCatalog()`.
- Display cards with:
  - `title`, `slug`, `public_summary`, `preview_image_path`, `total_minutes`, `meal_labels`, `diet_labels`.
  - Free badge indicating the recipe is an unlocked free slot.

### 2. Recipe Detail Route (`/recipes/[slug]`)
- Resolve slug to recipe using `getRecipeBySlug(slug)`.
- Enforce access boundary via server component calling `checkRecipeAccess(recipeId)`.
- Render:
  - Hero image with verified alt text.
  - Prep and total time metadata.
  - Ingredients list with amounts and units.
  - Step-by-step instructions.
  - Reviewed allergen tags and safety notes.
  - Storage & freezing advice.
  - Print-friendly layout adhering to Phase 3 design tokens.
