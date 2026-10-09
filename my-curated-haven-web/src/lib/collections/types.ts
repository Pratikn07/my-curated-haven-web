/**
 * A collection as the showroom presents it: the book's cloth and cover, the
 * words, and the recipes inside. Commerce (the real price, checkout and
 * ownership) stays in the commerce database; a live offer replaces the
 * placeholder price whenever one exists for the same slug.
 */

/** Each book's cloth. Values live in collections.css, never here. */
export type ClothName =
  | "ember"
  | "forest"
  | "plum"
  | "terracotta"
  | "sage"
  | "slate"
  | "walnut"
  | "navy"
  | "rose"
  | "ochre"
  | "berry"
  | "clay"
  | "sky"
  | "rust"
  | "crimson"
  | "teal";

/** Rows of the bookcase (docs/implementation/recipe-collections/COLLECTIONS.md, "Shelves"). */
export type ShelfKey = "mornings" | "everyday-meals" | "cook-once" | "nourish" | "snacks-and-treats" | "seasons-and-parties";

/** Numbered volumes that follow a child as they grow. */
export type SeriesKey = "breakfast" | "meal-prep";

/** A recipe's filter tags (recipe-tags.json). Free-from labels match its allergen list. */
export interface RecipeTags {
  stage: readonly string[];
  meal: readonly string[];
  goal: readonly string[];
  practical: readonly string[];
  freeFrom: readonly string[];
}

export interface CollectionRecipe {
  slug: string;
  title: string;
  /** Total minutes, or null when the catalog has no time. */
  minutes: number | null;
  /** Absolute image URL (Supabase Storage) or a site path. */
  image: string;
  /** Plain-language allergen names, as written on the recipe page. */
  allergens: readonly string[];
  /** "2 months" when the recipe's storage note says it freezes; null otherwise. */
  freezes: string | null;
  /** The protein a recipe is built around, named in its title. Protein Packs only. */
  protein?: string;
  /** Only published recipes have a page to open. */
  href?: string;
  /** Filter tags; absent for recipes that come only from the commerce database. */
  tags?: RecipeTags;
}

/** One recipe in the catalog snapshot (src/config/recipe-snapshot.ts). */
export type RecipeSnapshot = Omit<CollectionRecipe, "slug" | "href" | "tags"> & { tags: RecipeTags };

export interface ShowroomCollection {
  slug: string;
  /** Drafts render everywhere but production, like draft campaigns. */
  status: "draft" | "published";
  /**
   * "open": has its own page (with "Opening soon" until an offer exists). Chosen per collection; no recipe-count rule.
   * "coming-soon": still collecting recipes; it stands on the shelf greyed out, with no page.
   */
  availability: "open" | "coming-soon";
  /** Also a chapter of the first showroom at /collections/test. */
  inShowroom?: boolean;
  shelf: ShelfKey;
  /** Ages in months it is written for; null min and max means every stage, null max means "and older". */
  stage: { min: number | null; max: number | null };
  series?: { key: SeriesKey; volume: number };
  title: string;
  /** One line, set in italic under the title. */
  tagline: string;
  /** Two or three sentences on why these recipes belong together. */
  story: string;
  /** Who it helps, in the parent's words. */
  forWhen: string;
  cloth: ClothName;
  /** Trimmed, transparent cover art; the title is set in HTML over its lower third. */
  cover: { src: string; width: number; height: number; alt: string } | null;
  /** What "refreshed over time" means for this book. Owner approval pending (plan RC-05). */
  refresh: string;
  /**
   * Shown until a live offer exists. PLACEHOLDER prices (owner approved
   * placeholders on 2026-10-04); replace with the approved price (plan RC-01).
   */
  placeholderPrice: string;
  recipes: readonly CollectionRecipe[];
}
