/**
 * The shape of a book's make-ahead plan. Two halves:
 * - the preview, public and kept in config (src/config/halloween.ts): title, lede, menu names, day headings;
 * - the paid content, kept only in the database (public.collection_extras, read under RLS like a paid recipe
 *   body) and never committed: the tasks, the shopping list and the make-ahead tiers.
 * The page joins them for buyers (src/lib/collections/make-ahead.ts).
 */

/** Where a dish waits until it is eaten. Each has its own pill colour (--plan-freezer and friends). */
export type PlanWhen = "freezer" | "fridge" | "fresh";

/** A line of a task: plain words, with recipe names that link to the recipe's page. */
export type PlanText = readonly (string | { slug: string; text: string })[];

export interface PlanDayHeading {
  /** "Thu", "29", "Oct". */
  dow: string;
  dom: string;
  mon: string;
  heading: string;
  /** Hands-on time, "About 45 min". */
  time: string;
  pill: PlanWhen;
}

/** What anyone can see. */
export interface MakeAheadPlanPreview {
  byline: string;
  title: string;
  lede: string;
  menuHeading: string;
  /** Catalog slugs of the book's recipes; each main photo is /images/recipes/<slug>-1040.webp. */
  menu: readonly { slug: string; name: string }[];
  daysHeading: string;
  days: readonly PlanDayHeading[];
}

export interface PlanTask {
  when: string;
  steps: readonly PlanText[];
  toddler?: string;
  safety?: string;
}

export interface ShoppingItem {
  /** Stable key for the tick box remembered on this device, made from the item's words. */
  id: string;
  item: string;
  /** Empty when the item needs no amount. */
  amount: string;
  /** The recipes it is for. */
  forWhat: string;
}

export interface ShoppingAisle {
  aisle: string;
  items: readonly ShoppingItem[];
}

export interface PlanTier {
  pill: PlanWhen;
  title: string;
  list: string;
  also: string;
}

/** The paid half, as stored in public.collection_extras (kind "make_ahead_plan") once parsed. */
export interface MakeAheadPlanContent {
  menuSub: string;
  /** One entry per preview dish, by slug: when it is made. */
  menu: readonly { slug: string; when: PlanWhen; label: string }[];
  freeOf: string;
  daysSub: string;
  /** One entry per preview day, in the same order. */
  days: readonly { dom: string; tasks: readonly PlanTask[] }[];
  shopping: {
    heading: string;
    sub: string;
    /** First line of the copied list. */
    copyTitle: string;
    aisles: readonly ShoppingAisle[];
  };
  tiers: {
    heading: string;
    sub: string;
    items: readonly PlanTier[];
  };
}

/** The whole plan a buyer reads: the preview with the paid half joined in. */
export interface MakeAheadPlan extends Omit<MakeAheadPlanPreview, "menu" | "days">, Omit<MakeAheadPlanContent, "menu" | "days"> {
  menu: readonly { slug: string; name: string; when: PlanWhen; label: string }[];
  days: readonly (PlanDayHeading & { tasks: readonly PlanTask[] })[];
}
