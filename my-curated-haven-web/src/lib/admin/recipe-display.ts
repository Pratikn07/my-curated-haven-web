import type { RecipeSnapshot } from "./contracts";

type DisplayResult =
  | { ok: true; ingredients: { text: string }[]; steps: { step: number; text: string }[] }
  | { ok: false; reason: string };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toRecipeDisplay(snapshot: RecipeSnapshot): DisplayResult {
  const body = snapshot.body;
  if (!body) return { ok: false, reason: "Recipe body is incomplete." };
  if (!Array.isArray(body.ingredients)) return { ok: false, reason: "Ingredients cannot be safely previewed." };
  if (!Array.isArray(body.instructions)) return { ok: false, reason: "Instructions cannot be safely previewed." };

  const ingredients: { text: string }[] = [];
  for (const [index, ingredient] of body.ingredients.entries()) {
    if (typeof ingredient === "string" && ingredient.trim()) {
      ingredients.push({ text: ingredient });
      continue;
    }
    if (!record(ingredient) || Object.keys(ingredient).some((key) => !["amount", "unit", "item"].includes(key))) {
      return { ok: false, reason: `Ingredient ${index + 1} has unsupported saved fields.` };
    }
    const { amount, unit, item } = ingredient;
    if (typeof item !== "string" || !item.trim() ||
      (amount !== undefined && typeof amount !== "string") ||
      (unit !== undefined && typeof unit !== "string")) {
      return { ok: false, reason: `Ingredient ${index + 1} cannot be safely previewed.` };
    }
    ingredients.push({ text: [amount, unit, item].filter(Boolean).join(" ") });
  }

  const steps: { step: number; text: string }[] = [];
  for (const [index, instruction] of body.instructions.entries()) {
    if (typeof instruction === "string" && instruction.trim()) {
      steps.push({ step: index + 1, text: instruction });
      continue;
    }
    if (!record(instruction) || Object.keys(instruction).some((key) => !["step", "text"].includes(key)) ||
      typeof instruction.text !== "string" || !instruction.text.trim() ||
      (instruction.step !== undefined && (!Number.isInteger(instruction.step) || Number(instruction.step) < 1))) {
      return { ok: false, reason: `Step ${index + 1} cannot be safely previewed.` };
    }
    steps.push({ step: typeof instruction.step === "number" ? instruction.step : index + 1, text: instruction.text });
  }
  return { ok: true, ingredients, steps };
}
