# Recipe tags and collection placement

Status: reviewed one recipe at a time on 2026-10-05, replacing the first batch pass. For owner review before the admin panel exists. The admin panel can import [recipe-tags.json](recipe-tags.json); this page is the readable copy. Vocabulary and rules: [COLLECTIONS.md](COLLECTIONS.md). Re-check any edit with `python3 check_recipe_tags.py`.

**In short:** each of the 70 recipes was read in full (ingredients, steps, tips, storage) and checked for allergens, then age, then collections. **9 of 20 collections** have 8–12 recipes (First Tastes, Iron-Rich First Foods, Batch & Freeze for Babies, Meal Prep for Toddlers, Protein Packs, Lunchbox & Daycare, Picky Eater Favorites, Family Dinners, Halloween). **11 are short.** The review also found 10 adult recipes with no age and no child steps (8 of them mention pregnancy), 2 wrong allergen lists, 1 wrong gluten-free claim and 1 internal reviewer note shown as a recipe step. On 2026-10-05 the allergen lists, the gluten-free tag and the note were fixed in the catalog, and the 7 adult recipes in the live collections were swapped for children's recipes. What is still open is under "Fix in the catalog".

Example: *Overnight Oats with Chia and Berries* (#34) has no catalog age. Its tip says it helps "when nausea makes hot food unappealing", it is topped with sliced almonds (a choking risk under 4), and it is sweetened with honey or maple. It is judged "from 4 years as written" and placed in no collection until it is rewritten for children. After that it fits Toddler Breakfasts and Big-Kid Breakfasts.

## How each recipe was checked

1. **Allergens.** Every ingredient was read, including optional ones and hidden sources (soy sauce has wheat, hummus has sesame, pesto has nuts, mayonnaise has egg). The result was compared with the catalog allergen list. A script then re-reads the ingredients by keyword, separately from this review, and matched it on all 70 recipes.
2. **Free-from tags** follow the allergens found. Gluten-free also needs any oats or granola to be named gluten-free, and any soy sauce to be tamari. Vegan also excludes honey.
3. **Age.** Starts from the catalog range, then checks honey (never before 12 months), cow's milk as a drink, nuts, round foods and texture against the youngest age. Recipes without a catalog age were judged as written. Stage tags follow the confirmed range.
4. **Collections.** Hard rules: stage fit, freezing for freezer books, no nuts in Lunchbox & Daycare or Birthday Party, no added sugar in Everyday Treats, an iron source for Iron-Rich, no free samples or review-rejected recipes in paid books, and no adult recipes in new books. Theme fit is a judgement, with a reason written per placement.
5. **Live collections** (Halloween, Meal Prep for Toddlers, Protein Packs) keep their current recipes. Conflicts are flagged and not moved.

## Fix in the catalog

| Recipe | Problem | Fix | Status |
|---|---|---|---|
| #15 Baked Fish Tacos with Slaw | Allergen list said wheat, but the recipe uses corn tortillas | Allergens fish only; tortilla ingredient says to check the label for wheat | Done 2026-10-05 |
| #16 Tofu and Vegetable Stir-Fry | Allergen list missed wheat: regular soy sauce contains wheat | Wheat added | Done 2026-10-05 |
| #58 Apple Sunflower Snack Rounds | Tagged gluten-free, but the oat cereal is not named gluten-free | Gluten-free tag removed | Done 2026-10-05 |
| #11 Mild Vegetable Curry with Rice | Step 9 was an internal reviewer note ("Manually inspect the blocked image...") | Step 9 deleted | Done 2026-10-05 |
| #28 Baked Sweet Potato with Black Beans and Avocado | One of 10 adult recipes (#28–37): no age, no child steps; 8 of them mention pregnancy | Rewrite #28–37 for children, or retire them from the kids catalog. Out of live collections since 2026-10-05 | Open |
| #69 Soft-Baked Blueberry & Oat Bars | Rejected by the review gate over its 6-month minimum age; published as a free recipe | Expert decision on minimum age and shape | Open |
| #70 Salmon & Pea Fish Cakes | Smashing the peas for 9-month-olds is only a tip | Make it a step | Open |

The four fixes were one guarded database change: each recipe moved to content version 3 with a new review record, so the review gate still passes. Backup: `~/MyCuratedHavenBackups/2026-10-05-before-recipe-tag-fixes`; SQL: `recipe-review/apply-tag-review-fixes.sql` (private, outside this repository).

Smaller gaps: 22 recipes qualify for gluten-free, vegan or vegetarian but the catalog does not tag them, so the free-from tags here add them. Puff pastry (#38) and the broths (#6, #12, #13, #30) need a label check.

## Live collections: changes on 2026-10-05

The live collections held 7 adult recipes. They were swapped for reviewed children's recipes in `src/config/collections.ts`; each book still has 10 recipes.

- **Protein Packs (1–2 years):** out #29 Chicken Stir-Fry, #33 Mediterranean Chicken Salad, #35 Quinoa Burrito Bowl, #36 Salmon Bowl, #37 Egg Muffins. In #40 Onigiri Rice Triangles, #54 Soft Chicken Veggie Rice Bowl, #18 Bean and Veggie Burrito Bowl, #55 Soft Tofu Veggie Stir Fry, #56 Turkey Veggie Mini Meatballs.
- **Meal Prep for Toddlers:** out #30 Folate-Rich Lentil Soup and #32 Lentil Curry. In #11 Mild Vegetable Curry with Rice and #50 Cheesy Veggie Quinoa Toddler Bites; both freeze, so "every one of them freezes" still holds.
- **Halloween:** unchanged.

## Collections

| # | Collection | Stage | Recipes | Ready? |
|---|---|---|---:|---|
| 1 | First Tastes (`first-tastes`) | 6–8 m | 8 | Ready |
| 2 | First Finger Foods (`first-finger-foods`) | 9–12 m | 7 | Short: 1+ soft finger food for 9–12 months |
| 3 | Iron-Rich First Foods (`iron-rich-first-foods`) | 6–12 m | 8 | Ready |
| 4 | First Breakfasts (`first-breakfasts`) | 6–12 m | 2 | Short: 6+ breakfasts for 6–12 months (soft pancakes, oat fingers, porridges). The free Frittata Fingers stay free |
| 5 | Batch & Freeze for Babies (`batch-and-freeze-for-babies`) | 6–12 m | 11 | Ready |
| 6 | Toddler Breakfasts (`toddler-breakfasts`) | 1–2 y | 4 | Short: 4+ toddler breakfasts. Spinach and Feta Egg Muffins (#37) joins after a light rewrite |
| 7 | Meal Prep for Toddlers (`meal-prep`) | 1–2 y | 10 | Ready (live) |
| 8 | Protein Packs (`protein-packs`) | 1–2 y | 10 | Ready (live) |
| 9 | Everyday Treats (`everyday-treats`) | 1 y+ | 7 | Short: 1+ dessert with no added sugar |
| 10 | Fruit Gummies (`fruit-gummies`) | 1 y+ | 0 | Short: 8+ real-fruit gummy recipes; none in the catalog (the Instagram GUMMIES guides have them) |
| 11 | On-the-Go Snacks (`on-the-go-snacks`) | 1–2 y | 6 | Short: 2+ snacks for 1–2 years that travel |
| 12 | Big-Kid Breakfasts (`big-kid-breakfasts`) | 2–4 y | 1 | Short: 7+ breakfasts for 2–4 years. #31, #34 and #37 can join after a rewrite |
| 13 | Freezer Dinners (`freezer-dinners`) | 2–4 y | 6 | Short: 2+ freezer dinners. #30 and #32 can join after a rewrite |
| 14 | Lunchbox & Daycare (`lunchbox-and-daycare`) | 2–4 y | 11 | Ready |
| 15 | Picky Eater Favorites (`picky-eater-favorites`) | 2–4 y | 12 | Ready |
| 16 | Family Dinners (`family-dinners`) | all stages | 11 | Ready |
| 17 | Halloween (`halloween`) | all stages | 8 | Ready (live) |
| 18 | Thanksgiving Table (`thanksgiving-table`) | all stages | 4 | Short: 4+ Thanksgiving recipes (turkey, pumpkin, stuffing, cranberry) |
| 19 | Holiday Baking (`holiday-baking`) | all stages | 1 | Short: 7+ baked holiday treats (cookies, breads, muffins) |
| 20 | Birthday Party (`birthday-party`) | all stages | 4 | Short: 4+ nut-free party foods (cake, cupcakes, finger food) |

### First Tastes · 8 recipes

- #1 Apple Prune Fiber Friendly Purée (6–24 m): Two-fruit smooth purée, from 6 m
- #2 Asian Pear Rice Congee Purée (6–18 m): Simple rice and pear purée from 6 m
- #3 Banana Avocado Breakfast Purée with Yogurt (6–18 m): Three-ingredient no-cook purée from 6 m
- #4 Comforting Sweet Potato Lentil Khichdi Purée (6–18 m): Smooth purée from 6 m
- #5 Indian Rice Mung Dal Spinach Purée (7–24 m): Smooth purée from 7 m
- #7 Mediterranean Red Lentil Carrot Purée (7–24 m): Two-ingredient purée from 7 m
- #9 Silky Carrot Apple Starter Purée (6–12 m): Written as a first-spoon purée
- #10 Zucchini Chickpea Mediterranean Purée (7–18 m): Two-ingredient purée from 7 m

### First Finger Foods · 7 recipes

- #21 Avocado & Black Bean Quesadilla Strips (9 m–5 y): Written as finger-width strips from 9 m
- #22 Cheesy Broccoli & Quinoa Bites (9 m–5 y): Soft bites, crumbled for babies
- #23 Mild Curried Red Lentil Cakes (10 m–4 y): Strips from 10 m
- #24 Mini Turkey & Apple Meatloaf Muffins (9 m–3 y): Soft mini meatloaf pieces from 9 m
- #25 Pumpkin & Ricotta Gnocchi Pillows (8 m–4 y): Soft strips from 8 m
- #26 Sesame Tofu & Veggie Cubes (6 m–3 y): Strips from 6 m, cubes from 9 m
- #27 Zucchini & Feta Fritters (8 m–5 y): Finger-width strips from 8 m

### Iron-Rich First Foods · 8 recipes

- #4 Comforting Sweet Potato Lentil Khichdi Purée (6–18 m): Red lentils with sweet potato
- #5 Indian Rice Mung Dal Spinach Purée (7–24 m): Mung dal and spinach
- #7 Mediterranean Red Lentil Carrot Purée (7–24 m): Red lentils
- #8 Mild Mexican Black Bean Sweet Corn Purée (8–24 m): Black beans with tomato (vitamin C)
- #10 Zucchini Chickpea Mediterranean Purée (7–18 m): Chickpeas (legume iron)
- #13 Slow Cooker Beef and Vegetable Stew (6 m–10 y): Beef, puréed from 6 m
- #18 Bean and Veggie Burrito Bowl (9 m–10 y): Black beans with tomato and lime (vitamin C)
- #23 Mild Curried Red Lentil Cakes (10 m–4 y): Red lentils, from 10 m

### First Breakfasts · 2 recipes

- #2 Asian Pear Rice Congee Purée (6–18 m): Porridge purée for breakfast
- #3 Banana Avocado Breakfast Purée with Yogurt (6–18 m): Named as a breakfast purée

### Batch & Freeze for Babies · 11 recipes

- #1 Apple Prune Fiber Friendly Purée (6–24 m): Freezes 2 months in small portions
- #2 Asian Pear Rice Congee Purée (6–18 m): Freezes 1 month
- #4 Comforting Sweet Potato Lentil Khichdi Purée (6–18 m): Freezes 1 month, tip says double batch
- #5 Indian Rice Mung Dal Spinach Purée (7–24 m): Freezes 1 month
- #6 Italian Tomato Vegetable Purée with Tiny Pasta (9–24 m): Freezes 1 month; tip says freeze the vegetable base
- #7 Mediterranean Red Lentil Carrot Purée (7–24 m): Freezes 2 months, tip says silicone trays
- #8 Mild Mexican Black Bean Sweet Corn Purée (8–24 m): Freezes 2 months in ice cube trays
- #9 Silky Carrot Apple Starter Purée (6–12 m): Freezes 2 months, tips cover tray freezing
- #10 Zucchini Chickpea Mediterranean Purée (7–18 m): Freezes 2 months in cubes
- #12 One-Pot Chicken and Vegetable Rice (6 m–10 y): Puréed chicken and rice freezes; adds a meat option among the vegetable purées
- #13 Slow Cooker Beef and Vegetable Stew (6 m–10 y): Tip says freeze baby portions in ice cube trays

### Toddler Breakfasts · 4 recipes

- #48 Apple Cinnamon Oat Toddler Porridge (1–4 y): Warm porridge from 12 m
- #49 Banana Peanut Butter Chia Pudding (18 m–4 y): Make-ahead breakfast from 18 m
- #57 Veggie Lentil Pancakes (1–3 y): Savory pancakes, batter can be made the night before
- #62 Mango Lassi Chia Pudding Cups (1–4 y): Made the night before

### Meal Prep for Toddlers · 10 recipes

- #11 Mild Vegetable Curry with Rice (6 m–10 y): Added 2026-10-05: freezes 2 months
- #12 One-Pot Chicken and Vegetable Rice (6 m–10 y): Live member; one pot, double batch tip
- #13 Slow Cooker Beef and Vegetable Stew (6 m–10 y): Live member; slow cooker batch
- #20 Veggie-Packed Lasagna (1–10 y): Live member; assemble ahead
- #22 Cheesy Broccoli & Quinoa Bites (9 m–5 y): Live member; freezes 2 months
- #24 Mini Turkey & Apple Meatloaf Muffins (9 m–3 y): Live member; freezes 2 months
- #47 Mini Bean & Cheese Burritos (1–10 y): Live member; freezes 1 month
- #50 Cheesy Veggie Quinoa Toddler Bites (1–3 y): Added 2026-10-05: freezes 2 months
- #57 Veggie Lentil Pancakes (1–3 y): Live member; freezes 2 months
- #59 Cheesy Veggie Mini Muffins (1–4 y): Live member

### Protein Packs · 10 recipes

- #18 Bean and Veggie Burrito Bowl (9 m–10 y): Added 2026-10-05: black beans, mashed for babies
- #23 Mild Curried Red Lentil Cakes (10 m–4 y): Live member
- #26 Sesame Tofu & Veggie Cubes (6 m–3 y): Live member
- #39 Mini Baked Chicken Nuggets (1–10 y): Live member
- #40 Onigiri Rice Triangles (1–10 y): Added 2026-10-05: tuna or salmon, written for 12 m+
- #44 Turkey & Hummus Pinwheels (1–10 y): Live member
- #53 Salmon Potato Veggie Mash (1–4 y): Live member
- #54 Soft Chicken Veggie Rice Bowl (1–3 y): Added 2026-10-05: chicken, written for 1-3 years
- #55 Soft Tofu Veggie Stir Fry with Rice (1–3 y): Added 2026-10-05: tofu, written for 1-3 years
- #56 Turkey Veggie Mini Meatballs with Pasta (18 m–4 y): Added 2026-10-05: turkey meatballs cut small

### Everyday Treats · 7 recipes

- #49 Banana Peanut Butter Chia Pudding (18 m–4 y): Pudding with no added sugar (banana only)
- #60 Chickpea Cookie Dough Fruit Dip (18 m–5 y): Dessert-style dip sweetened only with banana or dates
- #62 Mango Lassi Chia Pudding Cups (1–4 y): Pudding with no added sugar (mango only)
- #63 Mini Berry Yogurt Pops (1–4 y): Sweetened only by fruit
- #64 Soft Banana Oat Toddler Cookies (1–4 y): No added sugar (banana)
- #65 Soft Date Almond Cocoa Bites (2–6 y): Sweetened only by dates
- #66 Soft Peanut Butter Oat Energy Balls (2–5 y): Sweetened only by banana

### Fruit Gummies · 0 recipes

- None yet.

### On-the-Go Snacks · 6 recipes

- #22 Cheesy Broccoli & Quinoa Bites (9 m–5 y): Holds its shape at room temperature
- #42 Savory Corn & Cheddar Muffins (1–10 y): Freezes, travels without crumbling
- #50 Cheesy Veggie Quinoa Toddler Bites (1–3 y): Freezes, travels
- #59 Cheesy Veggie Mini Muffins (1–4 y): Freezes, easy to hold
- #64 Soft Banana Oat Toddler Cookies (1–4 y): Freezes, travels
- #67 Veggie Rice Snack Fritters (1–4 y): Tip says pack for lunchboxes and outings

### Big-Kid Breakfasts · 1 recipes

- #49 Banana Peanut Butter Chia Pudding (18 m–4 y): Suits up to 4 years, ready in the fridge

### Freezer Dinners · 6 recipes

- #11 Mild Vegetable Curry with Rice (6 m–10 y): Freezes 2 months, batch tip
- #12 One-Pot Chicken and Vegetable Rice (6 m–10 y): Freezes 2 months
- #13 Slow Cooker Beef and Vegetable Stew (6 m–10 y): Freezes 2 months
- #19 Mediterranean Baked Chicken with Quinoa (1–10 y): Freezes 2 months, tip says bake extra
- #20 Veggie-Packed Lasagna (1–10 y): Freezes unbaked 2 months: the classic freezer dinner
- #54 Soft Chicken Veggie Rice Bowl (1–3 y): Freezes 2 months, portion tip

### Lunchbox & Daycare · 11 recipes

- #21 Avocado & Black Bean Quesadilla Strips (9 m–5 y): Nut-free, eaten cold, made that morning
- #27 Zucchini & Feta Fritters (8 m–5 y): Served cold, nut-free
- #38 Baked Samosa Puffs (1–10 y): Nut-free, eaten at room temperature
- #39 Mini Baked Chicken Nuggets (1–10 y): Steps say pack into a lunchbox
- #40 Onigiri Rice Triangles (1–10 y): Written for the lunchbox, kept cold
- #42 Savory Corn & Cheddar Muffins (1–10 y): Summary says it holds up in a lunchbox
- #43 Spinach & Cheese Pizza Scrolls (1–10 y): Written for packing, good cold
- #44 Turkey & Hummus Pinwheels (1–10 y): Written for a chilled lunchbox
- #46 Greek Pita Bento Box (1–10 y): A packed bento lunch
- #47 Mini Bean & Cheese Burritos (1–10 y): Stays good cold
- #51 Creamy Hummus Yogurt Veggie Dippers (18 m–4 y): Nut-free; pack cold

### Picky Eater Favorites · 12 recipes

- #20 Veggie-Packed Lasagna (1–10 y): Spinach and zucchini hidden in cheese
- #21 Avocado & Black Bean Quesadilla Strips (9 m–5 y): Cheese and tortilla, familiar shape
- #39 Mini Baked Chicken Nuggets (1–10 y): Nuggets: the classic safe food
- #43 Spinach & Cheese Pizza Scrolls (1–10 y): Pizza with spinach hidden inside
- #47 Mini Bean & Cheese Burritos (1–10 y): Beans and cheese in a tortilla
- #50 Cheesy Veggie Quinoa Toddler Bites (1–3 y): Carrot and spinach hidden in cheese
- #51 Creamy Hummus Yogurt Veggie Dippers (18 m–4 y): Dip makes vegetables easier
- #52 Deconstructed Soft Taco Toddler Bowl (18 m–4 y): Separate sections; tip for children unsure about beans
- #56 Turkey Veggie Mini Meatballs with Pasta (18 m–4 y): Hidden zucchini and carrot; dip option
- #59 Cheesy Veggie Mini Muffins (1–4 y): Carrot and spinach inside a cheese muffin
- #61 Cinnamon Sweet Potato Snack Fries with Yogurt Dip (1–4 y): Fries with a dip
- #67 Veggie Rice Snack Fritters (1–4 y): Rice with vegetables mixed in

### Family Dinners · 11 recipes

- #11 Mild Vegetable Curry with Rice (6 m–10 y): One pot, texture by age
- #12 One-Pot Chicken and Vegetable Rice (6 m–10 y): Whole family, purée for babies
- #13 Slow Cooker Beef and Vegetable Stew (6 m–10 y): One stew for everyone
- #14 Vegetable Noodle Soup (6 m–10 y): One pot, infant portion set aside
- #15 Baked Fish Tacos with Slaw (1–10 y): Build-your-own family tacos
- #16 Tofu and Vegetable Stir-Fry (8 m–10 y): Infant portion set aside before soy sauce
- #17 Vegetable Pasta Primavera (8 m–10 y): One pasta, texture by age
- #18 Bean and Veggie Burrito Bowl (9 m–10 y): Build-your-own bowls, toppings separate
- #19 Mediterranean Baked Chicken with Quinoa (1–10 y): One-dish bake
- #20 Veggie-Packed Lasagna (1–10 y): One dish for everyone
- #56 Turkey Veggie Mini Meatballs with Pasta (18 m–4 y): Summary: same meal for the whole family

### Halloween · 8 recipes

- #25 Pumpkin & Ricotta Gnocchi Pillows (8 m–4 y): Live member; pumpkin
- #42 Savory Corn & Cheddar Muffins (1–10 y): Live member
- #43 Spinach & Cheese Pizza Scrolls (1–10 y): Live member
- #58 Apple Sunflower Snack Rounds (18 m–4 y): Live member
- #61 Cinnamon Sweet Potato Snack Fries with Yogurt Dip (1–4 y): Live member
- #63 Mini Berry Yogurt Pops (1–4 y): Live member
- #64 Soft Banana Oat Toddler Cookies (1–4 y): Live member
- #65 Soft Date Almond Cocoa Bites (2–6 y): Live member

### Thanksgiving Table · 4 recipes

- #24 Mini Turkey & Apple Meatloaf Muffins (9 m–3 y): Turkey and apple: a small-hands Thanksgiving plate
- #25 Pumpkin & Ricotta Gnocchi Pillows (8 m–4 y): Pumpkin
- #42 Savory Corn & Cheddar Muffins (1–10 y): Corn muffins: a Thanksgiving side
- #61 Cinnamon Sweet Potato Snack Fries with Yogurt Dip (1–4 y): Cinnamon sweet potato: a Thanksgiving flavour

### Holiday Baking · 1 recipes

- #65 Soft Date Almond Cocoa Bites (2–6 y): Chocolate treat for December (no-bake)

### Birthday Party · 4 recipes

- #38 Baked Samosa Puffs (1–10 y): Hand-held party pastry
- #39 Mini Baked Chicken Nuggets (1–10 y): Kids' party staple
- #43 Spinach & Cheese Pizza Scrolls (1–10 y): Pizza for a party
- #63 Mini Berry Yogurt Pops (1–4 y): Frozen party treat

## Every recipe

Allergens are what the ingredients contain (with the ingredient). "Age" is the confirmed range. Collections in *italics* are possible only after a rewrite.

### #1 Apple Prune Fiber Friendly Purée

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 6–24 m (catalog, checked). Smooth purée, no honey: fine from 6 m.
- **Tags:** 6-8m, 9-12m, 1-2y · snack, breakfast · fiber · freezes, make-ahead · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · puree
- **Collections:** First Tastes, Batch & Freeze for Babies

### #2 Asian Pear Rice Congee Purée

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 6–18 m (catalog, checked). Blended rice and pear, strained for 6-7 m: fine.
- **Tags:** 6-8m, 9-12m, 1-2y · breakfast, dinner · sick-days · freezes, make-ahead · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · puree
- **Collections:** First Tastes, First Breakfasts, Batch & Freeze for Babies
- Catalog diet tags miss gluten-free; rice, pear and water are gluten-free.

### #3 Banana Avocado Breakfast Purée with Yogurt

- **Allergens:** milk: whole milk yogurt. Catalog list: milk.
- **Age:** 6–18 m (catalog, checked). Mashed and strained; yogurt fine from 6 m, recipe warns against cow's milk as a drink.
- **Tags:** 6-8m, 9-12m, 1-2y · breakfast, snack · no goal · under-15-min, no-cook · egg-free, nut-free, gluten-free, vegetarian · puree
- **Collections:** First Tastes, First Breakfasts

### #4 Comforting Sweet Potato Lentil Khichdi Purée

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 6–18 m (catalog, checked). Blended smooth, oil only for 9 m+: fine.
- **Tags:** 6-8m, 9-12m, 1-2y · lunch, dinner · iron, protein, fiber · freezes, make-ahead, one-pot · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · puree
- **Collections:** First Tastes, Iron-Rich First Foods, Batch & Freeze for Babies

### #5 Indian Rice Mung Dal Spinach Purée

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 7–24 m (catalog, checked). Blended and sieved for 7 m: fine.
- **Tags:** 6-8m, 9-12m, 1-2y · lunch, dinner · iron, protein, veg-packed · freezes, make-ahead, one-pot · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · puree
- **Collections:** First Tastes, Iron-Rich First Foods, Batch & Freeze for Babies

### #6 Italian Tomato Vegetable Purée with Tiny Pasta

- **Allergens:** wheat: egg-free wheat pasta; milk: Parmesan (optional). Catalog list: wheat, milk.
- **Age:** 9–24 m (catalog, checked). Pasta blended smooth: fine from 9 m.
- **Tags:** 9-12m, 1-2y · lunch, dinner · veg-packed · freezes, make-ahead · egg-free, nut-free, vegetarian · puree
- **Collections:** Batch & Freeze for Babies
- Parmesan is usually made with animal rennet; vegetarian only with a vegetarian hard cheese. Broth must be checked for allergens.

### #7 Mediterranean Red Lentil Carrot Purée

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 7–24 m (catalog, checked). Smooth, sieved for younger babies: fine from 7 m.
- **Tags:** 6-8m, 9-12m, 1-2y · lunch, dinner · iron, protein, fiber · freezes, make-ahead, one-pot · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · puree
- **Collections:** First Tastes, Iron-Rich First Foods, Batch & Freeze for Babies

### #8 Mild Mexican Black Bean Sweet Corn Purée

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 8–24 m (catalog, checked). Fully blended and strained: fine from 8 m.
- **Tags:** 6-8m, 9-12m, 1-2y · lunch, dinner · iron, protein, fiber · freezes, make-ahead, one-pot · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · puree
- **Collections:** Iron-Rich First Foods, Batch & Freeze for Babies
- Left out of First Tastes: a spiced bean purée from 8 m is a second-stage purée, not a first spoonful.

### #9 Silky Carrot Apple Starter Purée

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 6–12 m (catalog, checked). Starter purée from 6 m.
- **Tags:** 6-8m, 9-12m · lunch, snack · veg-packed · freezes, make-ahead · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · puree
- **Collections:** First Tastes, Batch & Freeze for Babies
- Left out of Thanksgiving Table: a carrot-apple baby purée has no Thanksgiving link.

### #10 Zucchini Chickpea Mediterranean Purée

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 7–18 m (catalog, checked). Smooth, sieved for 7-8 m: fine.
- **Tags:** 6-8m, 9-12m, 1-2y · lunch, dinner · protein, iron, fiber, veg-packed · freezes, make-ahead, one-pot · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · puree
- **Collections:** First Tastes, Iron-Rich First Foods, Batch & Freeze for Babies

### #11 Mild Vegetable Curry with Rice

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 6 m–10 y (catalog, checked). Puréed or mashed for babies, whole peas only for older children: fine.
- **Tags:** 6-8m, 9-12m, 1-2y, 2-3y, 3-5y · dinner, lunch · veg-packed · freezes, make-ahead, one-pot, whole-family · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · bowl
- **Collections:** Freezer Dinners, Family Dinners, Meal Prep for Toddlers
- Fixed 2026-10-05: the internal reviewer note (step 9) was deleted.
- Coconut milk: not a tree nut under current FDA guidance, but some parents avoid it; say 'contains coconut'.
- Curry powder: check label for wheat fillers to keep gluten-free.

### #12 One-Pot Chicken and Vegetable Rice

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 6 m–10 y (catalog, checked). Puréed smooth for babies; chicken to 165°F: fine.
- **Tags:** 6-8m, 9-12m, 1-2y, 2-3y, 3-5y · dinner, lunch · protein · freezes, make-ahead, one-pot, whole-family · egg-free, dairy-free, nut-free, gluten-free · bowl
- **Collections:** Meal Prep for Toddlers, Family Dinners, Freezer Dinners, Batch & Freeze for Babies
- Broth: use no-salt broth and check its label for allergens and gluten.

### #13 Slow Cooker Beef and Vegetable Stew

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 6 m–10 y (catalog, checked). Puréed for babies after removing tough pieces: fine.
- **Tags:** 6-8m, 9-12m, 1-2y, 2-3y, 3-5y · dinner · protein, iron · freezes, make-ahead, one-pot, whole-family · egg-free, dairy-free, nut-free, gluten-free · bowl
- **Collections:** Meal Prep for Toddlers, Iron-Rich First Foods, Batch & Freeze for Babies, Freezer Dinners, Family Dinners
- In 5 collections, the most of any recipe.
- Beef broth is not low-sodium in the ingredient list; babies need no-salt broth.
- Broth: check label for gluten.

### #14 Vegetable Noodle Soup

- **Allergens:** soy: low-sodium soy sauce (older servings); wheat: soy sauce. Catalog list: soy, wheat.
- **Age:** 6 m–10 y (catalog, checked). Infant portion taken before soy sauce, puréed: fine.
- **Tags:** 6-8m, 9-12m, 1-2y, 2-3y, 3-5y · dinner, lunch · veg-packed, sick-days · one-pot, whole-family, freezes · egg-free, dairy-free, nut-free, vegetarian, vegan · bowl
- **Collections:** Family Dinners
- Left out of Freezer Dinners: rice noodles go mushy when frozen; better freezer options exist.
- Gluten-free if tamari replaces soy sauce.

### #15 Baked Fish Tacos with Slaw

- **Allergens:** fish: white fish. Catalog list: fish.
- **Age:** 1–10 y (catalog, checked). Fish flaked, tortillas cut small, slaw softened: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · dinner · protein · whole-family · egg-free, dairy-free, nut-free · finger-food
- **Collections:** Family Dinners
- Fixed 2026-10-05: allergen list is now fish only, and the tortilla ingredient says to check the label for wheat.

### #16 Tofu and Vegetable Stir-Fry

- **Allergens:** soy: firm tofu, soy sauce; sesame: sesame oil; wheat: soy sauce. Catalog list: wheat, soy, sesame.
- **Age:** 8 m–10 y (catalog, checked). Tofu and vegetables mashed for infants, no firm cubes: fine from 8 m.
- **Tags:** 6-8m, 9-12m, 1-2y, 2-3y, 3-5y · dinner · protein, veg-packed · whole-family, freezes · egg-free, dairy-free, nut-free, vegetarian, vegan · bowl
- **Collections:** Family Dinners
- Fixed 2026-10-05: wheat added to the allergen list.
- Left out of Freezer Dinners: frozen tofu stir-fry goes spongy; storage only allows 1 month.

### #17 Vegetable Pasta Primavera

- **Allergens:** wheat: whole wheat pasta; milk: parmesan. Catalog list: wheat, milk.
- **Age:** 8 m–10 y (catalog, checked). Mashed or puréed for young children, tomatoes quartered: fine.
- **Tags:** 6-8m, 9-12m, 1-2y, 2-3y, 3-5y · dinner · veg-packed · whole-family · egg-free, nut-free, vegetarian · bowl
- **Collections:** Family Dinners
- Left out of Freezer Dinners: storage says only the sauce freezes, not the dish.

### #18 Bean and Veggie Burrito Bowl

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 9 m–10 y (catalog, checked). Beans and corn flattened, all mashed for babies: fine from 9 m.
- **Tags:** 9-12m, 1-2y, 2-3y, 3-5y · dinner, lunch · protein, iron, fiber, veg-packed · whole-family, make-ahead · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · bowl
- **Collections:** Iron-Rich First Foods, Family Dinners, Protein Packs
- Left out of Freezer Dinners: only the rice and beans freeze; avocado and tomato are fresh.

### #19 Mediterranean Baked Chicken with Quinoa

- **Allergens:** milk: feta. Catalog list: milk.
- **Age:** 1–10 y (catalog, checked). Chicken in tiny pieces; olives sliced. Fine from 12 m, but quarter olives lengthwise for under-2s.
- **Tags:** 1-2y, 2-3y, 3-5y · dinner · protein · freezes, make-ahead, one-pot, whole-family · egg-free, nut-free, gluten-free · bowl
- **Collections:** Family Dinners, Freezer Dinners
- Olives are only 'sliced': say 'quartered lengthwise' for young children.

### #20 Veggie-Packed Lasagna

- **Allergens:** wheat: lasagna noodles; milk: ricotta, mozzarella; eggs: egg. Catalog list: wheat, milk, eggs.
- **Age:** 1–10 y (catalog, checked). Soft small squares: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · dinner · veg-packed, picky-friendly · freezes, make-ahead, whole-family · nut-free, vegetarian · bowl
- **Collections:** Meal Prep for Toddlers, Freezer Dinners, Family Dinners, Picky Eater Favorites
- Catalog diet tags miss vegetarian; no meat in the recipe. Marinara: check label.

### #21 Avocado & Black Bean Quesadilla Strips

- **Allergens:** wheat: wheat flour tortilla; milk: shredded cheese. Catalog list: wheat, milk.
- **Age:** 9 m–5 y (catalog, checked). Finger-width soft strips, beans mashed flat: fine from 9 m.
- **Tags:** 9-12m, 1-2y, 2-3y, 3-5y · lunch, snack · protein, picky-friendly · under-15-min · egg-free, nut-free, vegetarian · finger-food
- **Collections:** First Finger Foods, Lunchbox & Daycare, Picky Eater Favorites
- Left out of Birthday Party: an everyday lunch, not party food.

### #22 Cheesy Broccoli & Quinoa Bites

- **Allergens:** eggs: eggs; milk: cheddar. Catalog list: eggs, milk.
- **Age:** 9 m–5 y (catalog, checked). Crumbled or cut small under 12 m, no stems: fine.
- **Tags:** 9-12m, 1-2y, 2-3y, 3-5y · lunch, dinner, snack · protein, veg-packed, picky-friendly · freezes, make-ahead, on-the-go · nut-free, gluten-free, vegetarian · bites
- **Collections:** Meal Prep for Toddlers, First Finger Foods, On-the-Go Snacks
- If cooked in broth (tip), check the broth label for gluten.

### #23 Mild Curried Red Lentil Cakes

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 10 m–4 y (catalog, checked). Soft inside, cut into strips under 12 m: fine.
- **Tags:** 9-12m, 1-2y, 2-3y, 3-5y · dinner, lunch · protein, iron, fiber · freezes, make-ahead · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · finger-food
- **Collections:** Protein Packs, First Finger Foods, Iron-Rich First Foods
- Catalog diet tags miss vegan; no animal products.
- Left out of Freezer Dinners: a side cake, not a dinner.

### #24 Mini Turkey & Apple Meatloaf Muffins

- **Allergens:** eggs: egg; wheat: breadcrumbs. Catalog list: eggs, wheat.
- **Age:** 9 m–3 y (catalog, checked). Cut by chewing ability, turkey to 165°F: fine from 9 m.
- **Tags:** 9-12m, 1-2y, 2-3y · dinner, lunch · protein · freezes, make-ahead · dairy-free, nut-free · finger-food · thanksgiving
- **Collections:** Meal Prep for Toddlers, First Finger Foods, Thanksgiving Table
- Left out of Iron-Rich First Foods: ground turkey is a modest iron source.

### #25 Pumpkin & Ricotta Gnocchi Pillows

- **Allergens:** wheat: all-purpose flour; milk: ricotta, parmesan. Catalog list: wheat, milk.
- **Age:** 8 m–4 y (catalog, checked). Pressed flat and cut into strips for 8-12 m: fine.
- **Tags:** 6-8m, 9-12m, 1-2y, 2-3y, 3-5y · dinner · picky-friendly · freezes, make-ahead · egg-free, nut-free · finger-food · halloween, thanksgiving
- **Collections:** Halloween, First Finger Foods, Thanksgiving Table
- Parmesan usually uses animal rennet, so not tagged vegetarian.

### #26 Sesame Tofu & Veggie Cubes

- **Allergens:** soy: firm tofu; sesame: sesame oil. Catalog list: soy, sesame.
- **Age:** 6 m–3 y (catalog, checked). Strips for 6-9 m, cubes with pincer grasp, vegetables squashable: fine.
- **Tags:** 6-8m, 9-12m, 1-2y, 2-3y · lunch, dinner · protein, veg-packed · make-ahead · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · finger-food
- **Collections:** Protein Packs, First Finger Foods
- Catalog diet tags miss gluten-free; no wheat (cornstarch, no soy sauce).

### #27 Zucchini & Feta Fritters

- **Allergens:** eggs: egg; wheat: all-purpose flour; milk: feta. Catalog list: eggs, wheat, milk.
- **Age:** 8 m–5 y (catalog, checked). Soft, set fritters cut into finger-width strips under 12 m: fine.
- **Tags:** 6-8m, 9-12m, 1-2y, 2-3y, 3-5y · lunch, snack · veg-packed, picky-friendly · on-the-go · nut-free, vegetarian · finger-food
- **Collections:** First Finger Foods, Lunchbox & Daycare

### #28 Baked Sweet Potato with Black Beans and Avocado

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 1–10 y (judged: the catalog has no age). NO AGE IN CATALOG. Written as an adult recipe: salt in the beans, whole beans and corn. From 12 m if beans are mashed, corn flattened and salt left out for the child's portion. The recipe does not say this.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch, dinner · protein, iron, fiber, veg-packed · whole-family, make-ahead · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · bowl
- **Collections:** none · *after rewrite: Family Dinners*
- WRITTEN FOR PREGNANCY, NOT CHILDREN (same no-age set as #31-37): rewrite with child steps before adding to any new collection.
- Needs a child-portion step (mash beans, flatten corn, no salt) before it suits under-3s.
- Catalog diet tags miss vegan.
- Left out of Thanksgiving Table: Tex-Mex stuffed sweet potato, not a Thanksgiving dish.

### #29 Chicken and Vegetable Stir-Fry with Brown Rice

- **Allergens:** soy: tamari; sesame: sesame oil. Catalog list: soy, sesame.
- **Age:** 2–10 y (judged: the catalog has no age). NO AGE IN CATALOG. As written: crisp-tender broccoli, snap peas, raw-ish pepper strips, no child steps. Firm and fibrous for under-2s. From 24 m as written; from 12 m only with a step to cook vegetables soft and cut chicken small.
- **Tags:** 2-3y, 3-5y · dinner · protein, veg-packed · whole-family · egg-free, dairy-free, nut-free, gluten-free · bowl
- **Collections:** none · *after rewrite: Family Dinners*
- WRITTEN FOR PREGNANCY, NOT CHILDREN (same no-age set as #31-37): rewrite with child steps before adding to any new collection.
- Gluten-free relies on the wheat-free tamari it names; catalog diet tags miss gluten-free.
- Removed from the live Protein Packs on 2026-10-05 (adult recipe; suits older children as written).

### #30 Folate-Rich Lentil and Spinach Soup

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 1–10 y (judged: the catalog has no age). NO AGE IN CATALOG. Soft soup, but salt to taste and regular broth. From 12 m as written; from 9 m if blended with no-salt broth and no added salt.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch, dinner · iron, protein, fiber, veg-packed, sick-days · freezes, make-ahead, one-pot, whole-family · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · bowl
- **Collections:** none · *after rewrite: Freezer Dinners, Family Dinners*
- WRITTEN FOR PREGNANCY, NOT CHILDREN; title says folate-rich (same no-age set as #31-37): rewrite with child steps before adding to any new collection.
- Broth: use low-sodium and check its label for gluten.
- Title says 'folate-rich': a nutrition claim the review flagged on other titles.
- Removed from the live Meal Prep on 2026-10-05 (adult recipe).

### #31 Greek Yogurt Parfait with Berries and Almonds

- **Allergens:** milk: Greek yogurt; tree nuts: sliced almonds. Catalog list: milk, tree_nuts.
- **Age:** 4–10 y (judged: the catalog has no age). NO AGE IN CATALOG. As written: honey (not before 12 m) and sliced almonds (a choking risk under 4). From 48 m as written; from 12 m with almonds ground or left out.
- **Tags:** 3-5y · breakfast, snack · no goal · under-15-min, no-cook · egg-free, gluten-free, vegetarian · bowl
- **Collections:** none · *after rewrite: Big-Kid Breakfasts*
- WRITTEN FOR PREGNANCY, NOT CHILDREN: tip mentions morning nausea.
- Gluten-free relies on the certified gluten-free granola it names.

### #32 Lentil and Vegetable Curry with Coconut Milk

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 1–10 y (judged: the catalog has no age). NO AGE IN CATALOG. Soft curry, but salt and 2 tbsp curry powder. From 12 m with the child's portion taken before salt.
- **Tags:** 1-2y, 2-3y, 3-5y · dinner · iron, protein, fiber, veg-packed · freezes, make-ahead, one-pot, whole-family · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · bowl
- **Collections:** none · *after rewrite: Freezer Dinners, Family Dinners*
- WRITTEN FOR PREGNANCY, NOT CHILDREN: tip says 'if sensitive to spices during pregnancy'.
- Coconut milk: say 'contains coconut'.
- Removed from the live Meal Prep on 2026-10-05 (adult recipe).

### #33 Mediterranean Chicken and Chickpea Salad

- **Allergens:** milk: feta. Catalog list: milk.
- **Age:** 3–10 y (judged: the catalog has no age). NO AGE IN CATALOG. As written: whole chickpeas, halved (not quartered) cherry tomatoes, halved olives, raw onion, salad leaves, salt. Choking risks under 3. From 36 m as written.
- **Tags:** 3-5y · lunch · protein · make-ahead, no-cook · egg-free, nut-free, gluten-free · bowl
- **Collections:** none · *after rewrite: Lunchbox & Daycare*
- WRITTEN FOR PREGNANCY, NOT CHILDREN: tip mentions pregnancy fatigue.
- Removed from the live Protein Packs on 2026-10-05 (adult recipe; suits older children as written).

### #34 Overnight Oats with Chia and Berries

- **Allergens:** milk: milk, Greek yogurt; tree nuts: sliced almonds, almond milk (option). Catalog list: milk, tree_nuts.
- **Age:** 4–10 y (judged: the catalog has no age). NO AGE IN CATALOG. Sliced almond topping (a choking risk under 4) and honey or maple. From 48 m as written; from 12 m without the almonds.
- **Tags:** 3-5y · breakfast · fiber · make-ahead, no-cook · egg-free, vegetarian · bowl
- **Collections:** none · *after rewrite: Toddler Breakfasts, Big-Kid Breakfasts*
- WRITTEN FOR PREGNANCY, NOT CHILDREN: tip mentions nausea.
- 3 tbsp honey or maple: added sugar, so never Everyday Treats.
- Regular oats: not gluten-free (catalog agrees).

### #35 Quinoa and Black Bean Burrito Bowl

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 2–10 y (judged: the catalog has no age). NO AGE IN CATALOG. Whole beans and corn, halved cherry tomatoes, raw onion, salt. From 24 m as written; from 12 m with beans mashed, tomatoes quartered, no salt.
- **Tags:** 2-3y, 3-5y · lunch, dinner · protein, iron, fiber, veg-packed · make-ahead, whole-family · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · bowl
- **Collections:** none · *after rewrite: Lunchbox & Daycare, Family Dinners*
- Same no-age adult set as #28-37 (no pregnancy words in this one, but no child steps).
- Removed from the live Protein Packs on 2026-10-05 (adult recipe; suits older children as written).

### #36 Salmon and Sweet Potato Bowl with Avocado

- **Allergens:** fish: salmon. Catalog list: fish.
- **Age:** 2–10 y (judged: the catalog has no age). NO AGE IN CATALOG. Salted sweet potato and salmon, raw massaged kale, no child steps or bone check. From 24 m as written; from 12 m with salmon flaked and checked for bones, kale chopped fine, no salt.
- **Tags:** 2-3y, 3-5y · lunch, dinner · protein · make-ahead, whole-family · egg-free, dairy-free, nut-free, gluten-free · bowl
- **Collections:** none · *after rewrite: Family Dinners*
- Same adult set as #28-37 (mercury tip suggests the pregnancy set).
- Removed from the live Protein Packs on 2026-10-05 (adult recipe; suits older children as written).

### #37 Spinach and Feta Egg Muffins

- **Allergens:** eggs: eggs; milk: feta, milk. Catalog list: eggs, milk.
- **Age:** 1–10 y (judged: the catalog has no age). NO AGE IN CATALOG. Soft baked egg, tomatoes quartered, little salt: fine from 12 m cut into strips.
- **Tags:** 1-2y, 2-3y, 3-5y · breakfast, snack · protein, veg-packed · freezes, make-ahead, on-the-go · nut-free, gluten-free, vegetarian · finger-food
- **Collections:** none · *after rewrite: Toddler Breakfasts, Big-Kid Breakfasts*
- WRITTEN FOR PREGNANCY: tip says 'when morning sickness makes hot foods unappealing'. Light rewrite only: replace that tip and add a cutting step for 12 m.
- Removed from the live Protein Packs on 2026-10-05 (adult recipe; suits older children as written).

### #38 Baked Samosa Puffs

- **Allergens:** wheat: puff pastry. Catalog list: wheat.
- **Age:** 1–10 y (catalog, checked). Peas flattened, cut into soft pieces, cooled: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch, snack · picky-friendly · freezes, make-ahead, on-the-go · egg-free, nut-free, vegetarian · finger-food · birthday
- **Collections:** Lunchbox & Daycare, Birthday Party
- Puff pastry: some brands contain butter (milk). Not tagged dairy-free; label check needed.

### #39 Mini Baked Chicken Nuggets

- **Allergens:** eggs: egg; wheat: breadcrumbs. Catalog list: eggs, wheat.
- **Age:** 1–10 y (catalog, checked). Cut into soft pieces, 165°F: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch, dinner · protein, picky-friendly · freezes, make-ahead, on-the-go · dairy-free, nut-free · finger-food · birthday
- **Collections:** Protein Packs, Picky Eater Favorites, Lunchbox & Daycare, Birthday Party
- In 4 collections.

### #40 Onigiri Rice Triangles

- **Allergens:** eggs: mayonnaise; fish: tuna or salmon. Catalog list: eggs, fish.
- **Age:** 1–10 y (catalog, checked). Loose soft rice, no salt for the child, nori only if soft: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch · protein · on-the-go · dairy-free, nut-free, gluten-free · finger-food · back-to-school
- **Collections:** Lunchbox & Daycare, Protein Packs
- Same-day only: storage says use the same day.

### #41 Rainbow Pesto Pasta Salad

- **Allergens:** wheat: pasta; milk: mozzarella, pesto cheese; tree nuts: pesto. Catalog list: wheat, milk, tree_nuts.
- **Age:** 1–10 y (catalog, checked). Soft pasta, tomatoes quartered lengthwise, peas pressed flat (later fix): fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch · veg-packed · make-ahead · egg-free, vegetarian · bowl · summer
- **Collections:** none
- Not placed: contains tree nuts, so it cannot go in Lunchbox & Daycare; no other book fits a cold pasta salad. A nut-free pesto version would fit Lunchbox.

### #42 Savory Corn & Cheddar Muffins

- **Allergens:** wheat: all-purpose flour; milk: milk, butter, cheddar; eggs: egg. Catalog list: wheat, milk, eggs.
- **Age:** 1–10 y (catalog, checked). Corn finely mashed, small soft pieces under 4: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch, snack · picky-friendly · freezes, make-ahead, on-the-go · nut-free, vegetarian · finger-food · halloween, thanksgiving
- **Collections:** Halloween, Lunchbox & Daycare, On-the-Go Snacks, Thanksgiving Table
- Left out of Holiday Baking: a savory corn muffin, not a festive bake.
- In 4 collections.

### #43 Spinach & Cheese Pizza Scrolls

- **Allergens:** wheat: pizza dough; milk: mozzarella. Catalog list: wheat, milk.
- **Age:** 1–10 y (catalog, checked). Cut into narrow soft strips, never whole scrolls: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch, snack · veg-packed, picky-friendly · freezes, make-ahead, on-the-go · egg-free, nut-free, vegetarian · finger-food · halloween, birthday
- **Collections:** Halloween, Lunchbox & Daycare, Picky Eater Favorites, Birthday Party
- In 4 collections.

### #44 Turkey & Hummus Pinwheels

- **Allergens:** wheat: whole wheat tortilla; sesame: hummus. Catalog list: wheat, sesame.
- **Age:** 1–10 y (catalog, checked). Unrolled and cut into soft strips: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch · protein · under-15-min, no-cook · egg-free, dairy-free, nut-free · finger-food · back-to-school
- **Collections:** Protein Packs, Lunchbox & Daycare
- Left out of Birthday Party: served as strips, not pinwheels, for young children.

### #45 Cold Sesame Noodle Salad

- **Allergens:** wheat: wheat spaghetti, soy sauce; soy: soy sauce; peanuts: peanut butter; sesame: sesame oil. Catalog list: wheat, soy, peanuts, sesame.
- **Age:** 18 m–10 y (catalog, checked). Short soft noodles, smooth peanut butter thinned: fine from 18 m.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch · no goal · under-15-min, make-ahead · egg-free, dairy-free, vegetarian, vegan · bowl · summer
- **Collections:** none
- Not placed: contains peanuts, so not Lunchbox & Daycare; no other book fits.

### #46 Greek Pita Bento Box

- **Allergens:** wheat: pita; milk: feta; sesame: hummus. Catalog list: wheat, milk, sesame.
- **Age:** 1–10 y (catalog, checked). Soft narrow strips, peppers cooked soft under 18 m: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch · no goal · under-15-min, no-cook, on-the-go · egg-free, nut-free, vegetarian · finger-food · back-to-school
- **Collections:** Lunchbox & Daycare

### #47 Mini Bean & Cheese Burritos

- **Allergens:** wheat: flour tortillas; milk: cheddar. Catalog list: wheat, milk.
- **Age:** 1–10 y (catalog, checked). Opened, tortilla cut in soft strips for toddlers: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch · protein, picky-friendly · under-15-min, freezes, make-ahead, on-the-go · egg-free, nut-free, vegetarian · finger-food · back-to-school
- **Collections:** Meal Prep for Toddlers, Lunchbox & Daycare, Picky Eater Favorites
- Left out of On-the-Go Snacks: a lunch, not a snack.

### #48 Apple Cinnamon Oat Toddler Porridge

- **Allergens:** milk: cow's milk. Catalog list: milk.
- **Age:** 1–4 y (catalog, checked). Cow's milk cooked in, soft oats: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · breakfast · fiber · make-ahead · egg-free, nut-free, vegetarian · bowl
- **Collections:** Toddler Breakfasts
- Left out of Thanksgiving Table: an everyday porridge.
- A tip suggests optional nut butter; still nut-free as written.

### #49 Banana Peanut Butter Chia Pudding

- **Allergens:** milk: yogurt, milk; peanuts: peanut butter. Catalog list: milk, peanuts.
- **Age:** 18 m–4 y (catalog, checked). Blended smooth, peanut butter stirred in: fine from 18 m.
- **Tags:** 1-2y, 2-3y, 3-5y · breakfast, snack, treat · protein · make-ahead, no-cook · egg-free, gluten-free, vegetarian · bowl
- **Collections:** Toddler Breakfasts, Big-Kid Breakfasts, Everyday Treats

### #50 Cheesy Veggie Quinoa Toddler Bites

- **Allergens:** milk: cheddar; eggs: egg; wheat: breadcrumbs. Catalog list: milk, eggs, wheat.
- **Age:** 1–3 y (catalog, checked). Soft, cut or crumbled: fine from 12 m.
- **Tags:** 1-2y, 2-3y · lunch, snack · veg-packed, picky-friendly · freezes, make-ahead, on-the-go · nut-free, vegetarian · bites
- **Collections:** On-the-Go Snacks, Picky Eater Favorites, Meal Prep for Toddlers

### #51 Creamy Hummus Yogurt Veggie Dippers

- **Allergens:** milk: whole milk yogurt; sesame: hummus. Catalog list: milk, sesame.
- **Age:** 18 m–4 y (catalog, checked). Steamed soft, squish-tested sticks: fine from 18 m.
- **Tags:** 1-2y, 2-3y, 3-5y · snack, lunch · veg-packed, picky-friendly · make-ahead · egg-free, nut-free, gluten-free, vegetarian · finger-food
- **Collections:** Picky Eater Favorites, Lunchbox & Daycare
- Catalog diet tags miss gluten-free (hummus, yogurt, vegetables). Check hummus label.

### #52 Deconstructed Soft Taco Toddler Bowl

- **Allergens:** milk: shredded cheese. Catalog list: milk.
- **Age:** 18 m–4 y (catalog, checked). Mashed sweet potato and beans, small tortilla strips: fine from 18 m.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch, dinner · protein, iron, fiber, veg-packed, picky-friendly · — · egg-free, nut-free, gluten-free, vegetarian · bowl
- **Collections:** Picky Eater Favorites
- Catalog diet tags miss gluten-free (corn tortilla).

### #53 Salmon Potato Veggie Mash

- **Allergens:** milk: butter; fish: salmon. Catalog list: milk, fish.
- **Age:** 1–4 y (catalog, checked). Bones removed, peas mashed, small soft flakes: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch, dinner · protein · — · egg-free, nut-free, gluten-free · mash
- **Collections:** Protein Packs
- Catalog diet tags miss gluten-free.

### #54 Soft Chicken Veggie Rice Bowl

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 1–3 y (catalog, checked). Shredded under 1/2 inch, vegetables soft: fine from 12 m.
- **Tags:** 1-2y, 2-3y · lunch, dinner · protein, veg-packed · freezes, make-ahead, one-pot · egg-free, dairy-free, nut-free, gluten-free · bowl
- **Collections:** Freezer Dinners, Protein Packs
- Catalog diet tags miss gluten-free. Broth: check label.

### #55 Soft Tofu Veggie Stir Fry with Rice

- **Allergens:** soy: tofu, tamari. Catalog list: soy.
- **Age:** 1–3 y (catalog, checked). Soft strips or crumbles, pieces under 1/2 inch: fine from 12 m.
- **Tags:** 1-2y, 2-3y · lunch, dinner · protein, veg-packed · — · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · bowl
- **Collections:** Protein Packs

### #56 Turkey Veggie Mini Meatballs with Pasta

- **Allergens:** milk: Parmesan; eggs: egg; wheat: breadcrumbs, pasta. Catalog list: milk, eggs, wheat.
- **Age:** 18 m–4 y (catalog, checked). Meatballs quartered to under 1/2 inch: fine from 18 m.
- **Tags:** 1-2y, 2-3y, 3-5y · lunch, dinner · protein, veg-packed, picky-friendly · make-ahead, whole-family, freezes · nut-free · bowl
- **Collections:** Family Dinners, Picky Eater Favorites, Protein Packs
- 'Freezes' comes from the tip (freeze baked meatballs); the storage note does not say it.
- Left out of Thanksgiving Table: turkey meatballs are not a Thanksgiving dish.

### #57 Veggie Lentil Pancakes

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 1–3 y (catalog, checked). Soft, cut into 1/2-inch strips: fine from 12 m.
- **Tags:** 1-2y, 2-3y · breakfast, lunch · protein, iron, fiber, veg-packed · freezes, make-ahead · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · finger-food
- **Collections:** Meal Prep for Toddlers, Toddler Breakfasts
- Catalog diet tags miss gluten-free (lentils and vegetables only).

### #58 Apple Sunflower Snack Rounds

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 18 m–4 y (catalog, checked). Steamed apple, thin spread, 1-inch pieces: fine from 18 m.
- **Tags:** 1-2y, 2-3y, 3-5y · snack · no goal · under-15-min · egg-free, dairy-free, nut-free, vegetarian, vegan · finger-food
- **Collections:** Halloween
- Fixed 2026-10-05: the gluten-free tag was removed.
- Left out of On-the-Go Snacks: keeps only 4 hours in the fridge.

### #59 Cheesy Veggie Mini Muffins

- **Allergens:** milk: cheddar, milk; eggs: egg; wheat: all-purpose flour. Catalog list: milk, eggs, wheat.
- **Age:** 1–4 y (catalog, checked). Soft, halved or quartered: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · snack, lunch · veg-packed, picky-friendly · freezes, make-ahead, on-the-go · nut-free, vegetarian · finger-food
- **Collections:** Meal Prep for Toddlers, On-the-Go Snacks, Picky Eater Favorites
- Also fits Lunchbox & Daycare (tip says lunchbox snacks); left out to limit overlap.

### #60 Chickpea Cookie Dough Fruit Dip

- **Allergens:** milk: yogurt; peanuts: peanut butter. Catalog list: milk, peanuts.
- **Age:** 18 m–5 y (catalog, checked). Smooth dip, small soft fruit pieces: fine from 18 m.
- **Tags:** 1-2y, 2-3y, 3-5y · snack, treat · protein, fiber · under-15-min, no-cook, make-ahead · egg-free, gluten-free, vegetarian · bowl
- **Collections:** Everyday Treats
- Left out of Birthday Party: peanut butter is a risk when other children may have allergies.
- Catalog diet tags miss gluten-free.

### #61 Cinnamon Sweet Potato Snack Fries with Yogurt Dip

- **Allergens:** milk: whole milk yogurt. Catalog list: milk.
- **Age:** 1–4 y (catalog, checked). Soft-centre sticks, shortened for newer eaters: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · snack · veg-packed, picky-friendly · — · egg-free, nut-free, gluten-free, vegetarian · finger-food · halloween, thanksgiving
- **Collections:** Halloween, Picky Eater Favorites, Thanksgiving Table
- Catalog diet tags miss gluten-free.
- Left out of Birthday Party: a side dish.

### #62 Mango Lassi Chia Pudding Cups

- **Allergens:** milk: yogurt, milk. Catalog list: milk.
- **Age:** 1–4 y (catalog, checked). Blended, chia fully soaked, cow's milk cooked into food is fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · snack, breakfast, treat · no goal · make-ahead, no-cook · egg-free, nut-free, gluten-free, vegetarian · bowl · summer
- **Collections:** Toddler Breakfasts, Everyday Treats

### #63 Mini Berry Yogurt Pops

- **Allergens:** milk: yogurt, milk (option). Catalog list: milk.
- **Age:** 1–4 y (catalog, checked). Shavings in a bowl under 24 m, whole mini pop only from 24 m seated: fine.
- **Tags:** 1-2y, 2-3y, 3-5y · snack, treat · no goal · freezes, make-ahead · egg-free, nut-free, gluten-free, vegetarian · bowl · summer, birthday
- **Collections:** Halloween, Everyday Treats, Birthday Party
- Catalog diet tags miss gluten-free.

### #64 Soft Banana Oat Toddler Cookies

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 1–4 y (catalog, checked). Soft, broken into 1/2-inch pieces: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · snack, breakfast, treat · fiber · freezes, make-ahead, on-the-go · egg-free, dairy-free, nut-free, gluten-free, vegetarian, vegan · finger-food
- **Collections:** Halloween, Everyday Treats, On-the-Go Snacks
- Left out of Holiday Baking: a plain everyday cookie, not a festive bake.
- Coconut oil is an option: say 'may contain coconut'.

### #65 Soft Date Almond Cocoa Bites

- **Allergens:** tree nuts: almond flour. Catalog list: tree_nuts.
- **Age:** 2–6 y (catalog, checked). Flattened discs, cut to 1/2 inch under 4, never balls: fine from 24 m.
- **Tags:** 2-3y, 3-5y · snack, treat · no goal · freezes, make-ahead · egg-free, dairy-free, gluten-free, vegetarian, vegan · bites · holidays
- **Collections:** Halloween, Everyday Treats, Holiday Baking
- Left out of Birthday Party: tree nuts at a shared party.
- Holiday Baking fit is loose: no oven involved.

### #66 Soft Peanut Butter Oat Energy Balls

- **Allergens:** peanuts: peanut butter. Catalog list: peanuts.
- **Age:** 2–5 y (catalog, checked). Flattened discs, cut to 1/2 inch under 4, never balls: fine from 24 m.
- **Tags:** 2-3y, 3-5y · snack, treat · fiber · freezes, make-ahead, on-the-go · egg-free, dairy-free, gluten-free, vegetarian, vegan · bites
- **Collections:** Everyday Treats
- Catalog diet tags miss egg-free, dairy-free and vegan.
- Left out of On-the-Go Snacks: that book is 1-2 years and this starts at 24 m.
- Left out of Holiday Baking and Birthday Party: no-bake everyday snack, and peanuts at a party.

### #67 Veggie Rice Snack Fritters

- **Allergens:** eggs: egg. Catalog list: eggs.
- **Age:** 1–4 y (catalog, checked). Set centre, soft pieces 1-1.5 inch: fine from 12 m.
- **Tags:** 1-2y, 2-3y, 3-5y · snack, lunch · veg-packed, picky-friendly · make-ahead, on-the-go · dairy-free, nut-free, gluten-free, vegetarian · finger-food
- **Collections:** On-the-Go Snacks, Picky Eater Favorites

### #68 Sweet Potato & Spinach Frittata Fingers (free sample)

- **Allergens:** eggs: eggs; milk: milk, cheddar. Catalog list: eggs, milk.
- **Age:** 6–24 m (catalog, checked). Soft strips 1x3 inch for grip, spinach finely chopped: fine from 6 m.
- **Tags:** 6-8m, 9-12m, 1-2y · breakfast, lunch · protein, veg-packed · freezes, make-ahead · nut-free, gluten-free, vegetarian · finger-food
- **Collections:** none
- Free sample: tagged, kept out of paid collections.

### #69 Soft-Baked Blueberry & Oat Bars (free sample)

- **Allergens:** none of the top 9. Catalog list: none.
- **Age:** 9 m–4 y (changed from the catalog (6–48 m)). UNRESOLVED. Catalog says 6 m, and the review gate rejects this recipe over that age. Firm centre, whole oats and 16 squares read as 9 m+ to me; an expert should decide.
- **Tags:** 9-12m, 1-2y, 2-3y, 3-5y · snack, breakfast, treat · fiber · freezes, make-ahead, on-the-go · egg-free, dairy-free, nut-free, vegetarian, vegan · finger-food
- **Collections:** none
- Free sample: tagged, kept out of paid collections.
- REJECTED by the review gate (minimum age and shape). Published as a free recipe today.
- Coconut oil: say 'contains coconut'.
- Catalog diet tags miss vegan.

### #70 Salmon & Pea Fish Cakes (free sample)

- **Allergens:** fish: salmon; wheat: flour for dusting. Catalog list: fish, wheat.
- **Age:** 9 m–5 y (catalog, checked). Cut into strips, bones checked; peas only smashed in a tip. Fine from 9 m if peas are smashed.
- **Tags:** 9-12m, 1-2y, 2-3y, 3-5y · dinner · protein · freezes, make-ahead · egg-free, dairy-free, nut-free · finger-food
- **Collections:** none
- Free sample: tagged, kept out of paid collections.
- Pea smashing is only a tip; for 9 m it should be a step.
