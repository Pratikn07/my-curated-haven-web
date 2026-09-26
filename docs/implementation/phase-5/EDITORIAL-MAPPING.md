# Editorial Mapping and Normalization Rules

[Phase 5 overview](README.md) · [Catalog audit](RECIPE-CATALOG-AUDIT.md) · [Free recipes selection](FREE-RECIPES-SELECTION.md)

> **Correction (2026-09-25 audit).** The `allergen_review_state` rule below derived "reviewed" from whether the LLM's allergen array was empty. That was never a review. All bodies are now `unknown` (`20260926052700_phase5_audit_reset_allergen_review_and_fix_drafts.sql`), and a recipe can only be published once reviewed (`20260926052702_phase5_audit_publish_requires_review.sql`).

## Purpose

This specification governs the mapping and translation of records from the legacy `public.recipes` table into the Phase 4 contracts: `public.recipe_catalog`, `public.recipe_bodies`, and `public.free_recipe_slots`.

---

## Field-by-Field Translation Rules

### 1. `public.recipe_catalog`

| Target Field | Source Field (`public.recipes`) | Transformation / Guardrail |
| :--- | :--- | :--- |
| `id` | `id` | Preserves canonical UUID from source. Never generate a new ID for an existing recipe. |
| `slug` | `title` | Normalized via `private.slugify`: lowercase, replaces `&` with `and`, removes non-alphanumeric chars, converts spaces to `-`, trims hyphens. |
| `title` | `title` | Clean text representation. |
| `public_summary` | `description` | Primary summary for search cards and social metadata. Defaults to `title` if null. |
| `preview_image_path` | `image_url` | Direct URL or storage object path. Never empty. |
| `total_minutes` | `time_minutes` | Total elapsed time in minutes. Constraint: must be positive integer or null. |
| `meal_labels` | `meal_types` | Array of meal types (e.g. `['breakfast', 'snack', 'lunch', 'dinner']`). Defaults to `{}`. |
| `diet_labels` | `dietary_tags` | Array of dietary labels (e.g. `['vegetarian', 'gluten-free', 'nut-free']`). Defaults to `{}`. |
| `publication_state` | Editorial Decision | `'published'` for the 3 selected free recipes (not yet reviewed). `'draft'` for all other 67 recipes. |
| `published_at` | Calculated | `now()` for published recipes; `NULL` for draft recipes. |
| `created_at` | `created_at` | Carried forward from source timestamp. |
| `updated_at` | `updated_at` | Timestamp of migration execution. |

---

### 2. `public.recipe_bodies`

| Target Field | Source Field (`public.recipes`) | Transformation / Guardrail |
| :--- | :--- | :--- |
| `recipe_id` | `id` | Foreign key referencing `recipe_catalog(id)`. |
| `content_version` | Literal `1` | Starts at version 1 for initial content ingest. |
| `ingredients` | `ingredients` | JSONB array containing objects with `{ item, amount }`. |
| `instructions` | `instructions` | JSONB array containing ordered steps or instruction objects. |
| `yield` | `servings` | Formatted string: `COALESCE(servings::text || ' servings', '2 servings')`. |
| `yield_structured` | `NULL` | Reserved for future structured portions. |
| `reviewed_notes` | `tips` | Array converted to newline-separated string via `array_to_string(tips, E'\n')`. |
| `allergen_review_state` | `allergens` (superseded) | `'reviewed_listed'` if `cardinality(allergens) > 0`, `'reviewed_no_allergens'` if `cardinality(allergens) = 0`, else `'unknown'`. |
| `allergens` | `allergens` | Array of declared allergens. |
| `storage_notes` | `storage` | Storage and freezing guidance text. |

---

### 3. `public.free_recipe_slots`

| Slot Number | Recipe ID | Title |
| :--- | :--- | :--- |
| `1` | `0003c4cc-b2cb-4e49-97c8-f4febfed39f9` | Sweet Potato & Spinach Frittata Fingers |
| `2` | `50663aaa-7e47-4b08-9fd8-a58b390db96d` | Soft-Baked Blueberry & Oat Bars |
| `3` | `a61d93da-4d19-4219-a131-bca2468ace88` | Salmon & Pea Fish Cakes |

Constraints:
- Exactly 3 slots (enforced by CHECK `slot IN (1, 2, 3)`).
- Unique `recipe_id` foreign key per slot.
- Idempotent upsert via `ON CONFLICT (slot) DO UPDATE`.
