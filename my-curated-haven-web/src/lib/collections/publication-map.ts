import type { ClothName, CollectionRecipe, SeriesKey, ShelfKey, ShowroomCollection } from "./types";

/**
 * Pure mapping from a published database record to the storefront's collection shape. A database
 * record is used whole: its words, cover, order and members all come from the committed publication
 * and current recipe facts, never mixed with configured content. Only display hints that are not part
 * of the publication (showroom chapter flag, placeholder price) come from the configured entry.
 */

export type ProjectionRow = {
  collection_id: string; publication_id: string; release_id: string | null; slug: string; title: string;
  tagline: string; story: string; for_when: string; refresh: string; shelf: string; sort_order: number;
  stage_min: number | null; stage_max: number | null; series_key: string | null; series_volume: number | null;
  listing_state: "listed" | "unlisted" | "retired"; availability: "open" | "coming-soon"; cloth: string;
  cover: { src: string; width: number; height: number; alt: string } | null;
  members: { recipeId: string; slug: string; position: number }[];
};

export type RecipeFact = {
  id: string; slug: string; title: string; total_minutes: number | null; preview_image_path: string | null;
  publication_state: string; allergens: string[] | null; storage_notes: string | null;
};

/** "2 months" when a storage note says the recipe freezes for a stated time, else null. */
export function freezeNote(storage: string | null): string | null {
  const match = storage?.match(/freez[^.]*?(\d+\s*(?:months?|weeks?))/i);
  return match ? match[1] : null;
}

export function databaseShowroomCollection(row: ProjectionRow, facts: ReadonlyMap<string, RecipeFact>,
  hint: ShowroomCollection | null, imageSrc: (path: string | null) => string | null): ShowroomCollection {
  const recipes: CollectionRecipe[] = [...row.members].sort((a, b) => a.position - b.position).flatMap((member) => {
    const fact = facts.get(member.recipeId);
    if (!fact) return [];
    return [{
      slug: fact.slug, title: fact.title, minutes: fact.total_minutes, image: imageSrc(fact.preview_image_path) ?? "",
      allergens: fact.allergens ?? [], freezes: freezeNote(fact.storage_notes),
      ...(fact.publication_state === "published" ? { href: `/recipes/${fact.slug}` } : {}),
    }];
  });
  return {
    slug: row.slug,
    status: "published",
    availability: row.availability,
    inShowroom: hint?.inShowroom ?? false,
    shelf: row.shelf as ShelfKey,
    stage: { min: row.stage_min, max: row.stage_max },
    ...(row.series_key && row.series_volume ? { series: { key: row.series_key as SeriesKey, volume: row.series_volume } } : {}),
    title: row.title,
    tagline: row.tagline,
    story: row.story,
    forWhen: row.for_when,
    cloth: row.cloth as ClothName,
    cover: row.cover ? { src: row.cover.src, width: row.cover.width, height: row.cover.height, alt: row.cover.alt } : null,
    refresh: row.refresh,
    placeholderPrice: hint?.placeholderPrice ?? "",
    recipes,
  };
}
