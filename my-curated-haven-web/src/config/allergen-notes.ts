/**
 * Recipes made with chocolate. Chocolate chips often contain milk or soy depending on the brand, and the recipe
 * steps already say "Chocolate chips can contain milk or soy. Check the label." The lists a parent reads before
 * buying (the locked recipe, the book's recipe list, /halloween) carry the same warning (owner decision 2026-10-14).
 * Add a recipe here when chocolate joins its ingredients.
 */
const WITH_CHOCOLATE = new Set([
  "berry-ghost-yogurt-bark",
  "mummy-banana-pops",
  "monster-energy-balls",
  "jack-o-lantern-mango-stars",
  "jack-o-lantern-peanut-butter-tart",
  "spider-cracker-bites",
  "spider-peanut-butter-oat-bites",
  "strawberry-yogurt-ghost-hearts",
  "blueberry-yogurt-bites",
  "chocolate-pumpkin-protein-tarts",
]);

/** What chocolate can add on top of the recipe's own allergens. */
const CHOCOLATE_MAY_CONTAIN = ["milk", "soy"] as const;

function joinAnd(items: readonly string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : (items[0] ?? "");
}

/** The allergens chocolate may add to this recipe that its own list does not name yet; empty when none. */
export function chocolateMayContain(slug: string, allergens: readonly string[]): string[] {
  if (!WITH_CHOCOLATE.has(slug)) return [];
  const listed = new Set(allergens.map((allergen) => allergen.toLowerCase()));
  return CHOCOLATE_MAY_CONTAIN.filter((allergen) => !listed.has(allergen));
}

/** "Chocolate may also contain soy" (or "may contain milk and soy" when nothing else is listed), or null. */
export function chocolateNote(slug: string, allergens: readonly string[]): string | null {
  const extra = chocolateMayContain(slug, allergens);
  if (extra.length === 0) return null;
  return `Chocolate may ${allergens.length > 0 ? "also " : ""}contain ${joinAnd(extra)}`;
}
