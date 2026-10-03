"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Field, { TextInput } from "@/components/ui/Field";
import PhotoField from "@/components/admin/PhotoField";
import { saveRecipeAction, type EditorState } from "@/app/admin/recipes/actions";
import { ADMIN_ALLERGENS, slugify, type AdminRecipeInput } from "@/lib/admin/recipe-input";
import { AVAILABLE_DIETS, AVAILABLE_MEALS } from "@/lib/recipes/filters";

type RecipeEditorProps = {
  recipeId: string | null;
  version: string | null;
  initial: AdminRecipeInput;
  isLive: boolean;
  slugLocked: boolean;
};

type Row<T> = T & { key: number };

const textareaClass =
  "w-full rounded-xl border border-border-control bg-surface px-3 py-2 text-base text-foreground";

let nextKey = 0;
function withKeys<T extends object>(items: T[]): Row<T>[] {
  return items.map((item) => ({ ...item, key: nextKey++ }));
}

function CheckboxGroup({
  legend,
  name,
  options,
  selected,
  error,
}: {
  legend: string;
  name: string;
  options: readonly string[];
  selected: string[];
  error?: string;
}) {
  // Keep labels a recipe already has even if they are no longer in the standard list.
  const all = Array.from(new Set([...options, ...selected]));
  return (
    <fieldset className="grid gap-2">
      <legend className="font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {all.map((option) => (
          <label
            key={option}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border-control bg-surface px-4 text-sm font-semibold has-[:checked]:border-action has-[:checked]:bg-surface-muted"
          >
            <input type="checkbox" name={name} value={option} defaultChecked={selected.includes(option)} className="h-4 w-4" />
            {option}
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export default function RecipeEditor({ recipeId, version, initial, isLive, slugLocked }: RecipeEditorProps) {
  const [state, formAction, pending] = useActionState<EditorState, FormData>(saveRecipeAction, {
    status: "idle",
  });
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const slugTouched = useRef(Boolean(initial.slug));
  const [ingredients, setIngredients] = useState(() =>
    withKeys(initial.ingredients.length ? initial.ingredients : [{ amount: "", item: "" }])
  );
  const [steps, setSteps] = useState(() =>
    withKeys((initial.steps.length ? initial.steps : [""]).map((text) => ({ text })))
  );
  const [allergenState, setAllergenState] = useState(initial.allergenReviewState);

  // Warn before leaving with unsaved changes.
  const [dirty, setDirty] = useState(false);
  const markDirty = () => setDirty(true);
  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  // Submitting by hand rather than through <form action>: React resets an
  // action form's fields afterwards, which would wipe a recipe that failed a check.
  const intent = useRef<"save" | "publish">("save");
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("intent", intent.current);
    intent.current = "save";
    startTransition(() => formAction(formData));
  }

  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state]);

  function moveStep(index: number, offset: number) {
    setSteps((current) => {
      const next = [...current];
      const [step] = next.splice(index, 1);
      next.splice(index + offset, 0, step);
      return next;
    });
    markDirty();
  }

  return (
    <form onSubmit={handleSubmit} onChange={markDirty} className="grid gap-8" noValidate>
      {recipeId ? <input type="hidden" name="recipeId" value={recipeId} /> : null}
      {version ? <input type="hidden" name="version" value={version} /> : null}

      {state.status === "error" ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-[var(--radius-card)] border border-danger bg-surface p-4 font-semibold text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <section aria-labelledby="basics-heading" className="grid gap-5">
        <h2 id="basics-heading" className="text-xl font-semibold">
          The basics
        </h2>

        <Field id="recipe-title" label="Recipe name" error={errors.title}>
          <TextInput
            name="title"
            value={title}
            maxLength={120}
            required
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slugTouched.current && !slugLocked) setSlug(slugify(event.target.value));
            }}
          />
        </Field>

        <Field
          id="recipe-slug"
          label="Web address"
          hint={
            slugLocked
              ? `mycuratedhaven.com/recipes/${slug} — fixed, because this recipe has been live.`
              : `mycuratedhaven.com/recipes/${slug || "…"}`
          }
          error={errors.slug}
        >
          <TextInput
            name="slug"
            value={slug}
            maxLength={80}
            readOnly={slugLocked}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => {
              slugTouched.current = true;
              setSlug(event.target.value.toLowerCase());
            }}
          />
        </Field>

        <Field id="recipe-summary" label="Short summary" hint="One or two sentences shown on recipe cards." error={errors.summary}>
          <textarea name="summary" defaultValue={initial.summary} rows={3} maxLength={300} className={textareaClass} />
        </Field>

        <PhotoField initialUrl={initial.imageUrl} error={errors.imageUrl} onChange={markDirty} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="recipe-minutes" label="Total time (minutes)" error={errors.totalMinutes}>
            <TextInput
              name="totalMinutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              defaultValue={initial.totalMinutes ?? ""}
            />
          </Field>
          <Field id="recipe-yield" label="Makes" hint="For example: 12 small bars" error={errors.yieldText}>
            <TextInput name="yieldText" defaultValue={initial.yieldText} maxLength={60} />
          </Field>
        </div>

        <CheckboxGroup legend="Meal" name="meal" options={AVAILABLE_MEALS} selected={initial.mealLabels} error={errors.labels} />
        <CheckboxGroup legend="Diet" name="diet" options={AVAILABLE_DIETS} selected={initial.dietLabels} />
      </section>

      <section aria-labelledby="ingredients-heading" className="grid gap-3">
        <h2 id="ingredients-heading" className="text-xl font-semibold">
          Ingredients
        </h2>
        {errors.ingredients ? (
          <p role="alert" className="text-sm font-semibold text-danger">
            {errors.ingredients}
          </p>
        ) : null}
        <ol className="grid gap-3">
          {ingredients.map((ingredient, index) => (
            <li key={ingredient.key} className="grid grid-cols-[6.5rem_1fr_auto] items-end gap-2">
              <div className="grid gap-1">
                <label htmlFor={`ingredient-amount-${index}`} className="text-sm font-semibold">
                  Amount
                </label>
                <TextInput
                  id={`ingredient-amount-${index}`}
                  name="ingredientAmount"
                  defaultValue={ingredient.amount}
                  maxLength={40}
                  placeholder="1 cup"
                />
              </div>
              <div className="grid gap-1">
                <label htmlFor={`ingredient-item-${index}`} className="text-sm font-semibold">
                  Ingredient {index + 1}
                </label>
                <TextInput
                  id={`ingredient-item-${index}`}
                  name="ingredientItem"
                  defaultValue={ingredient.item}
                  maxLength={200}
                  placeholder="rolled oats"
                />
              </div>
              <button
                type="button"
                aria-label={`Remove ingredient ${index + 1}`}
                onClick={() => {
                  setIngredients((current) => current.filter((row) => row.key !== ingredient.key));
                  markDirty();
                }}
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-border-control bg-surface text-lg hover:bg-surface-muted"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        <Button
          variant="secondary"
          className="w-fit"
          onClick={() => {
            setIngredients((current) => [...current, ...withKeys([{ amount: "", item: "" }])]);
            markDirty();
          }}
        >
          Add ingredient
        </Button>
      </section>

      <section aria-labelledby="steps-heading" className="grid gap-3">
        <h2 id="steps-heading" className="text-xl font-semibold">
          Steps
        </h2>
        {errors.steps ? (
          <p role="alert" className="text-sm font-semibold text-danger">
            {errors.steps}
          </p>
        ) : null}
        <ol className="grid gap-4">
          {steps.map((step, index) => (
            <li key={step.key} className="grid gap-2">
              <label htmlFor={`step-${index}`} className="font-semibold">
                Step {index + 1}
              </label>
              <textarea
                id={`step-${index}`}
                name="step"
                defaultValue={step.text}
                rows={3}
                maxLength={1000}
                className={textareaClass}
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" disabled={index === 0} onClick={() => moveStep(index, -1)} aria-label={`Move step ${index + 1} up`}>
                  ↑
                </Button>
                <Button
                  variant="secondary"
                  disabled={index === steps.length - 1}
                  onClick={() => moveStep(index, 1)}
                  aria-label={`Move step ${index + 1} down`}
                >
                  ↓
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSteps((current) => current.filter((row) => row.key !== step.key));
                    markDirty();
                  }}
                >
                  Remove step
                </Button>
              </div>
            </li>
          ))}
        </ol>
        <Button
          variant="secondary"
          className="w-fit"
          onClick={() => {
            setSteps((current) => [...current, ...withKeys([{ text: "" }])]);
            markDirty();
          }}
        >
          Add step
        </Button>
      </section>

      <section aria-labelledby="notes-heading" className="grid gap-5">
        <h2 id="notes-heading" className="text-xl font-semibold">
          Tips and storage
        </h2>
        <Field id="recipe-tips" label="Tips" hint="Optional. Shown under the steps." error={errors.tips}>
          <textarea name="tips" defaultValue={initial.tips ?? ""} rows={3} maxLength={2000} className={textareaClass} />
        </Field>
        <Field id="recipe-storage" label="Storing leftovers" hint="Optional. Fridge and freezer times." error={errors.storageNotes}>
          <textarea name="storageNotes" defaultValue={initial.storageNotes ?? ""} rows={3} maxLength={1000} className={textareaClass} />
        </Field>
      </section>

      <fieldset className="grid gap-3">
        <legend className="text-xl font-semibold">Allergens</legend>
        <p className="text-sm text-text-muted">
          Read every ingredient, including what&apos;s in store-bought ones. A recipe can&apos;t go live until this is checked.
        </p>
        {[
          { value: "unknown", label: "Not checked yet" },
          { value: "reviewed_listed", label: "Contains allergens" },
          { value: "reviewed_no_allergens", label: "No major allergens — I checked every ingredient" },
        ].map((option) => (
          <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="allergenReviewState"
              value={option.value}
              checked={allergenState === option.value}
              onChange={() => setAllergenState(option.value as typeof allergenState)}
              className="h-5 w-5"
            />
            <span className={option.value === "unknown" ? "" : "font-semibold"}>{option.label}</span>
          </label>
        ))}
        {allergenState === "reviewed_listed" ? (
          <CheckboxGroup
            legend="It contains"
            name="allergen"
            options={ADMIN_ALLERGENS}
            selected={initial.allergens}
            error={errors.allergens}
          />
        ) : errors.allergens ? (
          <p role="alert" className="text-sm font-semibold text-danger">
            {errors.allergens}
          </p>
        ) : null}
      </fieldset>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {isLive ? (
            <Button type="submit" busy={pending} busyLabel="Saving…" onClick={() => (intent.current = "save")}>
              Save changes
            </Button>
          ) : (
            <>
              <Button
                type="submit"
                variant="secondary"
                busy={pending}
                busyLabel="Saving…"
                onClick={() => (intent.current = "save")}
              >
                Save draft
              </Button>
              <Button type="submit" busy={pending} busyLabel="Saving…" onClick={() => (intent.current = "publish")}>
                Save and publish
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
