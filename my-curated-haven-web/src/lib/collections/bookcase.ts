import type { CollectionRecipe, SeriesKey, ShelfKey, ShowroomCollection } from "@/lib/collections/types";

/**
 * The bookcase (/collections): which books stand on the shelf for the age a
 * parent is cooking for, and which match the filter chips. Pure functions, so
 * the server can work out every book's matches once and the page can filter
 * without a round trip.
 */

export const STAGE_OPTIONS = [
  { key: "all", label: "All ages", min: 0, max: 999 },
  { key: "6-12m", label: "6–12 m", min: 6, max: 12 },
  { key: "1-2y", label: "1–2 y", min: 12, max: 24 },
  { key: "2-4y", label: "2–4 y", min: 24, max: 48 },
] as const;

export type StageKey = (typeof STAGE_OPTIONS)[number]["key"];

export function isStageKey(value: string | null | undefined): value is StageKey {
  return STAGE_OPTIONS.some((option) => option.key === value);
}

/** A book fits an age when its range overlaps it. All-stage books fit every age. */
export function fitsStage(stage: ShowroomCollection["stage"], key: StageKey): boolean {
  if (key === "all" || stage.min === null) return true;
  const band = STAGE_OPTIONS.find((option) => option.key === key);
  if (!band) return true;
  return stage.min < band.max && (stage.max === null || stage.max > band.min);
}

/**
 * The filter chips. "most": at least half the book's recipes have the tag (a
 * breakfast book may hold one snack). "all": every recipe qualifies, because a
 * parent avoiding egg needs the whole book egg-free.
 */
export const FILTERS = [
  { key: "breakfast", label: "Breakfast", rule: "most", test: (r: CollectionRecipe) => has(r.tags?.meal, "breakfast") },
  { key: "snacks", label: "Snacks", rule: "most", test: (r: CollectionRecipe) => has(r.tags?.meal, "snack") || has(r.tags?.meal, "treat") },
  { key: "freezes", label: "Freezes", rule: "most", test: (r: CollectionRecipe) => r.freezes !== null },
  { key: "iron", label: "Iron", rule: "most", test: (r: CollectionRecipe) => has(r.tags?.goal, "iron") },
  { key: "protein", label: "Protein", rule: "most", test: (r: CollectionRecipe) => has(r.tags?.goal, "protein") },
  { key: "egg-free", label: "Egg-free", rule: "all", test: (r: CollectionRecipe) => has(r.tags?.freeFrom, "egg-free") },
  { key: "dairy-free", label: "Dairy-free", rule: "all", test: (r: CollectionRecipe) => has(r.tags?.freeFrom, "dairy-free") },
  { key: "nut-free", label: "Nut-free", rule: "all", test: (r: CollectionRecipe) => has(r.tags?.freeFrom, "nut-free") },
] as const;

export type FilterKey = (typeof FILTERS)[number]["key"];

function has(values: readonly string[] | undefined, value: string): boolean {
  return values?.includes(value) ?? false;
}

/** The filters a book matches, from its recipes. An empty book matches none. */
export function collectionMatches(recipes: readonly CollectionRecipe[]): FilterKey[] {
  if (recipes.length === 0) return [];
  return FILTERS.filter((filter) => {
    const hits = recipes.filter(filter.test).length;
    return filter.rule === "all" ? hits === recipes.length : hits * 2 >= recipes.length;
  }).map((filter) => filter.key);
}

/** What the bookcase needs about one book: serialisable for the client component. */
export interface BookcaseEntry {
  slug: string;
  title: string;
  tagline: string;
  cloth: ShowroomCollection["cloth"];
  cover: ShowroomCollection["cover"];
  stage: ShowroomCollection["stage"];
  shelf: ShelfKey;
  series: { key: SeriesKey; volume: number } | null;
  open: boolean;
  price: string;
  recipeCount: number;
  matches: FilterKey[];
  /** The first recipes, shown on the inside page when the book opens. */
  contents: string[];
}

/** Lines on the inside page of an opening book. */
export const CONTENTS_LINES = 6;

export function toBookcaseEntry(collection: ShowroomCollection, price: string): BookcaseEntry {
  return {
    slug: collection.slug,
    title: collection.title,
    tagline: collection.tagline,
    cloth: collection.cloth,
    cover: collection.cover,
    stage: collection.stage,
    shelf: collection.shelf,
    series: collection.series ?? null,
    open: collection.availability === "open",
    price,
    recipeCount: collection.recipes.length,
    matches: collectionMatches(collection.recipes),
    contents: collection.availability === "open" ? collection.recipes.slice(0, CONTENTS_LINES).map((recipe) => recipe.title) : [],
  };
}

/** Books that pass the age and every active filter (filters combine with AND). */
export function matchingBooks(entries: readonly BookcaseEntry[], stage: StageKey, filters: readonly FilterKey[]): BookcaseEntry[] {
  return entries.filter((entry) => fitsStage(entry.stage, stage) && filters.every((filter) => entry.matches.includes(filter)));
}

/** "6–12 months", "1–2 years", "1 year and up", "All ages". */
export function stageLabel(stage: ShowroomCollection["stage"]): string {
  if (stage.min === null) return "All ages";
  const unit = (months: number) => (months < 24 && months % 12 !== 0 ? `${months}` : `${months / 12}`);
  if (stage.max === null) return stage.min % 12 === 0 ? `${stage.min / 12} year${stage.min === 12 ? "" : "s"} and up` : `${stage.min} months and up`;
  if (stage.max <= 12) return `${stage.min}–${stage.max} months`;
  return `${unit(stage.min)}–${unit(stage.max)} years`;
}

/** The seasonal book to feature this month (Western calendar), if it is open. */
export function featuredSlug(date: Date): string | null {
  const month = date.getMonth();
  if (month === 8 || month === 9) return "halloween";
  if (month === 10) return "thanksgiving-table";
  if (month === 11) return "holiday-baking";
  return null;
}
