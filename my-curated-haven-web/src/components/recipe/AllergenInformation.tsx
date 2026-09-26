import Badge from "@/components/ui/Badge";
import { getAllergenDisplay } from "@/lib/recipes/allergen-display";
import type { RecipeBody } from "@/lib/data/recipes";

interface AllergenInformationProps {
  reviewState: RecipeBody["allergenReviewState"];
  allergens: string[] | null;
}

export default function AllergenInformation({
  reviewState,
  allergens,
}: AllergenInformationProps) {
  const display = getAllergenDisplay(reviewState, allergens);

  return (
    <section
      aria-labelledby="allergens-heading"
      className="w-full min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-8"
    >
      <h2 id="allergens-heading" className="text-xl font-bold text-foreground">
        Allergen Information
      </h2>
      <div className="mt-3 text-sm leading-relaxed text-text-muted">
        {display.kind === "reviewed_listed" ? (
          <div>
            <p className="font-semibold text-foreground">Contains reviewed allergens:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {display.allergens.map((allergen) => (
                <Badge key={allergen} variant="collection">
                  {allergen}
                </Badge>
              ))}
            </div>
          </div>
        ) : display.kind === "unknown" && display.allergens.length > 0 ? (
          <div>
            <p className="font-semibold text-foreground">Listed in this recipe, not yet reviewed:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {display.allergens.map((allergen) => (
                <Badge key={allergen} variant="collection">
                  {allergen}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-text-muted">{display.message}</p>
          </div>
        ) : (
          <p
            className={
              display.kind === "reviewed_no_allergens"
                ? "font-medium text-action"
                : "text-text-muted"
            }
          >
            {display.message}
          </p>
        )}
      </div>
    </section>
  );
}
