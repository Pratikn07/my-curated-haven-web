"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { toResultCountBucket } from "@/lib/analytics/schema";

import {
  AVAILABLE_MEALS,
  AVAILABLE_DIETS,
  TIME_OPTIONS,
  type RecipeFilterState,
  parseFilterParams,
} from "@/lib/recipes/filters";

export {
  AVAILABLE_MEALS,
  AVAILABLE_DIETS,
  TIME_OPTIONS,
  type RecipeFilterState,
  parseFilterParams,
};

interface RecipeFiltersProps {
  totalCount: number;
}

export default function RecipeFilters({ totalCount }: RecipeFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const currentFilters = parseFilterParams(searchParams);

  // Search input state
  const [prevQ, setPrevQ] = useState(currentFilters.q);
  const [searchInput, setSearchInput] = useState(currentFilters.q);

  if (prevQ !== currentFilters.q) {
    setPrevQ(currentFilters.q);
    setSearchInput(currentFilters.q);
  }

  // Draft state for modal
  const [draftMeals, setDraftMeals] = useState<string[]>(currentFilters.meals);
  const [draftDiets, setDraftDiets] = useState<string[]>(currentFilters.diets);
  const [draftMaxTime, setDraftMaxTime] = useState<number | null>(currentFilters.maxTime);

  const updateFilters = (next: Partial<RecipeFilterState>) => {
    const merged: RecipeFilterState = {
      ...currentFilters,
      ...next,
    };

    const params = new URLSearchParams();
    if (merged.q) params.set("q", merged.q);
    merged.meals.forEach((m) => params.append("meal", m));
    merged.diets.forEach((d) => params.append("diet", d));
    if (merged.maxTime) params.set("maxTime", merged.maxTime.toString());

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput.trim().slice(0, 120) });
    trackAnalyticsEvent(
      "recipe_search_submit",
      {
        result_count_bucket: toResultCountBucket(totalCount),
        zero_results: totalCount === 0,
      },
      "recipes"
    );
  };

  const openDialog = () => {
    setDraftMeals(currentFilters.meals);
    setDraftDiets(currentFilters.diets);
    setDraftMaxTime(currentFilters.maxTime);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
    openButtonRef.current?.focus();
  };

  const applyDialogFilters = () => {
    const activeFilterCount =
      draftMeals.length + draftDiets.length + (draftMaxTime ? 1 : 0);
    updateFilters({
      meals: draftMeals,
      diets: draftDiets,
      maxTime: draftMaxTime,
    });
    trackAnalyticsEvent(
      "recipe_filter_apply",
      {
        active_filter_count: activeFilterCount,
        result_count_bucket: toResultCountBucket(totalCount),
      },
      "recipes"
    );
    closeDialog();
  };

  const clearAllFilters = () => {
    setSearchInput("");
    setDraftMeals([]);
    setDraftDiets([]);
    setDraftMaxTime(null);
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const activeFilterCount =
    (currentFilters.q ? 1 : 0) +
    currentFilters.meals.length +
    currentFilters.diets.length +
    (currentFilters.maxTime ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="grid gap-4">
      {/* Search Bar + Filter Trigger */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          onSubmit={handleSearchSubmit}
          action="/recipes"
          method="GET"
          className="flex flex-1 items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="search"
              name="q"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search recipes (e.g. spinach, frittata, oats)..."
              maxLength={120}
              className="w-full rounded-xl border border-border-control bg-surface px-4 py-3 text-base text-foreground placeholder:text-text-muted focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <Button
          ref={openButtonRef}
          variant="secondary"
          onClick={openDialog}
          aria-haspopup="dialog"
          className="whitespace-nowrap"
        >
          Filters
          {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
      </div>

      {/* Applied Filter Chips & Status Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {currentFilters.q ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                updateFilters({ q: "" });
              }}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium text-foreground hover:bg-surface-muted focus-visible:outline-2"
              aria-label={`Remove search term ${currentFilters.q}`}
            >
              <span>Query: &ldquo;{currentFilters.q}&rdquo;</span>
              <span aria-hidden="true" className="text-text-muted">&times;</span>
            </button>
          ) : null}

          {currentFilters.meals.map((meal) => (
            <button
              key={meal}
              type="button"
              onClick={() =>
                updateFilters({
                  meals: currentFilters.meals.filter((m) => m !== meal),
                })
              }
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium text-foreground hover:bg-surface-muted focus-visible:outline-2"
              aria-label={`Remove meal filter ${meal}`}
            >
              <span>{meal}</span>
              <span aria-hidden="true" className="text-text-muted">&times;</span>
            </button>
          ))}

          {currentFilters.diets.map((diet) => (
            <button
              key={diet}
              type="button"
              onClick={() =>
                updateFilters({
                  diets: currentFilters.diets.filter((d) => d !== diet),
                })
              }
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium text-foreground hover:bg-surface-muted focus-visible:outline-2"
              aria-label={`Remove dietary filter ${diet}`}
            >
              <span>{diet}</span>
              <span aria-hidden="true" className="text-text-muted">&times;</span>
            </button>
          ))}

          {currentFilters.maxTime ? (
            <button
              type="button"
              onClick={() => updateFilters({ maxTime: null })}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium text-foreground hover:bg-surface-muted focus-visible:outline-2"
              aria-label={`Remove time filter under ${currentFilters.maxTime} minutes`}
            >
              <span>Under {currentFilters.maxTime} min</span>
              <span aria-hidden="true" className="text-text-muted">&times;</span>
            </button>
          ) : null}

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm font-semibold text-action underline hover:text-action-hover focus-visible:outline-2"
            >
              Clear all
            </button>
          ) : null}
        </div>

        {/* Accessible polite live region for count */}
        <p role="status" aria-live="polite" className="text-sm font-medium text-text-muted">
          {totalCount === 0
            ? "No recipes found"
            : `${totalCount} toddler ${totalCount === 1 ? "recipe" : "recipes"}`}
        </p>
      </div>

      {/* Filter Modal Dialog */}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="fixed inset-0 m-auto w-[min(calc(100%-2rem),28rem)] max-h-[85vh] overflow-y-auto rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-2xl backdrop:bg-black/50"
        onCancel={(e) => {
          e.preventDefault();
          closeDialog();
        }}
        onClick={(e) => {
          // Backdrop click closes dialog
          if (e.target === dialogRef.current) {
            closeDialog();
          }
        }}
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 id={titleId} className="text-xl font-bold text-foreground">
            Filter Recipes
          </h2>
          <button
            type="button"
            onClick={closeDialog}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2"
            aria-label="Close filter modal"
          >
            &times;
          </button>
        </div>

        <div className="grid gap-6 py-4">
          {/* Meal Types (OR matching) */}
          <fieldset>
            <legend className="text-sm font-bold uppercase tracking-wider text-text-muted">
              Meal Types
            </legend>
            <div className="mt-2.5 grid gap-2">
              {AVAILABLE_MEALS.map((meal) => (
                <label
                  key={meal}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-surface-muted"
                >
                  <input
                    type="checkbox"
                    checked={draftMeals.includes(meal)}
                    onChange={() =>
                      setDraftMeals((current) =>
                        current.includes(meal)
                          ? current.filter((m) => m !== meal)
                          : [...current, meal]
                      )
                    }
                    className="h-5 w-5 rounded border-border-control text-action focus:ring-action"
                  />
                  <span className="text-base text-foreground">{meal}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Dietary Requirements (AND matching) */}
          <fieldset>
            <legend className="text-sm font-bold uppercase tracking-wider text-text-muted">
              Dietary Options
            </legend>
            <div className="mt-2.5 grid gap-2">
              {AVAILABLE_DIETS.map((diet) => (
                <label
                  key={diet}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-surface-muted"
                >
                  <input
                    type="checkbox"
                    checked={draftDiets.includes(diet)}
                    onChange={() =>
                      setDraftDiets((current) =>
                        current.includes(diet)
                          ? current.filter((d) => d !== diet)
                          : [...current, diet]
                      )
                    }
                    className="h-5 w-5 rounded border-border-control text-action focus:ring-action"
                  />
                  <span className="text-base text-foreground">{diet}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Maximum Cooking Time */}
          <fieldset>
            <legend className="text-sm font-bold uppercase tracking-wider text-text-muted">
              Total Time
            </legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {TIME_OPTIONS.map((time) => {
                const isSelected = draftMaxTime === time.value;
                return (
                  <button
                    key={time.value}
                    type="button"
                    onClick={() =>
                      setDraftMaxTime(isSelected ? null : time.value)
                    }
                    className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      isSelected
                        ? "border-action bg-action text-action-foreground"
                        : "border-border-control bg-surface text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    {time.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        {/* Dialog Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => {
              setDraftMeals([]);
              setDraftDiets([]);
              setDraftMaxTime(null);
            }}
            className="text-sm font-semibold text-text-muted hover:text-foreground focus-visible:outline-2"
          >
            Reset filters
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={applyDialogFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
