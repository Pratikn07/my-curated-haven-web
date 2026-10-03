import Badge from "@/components/ui/Badge";
import type { PublicationState } from "@/lib/admin/recipes";

const LABELS: Record<PublicationState, string> = {
  draft: "Draft",
  published: "Live",
  withdrawn: "Taken down",
};

export default function RecipeStateBadge({ state }: { state: PublicationState }) {
  return <Badge variant={state === "published" ? "free" : "neutral"}>{LABELS[state]}</Badge>;
}

/** Where parents can find a recipe, in one line. */
export function describePlacement(
  state: PublicationState,
  freeSlot: number | null,
  collections: string[]
): string {
  if (state !== "published") return "Parents can't see it.";
  if (freeSlot !== null) return `Free recipe ${freeSlot} of 3, on the homepage and recipe index.`;
  if (collections.length > 0) return `In ${collections.join(", ")}.`;
  return "Live, but not free or in a collection yet, so parents see it locked.";
}
