import type { RecipeIngredient } from "@/lib/data/recipes";

/** Shared by the recipe page and the Instagram landing pages, so both show a recipe the same way. */
export function normalizeInstructions(rawInstructions: unknown): { step: number; text: string }[] {
  if (!Array.isArray(rawInstructions)) return [];
  return rawInstructions.map((item, index) => {
    if (typeof item === "string") {
      return { step: index + 1, text: item };
    }
    if (typeof item === "object" && item !== null && "text" in item) {
      const typed = item as { step?: unknown; text?: unknown };
      return {
        step: typeof typed.step === "number" ? typed.step : index + 1,
        text: String(typed.text),
      };
    }
    return { step: index + 1, text: String(item) };
  });
}

export function formatIngredient(ingredient: RecipeIngredient | string): string {
  if (typeof ingredient === "string") return ingredient;
  const parts: string[] = [];
  if (ingredient.amount) parts.push(ingredient.amount);
  if (ingredient.unit) parts.push(ingredient.unit);
  if (ingredient.item) parts.push(ingredient.item);
  return parts.join(" ");
}

/** next/image needs a root-relative or absolute address; anything else renders without a photo. */
export function usableImageSrc(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  return /^https?:\/\//.test(trimmed) || trimmed.startsWith("/") ? trimmed : null;
}
