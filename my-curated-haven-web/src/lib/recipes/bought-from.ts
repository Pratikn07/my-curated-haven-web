/**
 * The recipe a parent was looking at when they tapped "Buy now", remembered in this browser only, so the
 * "You're in" page can send them straight back to it (where the recipe opens with the reveal). It grants
 * nothing: the confirmation page checks the slug against the book they bought, and the recipe page checks access.
 */

const KEY = "mch:bought-from-recipe";
/** Long enough for checkout and the email code; short enough that an old visit never redirects a new purchase. */
export const BOUGHT_FROM_MAX_AGE_MS = 2 * 60 * 60 * 1000;

/** The recipe slug to open, or null when the stored value is missing, malformed, stale or for another book. */
export function pickBoughtFrom(
  raw: string | null,
  collectionSlug: string,
  recipeSlugs: readonly string[],
  now: number,
): string | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const { collection, recipe, at } = value as Record<string, unknown>;
  if (collection !== collectionSlug || typeof recipe !== "string" || typeof at !== "number") return null;
  if (now - at < 0 || now - at > BOUGHT_FROM_MAX_AGE_MS) return null;
  return recipeSlugs.includes(recipe) ? recipe : null;
}

export function rememberBoughtFrom(collectionSlug: string, recipeSlug: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ collection: collectionSlug, recipe: recipeSlug, at: Date.now() }));
  } catch {
    // Private browsing or blocked storage: the confirmation page falls back to the library.
  }
}

export function recallBoughtFrom(collectionSlug: string, recipeSlugs: readonly string[]): string | null {
  try {
    return pickBoughtFrom(window.localStorage.getItem(KEY), collectionSlug, recipeSlugs, Date.now());
  } catch {
    return null;
  }
}

export function forgetBoughtFrom(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
