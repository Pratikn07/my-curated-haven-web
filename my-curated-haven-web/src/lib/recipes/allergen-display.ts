import type { RecipeBody } from "@/lib/data/recipes";

export type AllergenDisplay =
  | { kind: "reviewed_listed"; allergens: string[] }
  | { kind: "reviewed_no_allergens"; message: string }
  | { kind: "unknown"; allergens: string[]; message: string };

const CHECK_LABELS =
  "Check every ingredient label, especially if your child has an allergy.";

/**
 * Keep public allergen copy tied to the explicit editorial review state.
 * Unreviewed recipes still show the allergens their source lists: hiding them
 * would be less safe than labelling them honestly as not yet reviewed.
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
        ? `An editor hasn't checked this allergen information yet. ${CHECK_LABELS}`
        : `No allergens are listed for this recipe, but it hasn't been reviewed yet. ${CHECK_LABELS}`,
  };
}
