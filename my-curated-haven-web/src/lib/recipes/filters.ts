// "Finger Foods" is a feeding type in the source data, not a meal, so it never matched (Phase 6 audit R6-02).
export const AVAILABLE_MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"];
export const AVAILABLE_DIETS = [
  "Vegetarian",
  "Dairy-Free",
  "Nut-Free",
  "Gluten-Free",
  "Soy-Free",
];
export const TIME_OPTIONS = [
  { label: "Under 15 min", value: 15 },
  { label: "Under 30 min", value: 30 },
  { label: "Under 45 min", value: 45 },
];

export interface RecipeFilterState {
  q: string;
  meals: string[];
  diets: string[];
  maxTime: number | null;
}

export function parseFilterParams(
  searchParams: URLSearchParams | { get: (k: string) => string | null; getAll: (k: string) => string[] }
): RecipeFilterState {
  const rawQ = searchParams.get("q") ?? "";
  const q = rawQ.trim().slice(0, 120);

  // Can be repeated (?meal=Breakfast&meal=Snack) or comma-separated
  const rawMeals = searchParams.getAll("meal").flatMap((m) => m.split(","));
  const meals = Array.from(
    new Set(
      rawMeals
        .map((m) => m.trim())
        .filter((m) => AVAILABLE_MEALS.some((v) => v.toLowerCase() === m.toLowerCase()))
    )
  );

  const rawDiets = searchParams.getAll("diet").flatMap((d) => d.split(","));
  const diets = Array.from(
    new Set(
      rawDiets
        .map((d) => d.trim())
        .filter((d) => AVAILABLE_DIETS.some((v) => v.toLowerCase() === d.toLowerCase()))
    )
  );

  const rawMaxTime = searchParams.get("maxTime");
  const parsedTime = rawMaxTime ? parseInt(rawMaxTime, 10) : null;
  const maxTime = parsedTime && !isNaN(parsedTime) && parsedTime > 0 ? parsedTime : null;

  return { q, meals, diets, maxTime };
}
