import { SHOWROOM_COLLECTIONS } from "@/config/collections";
import type { ShowroomCollection } from "@/lib/collections/types";

/**
 * Which collections this environment shows. No database access, so the site
 * shell can ask on every page.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

/** Published collections everywhere; drafts everywhere but production (same rule as campaigns). */
export function listShowroomCollections(): readonly ShowroomCollection[] {
  return SHOWROOM_COLLECTIONS.filter((collection) => collection.status === "published" || !isProduction());
}

export function getShowroomCollection(slug: string): ShowroomCollection | null {
  if (!SLUG_PATTERN.test(slug)) return null;
  return listShowroomCollections().find((collection) => collection.slug === slug) ?? null;
}

/** Whether the header, footer and sitemap should offer /collections in this environment. */
export function hasShowroomCollections(): boolean {
  return listShowroomCollections().length > 0;
}

/** "8 recipes · 7 under an hour · 5 freeze": facts that are true of this set. */
export function collectionFacts(collection: Pick<ShowroomCollection, "recipes">): string[] {
  const { recipes } = collection;
  const facts = [recipeCount(recipes.length)];
  const timed = recipes.filter((recipe) => recipe.minutes !== null);
  const underHour = timed.filter((recipe) => (recipe.minutes ?? 0) <= 60).length;
  if (timed.length === recipes.length && underHour === recipes.length) facts.push("all under an hour");
  else if (underHour > 0) facts.push(`${underHour} under an hour`);
  const freeze = recipes.filter((recipe) => recipe.freezes).length;
  if (freeze === recipes.length) facts.push("every one freezes");
  else if (freeze > 0) facts.push(`${freeze} freeze`);
  return facts;
}

/** "1 recipe", "8 recipes". */
export function recipeCount(count: number): string {
  return `${count} recipe${count === 1 ? "" : "s"}`;
}
