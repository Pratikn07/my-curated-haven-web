import type { RecipeBody } from "@/lib/data/recipes";
import { formatIngredient, normalizeInstructions } from "@/lib/recipes/format";

/**
 * The recipe's own sections. The recipe page is the one place a recipe is read
 * in full; Instagram campaign pages link to it instead of repeating it.
 */

export function RecipeIngredients({ ingredients }: { ingredients: RecipeBody["ingredients"] }) {
  return (
    <section aria-labelledby="ingredients-heading" className="w-full min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-8">
      <h2 id="ingredients-heading" className="text-2xl font-bold text-foreground">
        Ingredients
      </h2>
      <ul className="mt-4 divide-y divide-border text-base text-foreground">
        {ingredients.map((ing, i) => (
          <li key={i} className="flex items-start gap-3 py-2.5">
            <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-action" aria-hidden="true" />
            <span className="leading-relaxed [overflow-wrap:anywhere]">{formatIngredient(ing)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecipeMethod({ instructions }: { instructions: unknown }) {
  const steps = normalizeInstructions(instructions);
  return (
    <section aria-labelledby="instructions-heading" className="w-full min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-8">
      <h2 id="instructions-heading" className="text-2xl font-bold text-foreground">
        Method & Instructions
      </h2>
      <ol className="mt-4 grid gap-4 text-base text-foreground">
        {steps.map((step) => (
          <li key={step.step} className="flex min-w-0 gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-bold text-foreground">
              {step.step}
            </span>
            <p className="min-w-0 flex-1 pt-0.5 leading-relaxed [overflow-wrap:anywhere]">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function RecipeStorageNotes({
  storageNotes,
  reviewedNotes,
}: {
  storageNotes?: string | null;
  reviewedNotes?: string | null;
}) {
  if (!storageNotes && !reviewedNotes) return null;
  return (
    <section aria-labelledby="storage-notes-heading" className="w-full min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-8">
      <h2 id="storage-notes-heading" className="text-xl font-bold text-foreground">
        Storage & Preparation Notes
      </h2>
      <div className="mt-3 grid gap-4 text-sm leading-relaxed text-text-muted">
        {storageNotes && (
          <div>
            <h3 className="font-semibold text-foreground">Storage Instructions:</h3>
            <p className="mt-1 whitespace-pre-line break-words">{storageNotes}</p>
          </div>
        )}
        {reviewedNotes && (
          <div>
            <h3 className="font-semibold text-foreground">Helpful Toddler Feeding Tips:</h3>
            <p className="mt-1 whitespace-pre-line break-words">{reviewedNotes}</p>
          </div>
        )}
      </div>
    </section>
  );
}
