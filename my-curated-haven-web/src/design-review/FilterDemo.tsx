"use client";

import { useId, useRef, useState } from "react";
import { sampleRecipes } from "@/design-review/fixtures";
import RecipeCard from "@/components/recipe/RecipeCard";
import Button from "@/components/ui/Button";

const meals = ["Breakfast", "Meal"];

export default function FilterDemo() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [applied, setApplied] = useState<string[]>([]);
  const [draft, setDraft] = useState<string[]>([]);
  const [clicks, setClicks] = useState(0);
  const [busy, setBusy] = useState(false);

  const open = () => {
    setDraft(applied);
    dialogRef.current?.showModal();
  };

  const apply = () => {
    setApplied(draft);
    dialogRef.current?.close();
  };

  const cancel = () => {
    setDraft(applied);
    dialogRef.current?.close();
  };

  const visible = sampleRecipes.filter(
    (recipe) => applied.length === 0 || (recipe.mealLabel && applied.includes(recipe.mealLabel)),
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={open}>
          Filters{applied.length ? ` (${applied.length})` : ""}
        </Button>
        {applied.map((meal) => (
          <button
            key={meal}
            type="button"
            className="min-h-11 rounded-full border border-border-control px-3"
            onClick={() => setApplied((current) => current.filter((item) => item !== meal))}
          >
            Remove {meal}
          </button>
        ))}
        <p role="status">
          {visible.length} sample {visible.length === 1 ? "recipe" : "recipes"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.length ? (
          visible.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)
        ) : (
          <p>No sample recipes match these filters. Clear a filter or choose another meal.</p>
        )}
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="w-[min(100%,24rem)] rounded-[var(--radius-card)] border border-border p-4"
        onCancel={(event) => {
          event.preventDefault();
          cancel();
        }}
      >
        <h3 id={titleId} className="text-2xl font-semibold">
          Filter samples
        </h3>
        <div className="mt-4 grid gap-3">
          {meals.map((meal) => (
            <label key={meal} className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={draft.includes(meal)}
                onChange={() =>
                  setDraft((current) =>
                    current.includes(meal)
                      ? current.filter((item) => item !== meal)
                      : [...current, meal],
                  )
                }
              />
              {meal}
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={apply}>Apply filters</Button>
          <Button variant="secondary" onClick={cancel}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => setDraft([])}>
            Clear draft
          </Button>
        </div>
      </dialog>

      <div className="no-print grid gap-3 rounded-[var(--radius-card)] border border-border p-4">
        <h3 className="text-xl font-semibold">Busy control example</h3>
        <p>
          Activations: <span data-testid="busy-count">{clicks}</span>
        </p>
        <Button
          busy={busy}
          busyLabel="Saving sample"
          onClick={() => {
            setClicks((count) => count + 1);
            setBusy(true);
          }}
        >
          Start sample action
        </Button>
      </div>
    </div>
  );
}
