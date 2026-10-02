import type { RecipeBody } from "@/lib/data/recipes";

export type AllergenDisplay =
  | { kind: "reviewed_listed"; allergens: string[] }
  | { kind: "reviewed_no_allergens"; message: string }
  | { kind: "unknown"; allergens: string[]; message: string | null };

/**
 * Preserve the explicit review state and source-listed allergens without
 * displaying the editorial review notice to recipe readers.
 */
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

  const listed = allergens ?? [];
  return {
    kind: "unknown",
    allergens: listed,
    message:
      listed.length > 0
        ? null
        : "No allergens are listed for this recipe.",
  };
}
