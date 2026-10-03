/**
 * Reads the admin recipe form into a checked recipe, and says what is still
 * missing before it can be published. Pure: no database, no Next.js, so the
 * rules can be unit tested on their own.
 */

export type AllergenReviewState = "unknown" | "reviewed_listed" | "reviewed_no_allergens";

export interface AdminIngredient {
  amount: string;
  item: string;
}

export interface AdminRecipeInput {
  title: string;
  slug: string;
  summary: string;
  imageUrl: string;
  totalMinutes: number | null;
  mealLabels: string[];
  dietLabels: string[];
  yieldText: string;
  ingredients: AdminIngredient[];
  steps: string[];
  tips: string | null;
  storageNotes: string | null;
  allergenReviewState: AllergenReviewState;
  allergens: string[];
}

export type AdminRecipeField =
  | "title"
  | "slug"
  | "summary"
  | "imageUrl"
  | "totalMinutes"
  | "labels"
  | "yieldText"
  | "ingredients"
  | "steps"
  | "tips"
  | "storageNotes"
  | "allergens";

export type FieldErrors = Partial<Record<AdminRecipeField, string>>;

export type ParseResult =
  | { ok: true; value: AdminRecipeInput }
  | { ok: false; errors: FieldErrors };

/** The nine major food allergens, as parents read them on a label. */
export const ADMIN_ALLERGENS = [
  "Milk",
  "Eggs",
  "Fish",
  "Shellfish",
  "Tree nuts",
  "Peanuts",
  "Wheat",
  "Soy",
  "Sesame",
] as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LABEL_PATTERN = /^[A-Za-z][A-Za-z -]{0,29}$/;
const MAX_INGREDIENTS = 40;
const MAX_STEPS = 30;
const MAX_LABELS = 8;

/** private.slugify from the database, plus collapsing repeated dashes so the result is a valid slug. */
export function slugify(value: string): string {
  return value
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

type FormLike = {
  get(name: string): FormDataEntryValue | null;
  getAll(name: string): FormDataEntryValue[];
};

function text(form: FormLike, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function texts(form: FormLike, name: string): string[] {
  return form.getAll(name).map((value) => (typeof value === "string" ? value.trim() : ""));
}

function labels(form: FormLike, name: string): string[] {
  return Array.from(new Set(texts(form, name).filter(Boolean)));
}

/**
 * Check the form. A draft only needs a title; everything else may be blank
 * until publishing, but anything filled in must be valid.
 */
export function parseRecipeForm(form: FormLike): ParseResult {
  const errors: FieldErrors = {};

  const title = text(form, "title");
  if (title.length < 3) errors.title = "Give the recipe a name of at least 3 characters.";
  else if (title.length > 120) errors.title = "Keep the name under 120 characters.";

  const typedSlug = text(form, "slug").toLowerCase();
  const slug = typedSlug || slugify(title);
  if (!errors.title && !SLUG_PATTERN.test(slug)) {
    errors.slug = "Use lowercase letters, numbers and single dashes, like oat-bars.";
  } else if (slug.length > 80) {
    errors.slug = "Keep the web address under 80 characters.";
  }

  const summary = text(form, "summary");
  if (summary.length > 300) errors.summary = "Keep the summary under 300 characters.";

  const imageUrl = text(form, "imageUrl");
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) errors.imageUrl = "Upload the photo again.";

  const minutesText = text(form, "totalMinutes");
  let totalMinutes: number | null = null;
  if (minutesText) {
    const minutes = Number(minutesText);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) {
      errors.totalMinutes = "Enter whole minutes between 1 and 600.";
    } else {
      totalMinutes = minutes;
    }
  }

  const mealLabels = labels(form, "meal");
  const dietLabels = labels(form, "diet");
  if (
    mealLabels.length > MAX_LABELS ||
    dietLabels.length > MAX_LABELS ||
    [...mealLabels, ...dietLabels].some((label) => !LABEL_PATTERN.test(label))
  ) {
    errors.labels = "Pick from the listed meal and diet labels.";
  }

  const yieldText = text(form, "yieldText");
  if (yieldText.length > 60) errors.yieldText = "Keep this under 60 characters, like 12 small bars.";

  const amounts = texts(form, "ingredientAmount");
  const items = texts(form, "ingredientItem");
  const ingredients: AdminIngredient[] = [];
  for (let i = 0; i < Math.max(amounts.length, items.length); i++) {
    const amount = amounts[i] ?? "";
    const item = items[i] ?? "";
    if (!amount && !item) continue;
    if (!item) {
      errors.ingredients = `Ingredient ${ingredients.length + 1} has an amount but no ingredient.`;
      break;
    }
    if (amount.length > 40 || item.length > 200) {
      errors.ingredients = `Ingredient ${ingredients.length + 1} is too long.`;
      break;
    }
    ingredients.push({ amount, item });
  }
  if (!errors.ingredients && ingredients.length > MAX_INGREDIENTS) {
    errors.ingredients = `Use at most ${MAX_INGREDIENTS} ingredients.`;
  }

  const steps = texts(form, "step").filter(Boolean);
  if (steps.length > MAX_STEPS) errors.steps = `Use at most ${MAX_STEPS} steps.`;
  else if (steps.some((step) => step.length > 1000)) {
    errors.steps = "Keep each step under 1000 characters.";
  }

  const tips = text(form, "tips");
  if (tips.length > 2000) errors.tips = "Keep tips under 2000 characters.";
  const storageNotes = text(form, "storageNotes");
  if (storageNotes.length > 1000) errors.storageNotes = "Keep storage notes under 1000 characters.";

  const reviewText = text(form, "allergenReviewState");
  const allergenReviewState: AllergenReviewState =
    reviewText === "reviewed_listed" || reviewText === "reviewed_no_allergens"
      ? reviewText
      : "unknown";
  const knownAllergens = new Set<string>(ADMIN_ALLERGENS);
  const allergens = labels(form, "allergen").filter((name) => knownAllergens.has(name));
  if (allergenReviewState === "reviewed_listed" && allergens.length === 0) {
    errors.allergens = "Tick the allergens this recipe contains, or choose “No major allergens”.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title,
      slug,
      summary,
      imageUrl,
      totalMinutes,
      mealLabels,
      dietLabels,
      yieldText,
      ingredients,
      steps,
      tips: tips || null,
      storageNotes: storageNotes || null,
      allergenReviewState,
      allergens: allergenReviewState === "reviewed_listed" ? allergens : [],
    },
  };
}

/** What a parent would miss if this recipe went live now. Empty means ready. */
export function publishProblems(recipe: AdminRecipeInput): string[] {
  const problems: string[] = [];
  if (recipe.summary.length < 10) problems.push("Add a short summary (at least 10 characters).");
  if (!recipe.imageUrl) problems.push("Add a photo.");
  if (!recipe.yieldText) problems.push("Say how much it makes.");
  if (recipe.ingredients.length === 0) problems.push("Add the ingredients.");
  if (recipe.steps.length === 0) problems.push("Add the steps.");
  if (recipe.allergenReviewState === "unknown") {
    problems.push("Check the allergens and choose what the recipe contains.");
  }
  return problems;
}

/** The recipe as the database function admin_save_recipe expects it. */
export function toSavePayload(recipe: AdminRecipeInput) {
  return {
    title: recipe.title,
    slug: recipe.slug,
    summary: recipe.summary,
    imageUrl: recipe.imageUrl,
    totalMinutes: recipe.totalMinutes,
    mealLabels: recipe.mealLabels,
    dietLabels: recipe.dietLabels,
    yield: recipe.yieldText,
    ingredients: recipe.ingredients.map(({ amount, item }) => (amount ? { amount, item } : { item })),
    steps: recipe.steps,
    tips: recipe.tips ?? "",
    storageNotes: recipe.storageNotes ?? "",
    allergenReviewState: recipe.allergenReviewState,
    allergens: recipe.allergens,
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/**
 * Turn a recipe from admin_get_recipe back into editor fields. Older recipes
 * store ingredients as plain strings or with a separate unit, and steps as
 * strings or {step, text}; all of them open in the editor.
 */
export function inputFromStored(stored: Record<string, unknown>): AdminRecipeInput {
  const ingredients: AdminIngredient[] = (Array.isArray(stored.ingredients) ? stored.ingredients : [])
    .map((raw): AdminIngredient => {
      if (typeof raw === "string") return { amount: "", item: raw };
      const entry = (raw ?? {}) as Record<string, unknown>;
      const amount = [asString(entry.amount), asString(entry.unit)].filter(Boolean).join(" ");
      return { amount, item: asString(entry.item) };
    })
    .filter((ingredient) => ingredient.amount || ingredient.item);

  const steps = (Array.isArray(stored.instructions) ? stored.instructions : [])
    .map((raw) => {
      if (typeof raw === "string") return raw;
      const entry = (raw ?? {}) as Record<string, unknown>;
      return asString(entry.text);
    })
    .filter(Boolean);

  const review = asString(stored.allergenReviewState);
  const allergenReviewState: AllergenReviewState =
    review === "reviewed_listed" || review === "reviewed_no_allergens" ? review : "unknown";

  return {
    title: asString(stored.title),
    slug: asString(stored.slug),
    summary: asString(stored.summary),
    imageUrl: asString(stored.imageUrl),
    totalMinutes: typeof stored.totalMinutes === "number" ? stored.totalMinutes : null,
    mealLabels: asStringArray(stored.mealLabels),
    dietLabels: asStringArray(stored.dietLabels),
    yieldText: asString(stored.yield),
    ingredients,
    steps,
    tips: asString(stored.tips) || null,
    storageNotes: asString(stored.storageNotes) || null,
    allergenReviewState,
    allergens: asStringArray(stored.allergens),
  };
}
