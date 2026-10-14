import type { RecipeBody } from "@/lib/data/recipes";

export type AllergenDisplay =
  | { kind: "reviewed_listed"; allergens: string[] }
  | { kind: "reviewed_no_allergens"; message: string }
  | { kind: "unknown"; allergens: string[]; message: string | null };

/** Stored names read as words: the catalog says "tree_nuts" where the Halloween recipes say "tree nuts". */
export function allergenLabel(allergen: string): string {
  return allergen.replace(/_/g, " ");
}

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

/** The safety box's last line: "Contains: milk, wheat", or the same sentence the allergen card shows today. */
export type AllergenLine = { kind: "contains"; text: string } | { kind: "message"; text: string };

export function allergenLine(display: AllergenDisplay): AllergenLine {
  if (display.kind === "reviewed_listed" || (display.kind === "unknown" && display.allergens.length > 0)) {
    return { kind: "contains", text: display.allergens.map(allergenLabel).join(", ") };
  }
  return { kind: "message", text: display.message ?? "" };
}
