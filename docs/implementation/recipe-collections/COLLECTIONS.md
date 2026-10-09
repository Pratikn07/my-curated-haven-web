# Collections and recipe tags: spec for the admin panel

Status: collection list agreed with the owner on 2026-10-05. Recipes are being uploaded and tagged through the admin panel (in progress, built separately). This document is what the admin panel builds against. The same list is in [collections.seed.json](collections.seed.json) for import. All 70 catalog recipes, reviewed one at a time against this vocabulary (allergens, age, then collections), with each collection's recipes, are in [RECIPE-TAGS.md](RECIPE-TAGS.md) ([recipe-tags.json](recipe-tags.json), checked by [check_recipe_tags.py](check_recipe_tags.py)).

**In short:** 20 collections. Each collection is **a stage plus a theme**, holds 8–12 recipes, and sits on one of 6 shelves. Breakfast and Meal Prep are **series**: numbered volumes that follow the child as they grow. Recipes are tagged with a finer stage, a meal, goals, practical notes and free-from labels; the website's filters are built from those tags. A recipe can belong to several collections.

Example: a waffle recipe gets the tags `stage: 1–2y`, `meal: breakfast`, `practical: freezes, make-ahead`, `free-from: nut-free`. It is placed in *Toddler Breakfasts* (`toddler-breakfasts`) and *Meal Prep for Toddlers* (`meal-prep`). With a stage note ("3 years: add berries and serve with yogurt"), it can also go into *Big-Kid Breakfasts*.

## Why this shape

- **Stage drives everything.** Posting moves through 6 months, 1 year and 2 years, and a parent's first question is "is this for my child's age?". Collections carry a stage; the website's first control is "Cooking for: 6–12 m · 1–2 y · 2–4 y".
- **Themes come from demand.** On Instagram the most-requested keywords (July–October 2026) were TREAT (6,398 parents), PROTEIN (1,986), GUMMIES (1,821), WAFFLE (1,293) and MEALPREP (1,152). Protein and treat posts also brought the most new followers. Those keyword counts reflect what was posted at the time (toddler food), so the baby-stage collections below come from the posting plan, not from the counts.
- **Audience focus is the US and Western calendar.** Seasonal collections follow that calendar.
- **Small books sell better than a big catalogue.** 8–12 recipes per collection keeps each one easy to understand and price.

## The 20 collections

Stage bands for collections are coarse on purpose (fewer books). Recipes use finer stages (see Tags).

| # | Collection | Slug | Stage | Shelf | Series · Vol. | What goes in it |
|---|---|---|---|---|---|---|
| 1 | First Tastes | `first-tastes` | 6–8 m | Everyday meals | | Single-ingredient and simple purées, first spoonfuls |
| 2 | First Finger Foods | `first-finger-foods` | 9–12 m | Everyday meals | | Soft foods babies pick up and feed themselves |
| 3 | Iron-Rich First Foods | `iron-rich-first-foods` | 6–12 m | Nourish | | Iron plus vitamin C pairings |
| 4 | First Breakfasts | `first-breakfasts` | 6–12 m | Mornings | Breakfast · 1 | Soft pancakes, oat fingers, fruit and yogurt |
| 5 | Batch & Freeze for Babies | `batch-and-freeze-for-babies` | 6–12 m | Cook once | Meal Prep · 1 | Ice-cube-tray purées and mashes |
| 6 | Toddler Breakfasts | `toddler-breakfasts` | 1–2 y | Mornings | Breakfast · 2 | Waffles, egg muffins, overnight oats |
| 7 | Meal Prep for Toddlers | `meal-prep` (live) | 1–2 y | Cook once | Meal Prep · 2 | One prep session, meals all week |
| 8 | Protein Packs | `protein-packs` (live) | 1–2 y | Nourish | | Meals and snacks built around one protein |
| 9 | Everyday Treats | `everyday-treats` | 1 y+ | Snacks & treats | | Desserts with no added sugar |
| 10 | Fruit Gummies | `fruit-gummies` | 1 y+ | Snacks & treats | | Real-fruit gummies |
| 11 | On-the-Go Snacks | `on-the-go-snacks` | 1–2 y | Snacks & treats | | For the bag, the car and the park |
| 12 | Big-Kid Breakfasts | `big-kid-breakfasts` | 2–4 y | Mornings | Breakfast · 3 | Fuller, faster school-morning breakfasts |
| 13 | Freezer Dinners | `freezer-dinners` | 2–4 y | Cook once | Meal Prep · 3 | Batch, freeze, reheat on busy nights |
| 14 | Lunchbox & Daycare | `lunchbox-and-daycare` | 2–4 y | Everyday meals | | Lunches that travel |
| 15 | Picky Eater Favorites | `picky-eater-favorites` | 2–4 y | Everyday meals | | Gentle wins for the "won't eat it" years |
| 16 | Family Dinners | `family-dinners` | all stages | Everyday meals | | One meal for everyone, with stage notes for little ones |
| 17 | Halloween | `halloween` (live) | all stages | Seasons & parties | | October |
| 18 | Thanksgiving Table | `thanksgiving-table` | all stages | Seasons & parties | | November |
| 19 | Holiday Baking | `holiday-baking` | all stages | Seasons & parties | | December |
| 20 | Birthday Party | `birthday-party` | all stages | Seasons & parties | | Any time of year |

By stage: 6–12 months 5 · 1–2 years 6 · 2–4 years 4 · all stages 5.

**Live today:** `halloween`, `meal-prep` and `protein-packs` are published on the website with placeholder prices (see [the plan](README.md)). Keep these three slugs; live links and Instagram posts point at them. All other collections start as drafts.

**Not included:** sleep, potty training and other parenting guides. They are popular on Instagram but are guides, not recipe collections, and belong to a separate effort if added later. No South Asian holiday collections; the seasonal shelf follows the US and Western calendar.

## Shelves

The website groups collections into rows ("shelves"). With a stage chosen, each shelf shows that stage's collections plus the all-stage ones.

| Shelf | Key | Collections |
|---|---|---|
| Mornings | `mornings` | First Breakfasts, Toddler Breakfasts, Big-Kid Breakfasts |
| Everyday meals | `everyday-meals` | First Tastes, First Finger Foods, Lunchbox & Daycare, Picky Eater Favorites, Family Dinners |
| Cook once | `cook-once` | Batch & Freeze for Babies, Meal Prep for Toddlers, Freezer Dinners |
| Nourish | `nourish` | Iron-Rich First Foods, Protein Packs |
| Snacks & treats | `snacks-and-treats` | Everyday Treats, Fruit Gummies, On-the-Go Snacks |
| Seasons & parties | `seasons-and-parties` | Halloween, Thanksgiving Table, Holiday Baking, Birthday Party |

## Collection fields

| Field | Type | Example | Notes |
|---|---|---|---|
| `slug` | text, unique | `toddler-breakfasts` | The URL `/collections/<slug>`. Lowercase words joined by hyphens. Permanent once published |
| `title` | text | Toddler Breakfasts | Shown on the cover and page |
| `tagline` | text | Breakfasts they can hold, made ahead | One line under the title |
| `summary` | text | 2–3 sentences | Why these recipes belong together |
| `stage_min_months` | integer or null | 12 | Null with null max means all stages |
| `stage_max_months` | integer or null | 24 | Null means "and older" (for example 1 y+) |
| `shelf` | one of the shelf keys | `mornings` | |
| `series` | text or null | `breakfast` | Collections in a series share a cloth colour |
| `volume` | integer or null | 2 | Order within the series |
| `cloth` | text | `forest` | Cover colour. Live values: `ember`, `forest`, `plum`, `terracotta`; new colours are a design decision |
| `cover_image` | image or null | | Cloth book cover art; without one the site draws a plain cloth book |
| `status` | `draft` / `published` | `draft` | Drafts never show on production |
| `recipes` | ordered list of recipe ids | 8–12 recipes | Many-to-many with order. A recipe can be in several collections |

Commerce (price, checkout, ownership) is separate: it lives in the commerce tables (`private.commercial_offers`, `access_entitlements`) and is not set in the collection record. Until an offer exists, the site shows a placeholder price and "Opening soon".

The website's current `recipe_collections` table only has `slug`, `title`, `public_summary` and `listing_state`. The fields above need adding, either to that table or to wherever the admin panel stores collections. Today the website reads the three live collections from `my-curated-haven-web/src/config/collections.ts`; once collections live in the database, the site reads them from there instead.

## Recipe tags

Every recipe gets tags from these groups. The website's filters are built from them: groups combine with AND, values within a group combine with OR, and a filter that would show nothing is greyed out.

| Group | Values (key · label) | How many per recipe |
|---|---|---|
| Stage | `6-8m` 6–8 months · `9-12m` 9–12 months · `1-2y` 1–2 years · `2-3y` 2–3 years · `3-5y` 3–5 years | One or more (the stages it suits as written) |
| Meal | `breakfast` · `lunch` · `dinner` · `snack` · `treat` · `drink` | One or more |
| Goal | `protein` · `iron` · `fiber` · `veg-packed` · `picky-friendly` · `sick-days` | Zero or more |
| Practical | `under-15-min` · `freezes` · `make-ahead` · `one-pot` · `no-cook` · `on-the-go` · `whole-family` | Zero or more |
| Free-from | `egg-free` · `dairy-free` · `nut-free` · `gluten-free` · `vegetarian` · `vegan` | Zero or more. Must match the recipe's allergen list |
| Occasion | `halloween` · `thanksgiving` · `holidays` · `birthday` · `back-to-school` · `summer` | Zero or more |
| Texture | `puree` · `mash` · `finger-food` · `bites` · `bowl` | One, mostly for 6–12 months |

**Stage notes:** short, optional lines on adapting the recipe by age, for example "9 months: mash and serve on a spoon · 18 months: cut into fingers · 3 years: add berries". They let one recipe serve several stages without copies. The site shows the note for the stage the parent picked.

## Rules for the admin panel

1. A collection can only be published with 8–12 recipes, and every recipe in it must have passed recipe review.
2. A recipe's stage tags should include the collection's stage, or the recipe needs a stage note for that stage.
3. Free-from tags are checked against the recipe's allergens: a recipe containing egg cannot be tagged `egg-free`.
4. Slugs never change after publishing. Retire a collection instead of renaming it.
5. Drafts are visible to admins and on preview deployments, never on production.

## Open decisions

- Cover art: 6 new covers made on 2026-10-06 (First Tastes, Iron-Rich First Foods, Batch & Freeze for Babies, Family Dinners, Lunchbox & Daycare, Picky Eater Favorites).
- Real prices and the refresh promise per collection (plan task RC-01 to RC-05 in the [implementation plan](IMPLEMENTATION-PLAN.md)).
- The other 11 covers were made by the owner on 2026-10-06 from the same prompt style; all 20 collections now have cover art.

**Website (2026-10-06):** `/collections` is the bookcase: "Cooking for" an age, filter chips, a featured seasonal book, shelves, and series pages at `/collections/series/<key>`. Collections with 8–12 recipes open to their own page with a placeholder price and "Opening soon"; the rest stand on the shelf as "coming soon". The first showroom stays at `/collections/test` (Halloween, Meal Prep, Protein Packs). Data: `src/config/collections.ts` and `src/config/recipe-snapshot.ts`.
