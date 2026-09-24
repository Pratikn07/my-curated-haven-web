import type { RecipeBody } from "@/lib/data/recipes";

export type AllergenDisplay =
  | { kind: "reviewed_listed"; allergens: string[] }
  | { kind: "reviewed_no_allergens"; message: string }
  | { kind: "unknown"; message: string };

/** Keep public allergen copy tied to the explicit editorial review state. */
export function getAllergenDisplay(
  reviewState: RecipeBody["allergenReviewState"],
  allergens: string[] | null
): AllergenDisplay {
  if (reviewState === "reviewed_listed" && allergens?.length) {
    return { kind: "reviewed_listed", allergens };
  }

  if (reviewState === "reviewed_no_allergens") {
    return {
      kind: "reviewed_no_allergens",
      message:
        "Reviewed: No allergens were listed for this recipe. Please check all ingredient packaging carefully.",
    };
  }

  return {
    kind: "unknown",
    message:
      "Allergen information has not been formally reviewed for this recipe. Please check all ingredient packaging carefully.",
  };
}
