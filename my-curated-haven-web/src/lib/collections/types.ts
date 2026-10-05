/**
 * A collection as the showroom presents it: the book's cloth and cover, the
 * words, and the recipes inside. Commerce (the real price, checkout and
 * ownership) stays in the commerce database; a live offer replaces the
 * placeholder price whenever one exists for the same slug.
 */

/** Each book's cloth. Values live in collections.css, never here. */
export type ClothName = "ember" | "forest" | "plum" | "terracotta";

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
}

export interface ShowroomCollection {
  slug: string;
  /** Drafts render everywhere but production, like draft campaigns. */
  status: "draft" | "published";
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
