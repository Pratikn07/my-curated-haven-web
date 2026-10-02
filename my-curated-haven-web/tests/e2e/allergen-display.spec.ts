import { expect, test } from "@playwright/test";
import { getAllergenDisplay } from "../../src/lib/recipes/allergen-display";

test("allergen display follows the explicit review state", () => {
  expect(getAllergenDisplay("unknown", [])).toEqual({
    kind: "unknown",
    allergens: [],
    message:
      "No allergens are listed for this recipe.",
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

test("source-listed allergens are preserved without the editorial review notice", () => {
  const display = getAllergenDisplay("unknown", ["fish", "wheat"]);
  expect(display).toEqual({
    kind: "unknown",
    allergens: ["fish", "wheat"],
    message: null,
  });
  expect(getAllergenDisplay("unknown", null)).toMatchObject({ kind: "unknown", allergens: [] });
});
