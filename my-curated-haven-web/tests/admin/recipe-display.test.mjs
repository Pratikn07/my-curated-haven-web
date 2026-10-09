import assert from "node:assert/strict";
import test from "node:test";
import { toRecipeDisplay } from "../../src/lib/admin/recipe-display.ts";

const snapshot = {
  recipeId: "recipe", slug: "soup",
  catalog: { title: "Soup", publicSummary: "Warm", totalMinutes: 20, mealLabels: [], dietLabels: [] },
  body: {
    ingredients: [{ amount: "1", unit: "cup", item: "lentils" }, "water"],
    instructions: [{ step: 1, text: "Rinse" }, "Simmer"], yield: "2 bowls",
    yieldStructured: null, reviewedNotes: null, allergenReviewState: "reviewed_no_allergens",
    allergens: [], storageNotes: null,
  },
  image: { path: "", alt: null, description: null, objectId: null, objectVersion: null },
};

test("supported saved body renders ingredient and step meaning in order", () => {
  assert.deepEqual(toRecipeDisplay(snapshot), {
    ok: true,
    ingredients: [{ text: "1 cup lentils" }, { text: "water" }],
    steps: [{ step: 1, text: "Rinse" }, { step: 2, text: "Simmer" }],
  });
});

test("unsupported legacy ingredient and step data are named rather than stringified", () => {
  const badIngredient = structuredClone(snapshot);
  badIngredient.body.ingredients = [{ item: "lentils", preparation: { soak: true } }];
  assert.deepEqual(toRecipeDisplay(badIngredient), { ok: false, reason: "Ingredient 1 has unsupported saved fields." });
  const badStep = structuredClone(snapshot);
  badStep.body.instructions = [{ step: 1, text: { rich: "Rinse" } }];
  assert.deepEqual(toRecipeDisplay(badStep), { ok: false, reason: "Step 1 cannot be safely previewed." });
});

test("missing body has an explicit unavailable preview", () => {
  assert.deepEqual(toRecipeDisplay({ ...snapshot, body: null }), { ok: false, reason: "Recipe body is incomplete." });
});
