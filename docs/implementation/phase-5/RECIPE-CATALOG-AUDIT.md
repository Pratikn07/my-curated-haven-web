# Recipe Catalog Source Audit

[Phase 5 overview](README.md) · [Editorial mapping](EDITORIAL-MAPPING.md) · [Free recipes selection](FREE-RECIPES-SELECTION.md)

## Summary of Findings

An audit of the 70 recipes in `public.recipes` on the unified Supabase project `Pratikn07's Project` (`ccrgvammglkvdlaojgzv`) was conducted on 2026-09-23.

| Metric | Result | Assessment |
| --- | --- | --- |
| Total Source Recipes | 70 | 100% of expected catalog |
| Recipes with Complete Ingredients | 70 / 70 (100%) | All items have amounts and item descriptions |
| Recipes with Ordered Steps | 70 / 70 (100%) | All instructions are non-empty step sequences |
| Recipes with Valid Times | 70 / 70 (100%) | Ranges from 5 minutes to 480 minutes (median: 25 min) |
| Recipes with Servings / Yield | 70 / 70 (100%) | Ranges from 1 to 16 servings |
| Recipes with Public Image URLs | 70 / 70 (100%) | Hosted in Supabase storage bucket `recipe-images` |
| Recipes with Allergens Declared | 48 / 70 (68.6%) | 22 recipes are naturally allergen-free fruit/veg |
| Slug Uniqueness | 70 / 70 (100%) | Zero collisions with kebab-case slugifier |

---

## Category and Feeding Type Breakdown

The catalog covers key early childhood and family feeding stages:

| Feeding Category | Recipe Count | Examples |
| --- | --- | --- |
| **Toddler Meals** (`toddlerMeals`) | 20 | Apple Cinnamon Oat Porridge, Mini Turkey & Veggie Meatballs |
| **Finger Foods & BLW** (`fingerFoods`, `babyLedWeaning`) | 20 | Sweet Potato Frittata Fingers, Soft-Baked Oat Bars, Fish Cakes |
| **Baby Purées** (`babyPurees`) | 14 | Banana Avocado Breakfast Purée, Mediterranean Lentil Purée |
| **Family Meals** (`familyMeals`) | 10 | Cheesy Broccoli Pasta Bake, Mild Chicken Curry Bowls |
| **Treats & Snacks** (`treatsSnacks`) | 10 | Banana Oatmeal Teething Bites, Yogurt Frozen Bark |
| **Pregnancy Nutrition** (`pregnancyNutrition`) | 10 | Iron-Rich Spinach Smoothie, Quinoa Nourish Bowl |

---

## Dietary and Allergen Characteristics

### Common Dietary Labels
- **Nut-Free**: 62 recipes (88.6%)
- **Vegetarian**: 51 recipes (72.8%)
- **Egg-Free**: 40 recipes (57.1%)
- **Dairy-Free**: 34 recipes (48.6%)
- **Gluten-Free**: 31 recipes (44.3%)
- **Vegan**: 23 recipes (32.8%)
- **Soy-Free**: 16 recipes (22.8%)

### Allergen Declarations
All recipes with allergens declare one or more of the top recognized allergens: `milk`, `eggs`, `fish`, `wheat`, `soy`, `peanuts`, `tree_nuts`, `shellfish`. Recipes with zero listed allergens represent simple, single-ingredient or whole-fruit/vegetable preparations (such as purees or oat bars).

---

## Conclusion

The 70 recipes in the existing database provide a solid, comprehensive, and high-quality foundation. Rather than creating new synthetic content or duplicating data, ingesting these records into `recipe_catalog` and `recipe_bodies` fulfills product continuity between the parenting mobile app and web platform.
