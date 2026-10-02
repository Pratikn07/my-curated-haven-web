# Free recipe review checklist

[Phase 5 overview](README.md) · [Audit backlog](../../audit/AUDIT-BACKLOG.md#phase-5-recipe-structure-and-editorial-review)

Prepared by the 2026-09-25 audit for the owner's editorial review (backlog R5-03). **Owner approval recorded 2026-10-02:** the owner approved the three free recipes and their content checklist, including the requested safety, accuracy, summary and draft image-description review. This is owner sign-off, not an outside expert review or approval of paid drafts.

The owner also approved replacing all three images: flattened blueberries, flattened peas, and frittata strips. **Image replacement and final matching image descriptions remain pending implementation and verification.** The current images are not approved as the final result.

## Why this review is needed

All 70 recipes were originally written by an LLM from `scripts/RECIPE_PROMPT.md` in the iOS repo (`Pratikn07/parenting-app`) and imported without human review. Their images are AI-generated (FLUX Pro via Replicate). The owner has now approved these three free recipes. PR #73 removed the public editorial allergen-review notice while preserving listed allergens; this documentation update does not change database review states.

Content below started as the production snapshot from 2026-09-25 and incorporates the free-recipe corrections recorded as applied on 2026-09-26 in `20260926144356_phase5_ai_review_fix_live_free_recipes.sql`. This is not a fresh production database inspection. "Audit notes" record the review history and outstanding image changes, not medical or nutrition advice.

## Approval record and remaining implementation

Reviewer: project owner, approval supplied in chat on 2026-10-02. Checked boxes below record that owner approval; they do not claim an independent test or clinical review.

The assistant still needs to prepare, inspect and publish the replacement images and matching descriptions (R5-10, R5-04). The existing database publishing gate continues to apply; its review-state fields were not changed by this documentation update.

---

## Slot 1: Sweet Potato & Spinach Frittata Fingers

`0003c4cc-b2cb-4e49-97c8-f4febfed39f9` · `/recipes/sweet-potato-and-spinach-frittata-fingers`

| Field | Source value |
| --- | --- |
| Age range | 6 to 24 months |
| Time | 40 minutes |
| Servings | 8 |
| Allergens | eggs, milk |
| Diet tags | vegetarian, nut-free, gluten-free, soy-free |

**Ingredients**: 6 large eggs · 1/2 cup sweet potato, cooked and mashed · 1/2 cup fresh spinach, finely chopped · 2 tbsp milk (dairy or breastmilk) · 1/4 cup mild cheddar cheese, shredded

**Steps**: 8 steps. Bake at 350°F (175°C) in an 8×8 inch dish for 18 to 22 minutes, cool 15 minutes, cut into 1 × 3 inch strips. Step 8: "SAFETY CHECK: Ensure the spinach is chopped very finely to prevent gagging."

**Storage**: fridge up to 3 days; freeze up to 2 months.

**Current summary**: "Soft-baked egg and spinach frittata, cooled and cut into strips your child can hold."

**Audit notes**
- **Image replacement approved, pending implementation.** The old image shows round fritters on a toddler plate next to pasta, cherry tomatoes and orange slices. The replacement must show the rectangular frittata strips the recipe makes.
- **Time corrected** from 30 to 40 minutes by the 2026-09-26 migration.
- The allergens (eggs, milk) match the ingredients. The cheddar and milk are dairy.
- The owner approval includes the stated age range; no outside expert review is claimed.

| Check | OK? |
| --- | --- |
| Ingredients and amounts are correct and complete | ☑ owner approved |
| Steps are safe and in the right order (temperature, doneness, cooling) | ☑ owner approved |
| Allergens are complete: eggs, milk | ☑ owner approved |
| Texture and size suit the stated age (choking and gagging) | ☑ owner approved |
| Time and servings are right, or give corrected values | ☑ owner approved |
| Storage guidance is right | ☑ owner approved |
| Image matches the recipe | Replacement approved; implementation pending |

**Historical draft alt text** (describes the image being replaced): "Round golden egg fritters flecked with spinach and sweet potato on a teal divided toddler plate, with orange pieces and a fork beside it." Write the final description after inspecting the replacement; do not use this description for frittata strips.

---

## Slot 2: Soft-Baked Blueberry & Oat Bars

`50663aaa-7e47-4b08-9fd8-a58b390db96d` · `/recipes/soft-baked-blueberry-and-oat-bars`

| Field | Source value |
| --- | --- |
| Age range | 6 to 48 months |
| Time | 40 minutes |
| Servings | 16 |
| Allergens | none listed |
| Diet tags | vegetarian, dairy-free, nut-free, soy-free |

**Ingredients**: 1.5 cups rolled oats · 2 medium ripe bananas, mashed · 1/2 cup blueberries (fresh, or frozen and thawed), flattened or quartered lengthwise · 2 tbsp coconut oil, melted · 1/2 tsp vanilla extract

**Steps**: 9 steps. Blend 1 cup of the oats, mix with banana, coconut oil and vanilla, fold in flattened or quartered blueberries, bake at 350°F (175°C) for 12 to 15 minutes, cool completely, cut into 16 small squares or bars. Step 9: "SAFETY NOTE: Whole blueberries are a choking risk for young children. Always flatten or quarter them before baking, and check each bar is soft before serving."

**Storage**: refrigerate within 2 hours of baking and use within 3 to 4 days, or freeze for up to 2 months.

**Current summary**: "Soft oat bars sweetened with banana and blueberries. Check they are soft enough for your child and cut them to a size your child can manage."

**Audit notes**
- The owner approved the "none listed" ingredient checklist. The recipe is not tagged gluten-free. The owner removed the separate public allergy-wording task; this does not claim suitability for every child's allergy needs.
- **Whole-blueberry guidance corrected** for all ages by the 2026-09-26 migration. Image replacement showing flattened berries is approved but not yet implemented.
- No added sugar.

| Check | OK? |
| --- | --- |
| Ingredients and amounts are correct and complete | ☑ owner approved |
| Steps are safe and in the right order | ☑ owner approved |
| "No allergens listed" is right (oats, coconut) | ☑ owner approved |
| Texture and size suit the stated age (blueberries) | ☑ owner approved |
| Time and servings are right | ☑ owner approved |
| Storage guidance is right | ☑ owner approved |
| Image matches the corrected recipe | Replacement approved; implementation pending |

**Historical draft alt text**: "A stack of three soft oat bars studded with blueberries on a white plate, with loose blueberries and oats around it." Final wording must describe the inspected replacement image and its flattened berries.

---

## Slot 3: Salmon & Pea Fish Cakes

`a61d93da-4d19-4219-a131-bca2468ace88` · `/recipes/salmon-and-pea-fish-cakes`

| Field | Source value |
| --- | --- |
| Age range | 9 to 60 months |
| Time | 45 minutes |
| Servings | 8 |
| Allergens | fish, wheat |
| Diet tags | nut-free, dairy-free, soy-free |

**Ingredients**: 8 oz fresh salmon fillet, boneless · 2 medium potatoes, peeled and cubed · 1/4 cup frozen peas, cooked until very soft · 1 tsp lemon juice · 2 tbsp wheat flour (for dusting)

**Steps**: 9 steps. Boil and mash the potatoes; cook salmon to 145°F (63°C) in the thickest part; remove skin and check for bones. Flatten every cooked pea with a fork before mixing, shape 8 patties, dust with wheat flour, pan-fry 3 to 4 minutes a side, cool, cut into soft strips for younger babies. Step 9: "SAFETY REMINDER: Double check for bones even in 'boneless' fillets."

**Storage**: fridge up to 2 days; freeze cooked patties up to 1 month.

**Current summary**: "Soft salmon and pea fish cakes, cooked through and served in pieces your child can manage."

**Audit notes**
- The allergens (fish, wheat from the flour) match the ingredients. The frying oil type isn't specified. If sesame or peanut oil were used, the allergens would change.
- Peas must be cooked very soft and each flattened before mixing, as corrected on 2026-09-26. The image replacement showing flattened peas is approved but not yet implemented.
- Bone checks appear twice (steps 3 and 9).

| Check | OK? |
| --- | --- |
| Ingredients and amounts are correct and complete | ☑ owner approved |
| Steps are safe (salmon cooked through, bones removed, cooling) | ☑ owner approved |
| Allergens are complete: fish, wheat | ☑ owner approved |
| Texture and size suit the stated age (peas, strips) | ☑ owner approved |
| Time and servings are right | ☑ owner approved |
| Storage guidance is right | ☑ owner approved |
| Image matches the corrected recipe | Replacement approved; implementation pending |

**Historical draft alt text**: "Two golden salmon fish cakes on a blue plate with green peas, sliced carrots, lemon wedges and parsley." Final wording must describe the inspected replacement image and its flattened peas.

---

## Related owner decisions

- **Image rights (M5-03)**: owner confirmed commercial use is allowed on 2026-10-02; provider terms were not independently reviewed here.
- **Disclosure (M5-02) and allergy wording (R5-13)**: removed from active owner tasks at the owner's request on 2026-10-02. No AI-disclosure implementation is requested.
- **Reviewer record**: project owner, 2026-10-02. Paid-collection choices remain deferred; the four draft questions requiring human expertise (R5-12) are outside this free-recipe approval.
