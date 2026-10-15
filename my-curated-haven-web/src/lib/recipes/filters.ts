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

/** A filter label as analytics names it: "Dairy-Free" is "dairy-free", "Under 15 min" is "under-15-min". */
export function filterValueSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Every value recipe_filter_value_applied may carry, by kind. Built from the fixed lists above, never from the URL. */
export const RECIPE_FILTER_VALUE_SLUGS = {
  meal: AVAILABLE_MEALS.map(filterValueSlug),
  diet: AVAILABLE_DIETS.map(filterValueSlug),
  time: TIME_OPTIONS.map((option) => filterValueSlug(option.label)),
} as const;

/**
 * The applied filters as analytics values, one per value. A value is kept only when it is on the fixed lists
 * (matched without case); anything else typed into the address is left out.
 */
export function recipeFilterAnalyticsValues(
  state: Pick<RecipeFilterState, "meals" | "diets" | "maxTime">
): { kind: "meal" | "diet" | "time"; value: string }[] {
  const values: { kind: "meal" | "diet" | "time"; value: string }[] = [];
  const add = (kind: "meal" | "diet" | "time", label: string | undefined) => {
    const value = label ? filterValueSlug(label) : null;
    if (value && !values.some((entry) => entry.kind === kind && entry.value === value)) values.push({ kind, value });
  };
  const pick = (list: string[], raw: string) => list.find((label) => label.toLowerCase() === raw.trim().toLowerCase());
  state.meals.forEach((raw) => add("meal", pick(AVAILABLE_MEALS, raw)));
  state.diets.forEach((raw) => add("diet", pick(AVAILABLE_DIETS, raw)));
  add("time", TIME_OPTIONS.find((option) => option.value === state.maxTime)?.label);
  return values;
}
