# Free recipe review checklist

[Phase 5 overview](README.md) · [Audit backlog](../../audit/AUDIT-BACKLOG.md#phase-5-recipe-structure-and-editorial-review)

Prepared by the 2026-09-25 audit for the owner's editorial review (backlog R5-03). **Nothing on this page is approved yet.**

## Why this review is needed

All 70 recipes were written by an LLM from `scripts/RECIPE_PROMPT.md` in the iOS repo (`Pratikn07/parenting-app`) and imported without human review. Their images are AI-generated (FLUX Pro via Replicate). Until a person reviews a recipe, the site labels its allergens "Listed in this recipe, not yet reviewed".

Content below is copied from production (`public.recipes`, 2026-09-25). "Audit notes" are points to check. They are not verdicts, and not medical or nutrition advice.

## How to approve a recipe

1. Read the recipe on the live page and against the source below.
2. Tick each check, or write what needs to change.
3. Send the approvals. The audit then records reviewer and date, and sets the body's allergen state (`reviewed_listed`, or `reviewed_no_allergens` for Oat Bars).

Because of the publishing gate added by this audit, a recipe can only go live, take a free slot or join a collection once it is reviewed.

---

## Slot 1: Sweet Potato & Spinach Frittata Fingers

`0003c4cc-b2cb-4e49-97c8-f4febfed39f9` · `/recipes/sweet-potato-and-spinach-frittata-fingers`

| Field | Source value |
| --- | --- |
| Age range | 6 to 24 months |
| Time | 30 minutes |
| Servings | 8 |
| Allergens | eggs, milk |
| Diet tags | vegetarian, nut-free, gluten-free, soy-free |

**Ingredients**: 6 large eggs · 1/2 cup sweet potato, cooked and mashed · 1/2 cup fresh spinach, finely chopped · 2 tbsp milk (dairy or breastmilk) · 1/4 cup mild cheddar cheese, shredded

**Steps**: 8 steps. Bake at 350°F (175°C) in an 8×8 inch dish for 18 to 22 minutes, cool 15 minutes, cut into 1 × 3 inch strips. Step 8: "SAFETY CHECK: Ensure the spinach is chopped very finely to prevent gagging."

**Storage**: fridge up to 3 days; freeze up to 2 months.

**Audit notes**
- **Image doesn't match the recipe.** It shows round fritters on a toddler plate next to pasta, cherry tomatoes and orange slices. The recipe makes rectangular strips from a baked dish. Replace the image, or accept it knowingly.
- **Time looks low.** 30 minutes, but the steps add up to prep plus 18 to 22 minutes baking plus 15 minutes cooling.
- The allergens (eggs, milk) match the ingredients. The cheddar and milk are dairy.
- Confirm you're comfortable with a 6-month starting age for eggs and cheese.

| Check | OK? |
| --- | --- |
| Ingredients and amounts are correct and complete | ☐ |
| Steps are safe and in the right order (temperature, doneness, cooling) | ☐ |
| Allergens are complete: eggs, milk | ☐ |
| Texture and size suit the stated age (choking and gagging) | ☐ |
| Time and servings are right, or give corrected values | ☐ |
| Storage guidance is right | ☐ |
| Image is acceptable (see the mismatch note) | ☐ |

**Draft alt text** (describes the current image): "Round golden egg fritters flecked with spinach and sweet potato on a teal divided toddler plate, with orange pieces and a fork beside it."

---

## Slot 2: Soft-Baked Blueberry & Oat Bars

`50663aaa-7e47-4b08-9fd8-a58b390db96d` · `/recipes/soft-baked-blueberry-and-oat-bars`

| Field | Source value |
| --- | --- |
| Age range | 6 to 48 months |
| Time | 25 minutes |
| Servings | 16 |
| Allergens | none listed |
| Diet tags | vegetarian, dairy-free, nut-free, soy-free |

**Ingredients**: 1.5 cups rolled oats · 2 medium ripe bananas, mashed · 1/2 cup blueberries (fresh or frozen) · 2 tbsp coconut oil, melted · 1/2 tsp vanilla extract

**Steps**: 9 steps. Blend 1 cup of the oats, mix with banana, coconut oil and vanilla, bake at 350°F (175°C) for 12 to 15 minutes, cool, cut into 16 bars. Step 9: "SAFETY NOTE: For younger babies (6-9mo), smash the blueberries before baking to reduce choking risk."

**Storage**: room temperature 2 days; fridge 5 days; freeze 3 months.

**Audit notes**
- **"No allergens" needs a deliberate decision.** Oats can carry gluten from shared processing; the recipe isn't tagged gluten-free, which is consistent. Coconut isn't a top-9 US allergen, but some families with tree-nut allergies avoid it. Decide whether to mention either.
- **Whole blueberries** are a choking risk for young children. The recipe says to smash them only for 6 to 9 months, but the age range runs to 48 months. The image also shows whole berries.
- No added sugar.

| Check | OK? |
| --- | --- |
| Ingredients and amounts are correct and complete | ☐ |
| Steps are safe and in the right order | ☐ |
| "No allergens listed" is right (oats, coconut) | ☐ |
| Texture and size suit the stated age (blueberries) | ☐ |
| Time and servings are right | ☐ |
| Storage guidance is right | ☐ |
| Image is acceptable | ☐ |

**Draft alt text**: "A stack of three soft oat bars studded with blueberries on a white plate, with loose blueberries and oats around it."

---

## Slot 3: Salmon & Pea Fish Cakes

`a61d93da-4d19-4219-a131-bca2468ace88` · `/recipes/salmon-and-pea-fish-cakes`

| Field | Source value |
| --- | --- |
| Age range | 9 to 60 months |
| Time | 35 minutes |
| Servings | 8 |
| Allergens | fish, wheat |
| Diet tags | nut-free, dairy-free, soy-free |

**Ingredients**: 8 oz fresh salmon fillet, boneless · 2 medium potatoes, peeled and cubed · 1/4 cup frozen peas, thawed · 1 tsp lemon juice · 2 tbsp flour (for dusting)

**Steps**: 9 steps. Boil and mash the potatoes, cook the salmon until it flakes, check for bones, shape 8 patties, dust with flour, pan-fry 3 to 4 minutes a side, cool, cut into strips for younger babies. Step 9: "SAFETY REMINDER: Double check for bones even in 'boneless' fillets."

**Storage**: fridge up to 2 days; freeze cooked patties up to 1 month.

**Audit notes**
- The allergens (fish, wheat from the flour) match the ingredients. The frying oil type isn't specified. If sesame or peanut oil were used, the allergens would change.
- Whole peas are round. The tip says to smash them for children still learning to chew.
- Bone checks appear twice (steps 3 and 9).

| Check | OK? |
| --- | --- |
| Ingredients and amounts are correct and complete | ☐ |
| Steps are safe (salmon cooked through, bones removed, cooling) | ☐ |
| Allergens are complete: fish, wheat | ☐ |
| Texture and size suit the stated age (peas, strips) | ☐ |
| Time and servings are right | ☐ |
| Storage guidance is right | ☐ |
| Image is acceptable | ☐ |

**Draft alt text**: "Two golden salmon fish cakes on a blue plate with green peas, sliced carrots, lemon wedges and parsley."

---

## Also needed from the owner

- **Image rights (M5-03)**: confirm your Replicate and FLUX Pro terms allow commercial use of these images.
- **Disclosure (M5-02)**: decide whether the site says the recipes are AI-assisted and the images illustrative.
- **Reviewer record**: the name to record as reviewer, and whether an outside reviewer (for example a paediatric dietitian) should check before a paid launch.
