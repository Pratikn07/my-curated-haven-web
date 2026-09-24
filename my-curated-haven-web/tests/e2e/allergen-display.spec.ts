import { expect, test } from "@playwright/test";
import { getAllergenDisplay } from "../../src/lib/recipes/allergen-display";

test("allergen display follows the explicit review state", () => {
  expect(getAllergenDisplay("unknown", [])).toEqual({
    kind: "unknown",
    message:
      "Allergen information has not been formally reviewed for this recipe. Please check all ingredient packaging carefully.",
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

  expect(getAllergenDisplay("unknown", ["milk"]).kind).toBe("unknown");
  expect(getAllergenDisplay("reviewed_listed", []).kind).toBe("unknown");
});
