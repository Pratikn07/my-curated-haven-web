import { expect, test } from "@playwright/test";
import { getAllergenDisplay } from "../../src/lib/recipes/allergen-display";

test("allergen display follows the explicit review state", () => {
  expect(getAllergenDisplay("unknown", [])).toEqual({
    kind: "unknown",
    allergens: [],
    message:
      "No allergens are listed for this recipe, but it hasn't been reviewed yet. Check every ingredient label, especially if your child has an allergy.",
  });

  expect(getAllergenDisplay("reviewed_no_allergens", [])).toEqual({
    kind: "reviewed_no_allergens",
    message:
      "Reviewed: No allergens were listed for this recipe. Please check all ingredient packaging carefully.",
  });

  expect(getAllergenDisplay("reviewed_listed", ["milk", "eggs"])).toEqual({
    kind: "reviewed_listed",
    allergens: ["milk", "eggs"],
  });

  expect(getAllergenDisplay("reviewed_listed", []).kind).toBe("unknown");
});

// Phase 5 audit R5-02: an unreviewed recipe must keep showing the allergens its
// source lists. Hiding "fish, wheat" would be less safe than saying "not yet reviewed".
test("unreviewed allergens stay visible and are labelled as not reviewed", () => {
  const display = getAllergenDisplay("unknown", ["fish", "wheat"]);
  expect(display).toEqual({
    kind: "unknown",
    allergens: ["fish", "wheat"],
    message:
      "An editor hasn't checked this allergen information yet. Check every ingredient label, especially if your child has an allergy.",
  });
  expect(getAllergenDisplay("unknown", null)).toMatchObject({ kind: "unknown", allergens: [] });
});
