import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { methodProblem, parseRecipeMethod, type RecipeMethod } from "../recipes/method";

export interface RecipeCatalogItem {
  id: string;
  slug: string;
  title: string;
  publicSummary: string;
  previewImagePath: string;
  imageAlt: string | null;
  imageDescription: string | null;
  totalMinutes: number | null;
  mealLabels: string[];
  dietLabels: string[];
  publishedAt: string | null;
}

export interface RecipeIngredient {
  amount?: string;
  unit?: string;
  item: string;
}

export interface RecipeInstructionStep {
  step: number;
  text: string;
}

export interface RecipeBody {
  recipeId: string;
  contentVersion: number;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstructionStep[];
  yield: string;
  yieldStructured?: Record<string, unknown> | null;
  reviewedNotes?: string | null;
  allergenReviewState: "unknown" | "reviewed_listed" | "reviewed_no_allergens";
  allergens: string[] | null;
  storageNotes?: string | null;
  /** The new method layout's content; null (missing or malformed) keeps today's layout. */
  method: RecipeMethod | null;
  updatedAt: string;
}

export interface RecipeWithBody {
  catalog: RecipeCatalogItem;
  body: RecipeBody;
}

export type RecipeQueryResult =
  | { status: "ok"; recipe: RecipeWithBody }
  | { status: "access_denied"; catalog: RecipeCatalogItem }
  | { status: "not_found" }
  | { status: "error"; message: string };

export interface FreeSlotItem {
  slot: number;
  recipe: RecipeCatalogItem;
  assignedAt: string;
}

function mapCatalogRow(row: {
  id: string;
  slug: string;
  title: string;
  public_summary: string;
  preview_image_path: string;
  preview_image_alt: string | null;
  preview_image_description: string | null;
  total_minutes: number | null;
  meal_labels: string[];
  diet_labels: string[];
  published_at: string | null;
}): RecipeCatalogItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    publicSummary: row.public_summary,
    previewImagePath: row.preview_image_path,
    imageAlt: row.preview_image_alt,
    imageDescription: row.preview_image_description,
    totalMinutes: row.total_minutes,
    mealLabels: row.meal_labels,
    dietLabels: row.diet_labels,
    publishedAt: row.published_at,
  };
}

/**
 * Fetch catalog items visible under the caller's database policies.
 * Visitors and customers see published items; admins can also inspect drafts.
 * Enforces strict DTO boundaries: no bodies or sensitive fields are ever fetched here.
 */
export async function getPublishedCatalog(
  client: SupabaseClient<Database>
): Promise<RecipeCatalogItem[]> {
  const { data, error } = await client
    .from("recipe_catalog")
    .select(
      "id, slug, title, public_summary, preview_image_path, preview_image_alt, preview_image_description, total_minutes, meal_labels, diet_labels, published_at"
    )
    .order("title");

  if (error || !data) {
    throw new Error(
      `Failed to fetch recipe catalog: ${error?.message ?? "empty catalog response"}`
    );
  }

  return data.map(mapCatalogRow);
}

const BODY_COLUMNS =
  "recipe_id, content_version, ingredients, instructions, yield, yield_structured, reviewed_notes, allergen_review_state, allergens, storage_notes, updated_at" as const;
/** Postgres "undefined_column", which PostgREST passes through. */
const UNDEFINED_COLUMN = "42703";

/**
 * Fetch a single recipe by its slug.
 * Executes body query under caller credentials so database RLS enforces entitlement/free-slot rules.
 */
export async function getRecipeBySlug(
  client: SupabaseClient<Database>,
  slug: string
): Promise<RecipeQueryResult> {
  const { data: catalogData, error: catalogError } = await client
    .from("recipe_catalog")
    .select(
      "id, slug, title, public_summary, preview_image_path, preview_image_alt, preview_image_description, total_minutes, meal_labels, diet_labels, published_at"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (catalogError) {
    return { status: "error", message: catalogError.message };
  }

  if (!catalogData) {
    return { status: "not_found" };
  }

  const catalog = mapCatalogRow(catalogData);

  // Attempt to fetch body under caller session credentials
  let bodyResult = await client
    .from("recipe_bodies")
    .select(`${BODY_COLUMNS}, method`)
    .eq("recipe_id", catalog.id)
    .maybeSingle();
  // A database without the method column yet (20261014120000_recipe_method.sql not applied) is not an error:
  // the recipe keeps today's layout.
  if (bodyResult.error?.code === UNDEFINED_COLUMN) {
    const classic = await client.from("recipe_bodies").select(BODY_COLUMNS).eq("recipe_id", catalog.id).maybeSingle();
    bodyResult = { ...classic, data: classic.data ? { ...classic.data, method: null } : null } as typeof bodyResult;
  }
  const { data: bodyData, error: bodyError } = bodyResult;

  if (bodyError) {
    return { status: "error", message: bodyError.message };
  }

  // If RLS returned no row, the caller is not entitled and the recipe is not free
  if (!bodyData) {
    return { status: "access_denied", catalog };
  }

  const rawIngredients = Array.isArray(bodyData.ingredients)
    ? (bodyData.ingredients as unknown as RecipeIngredient[])
    : [];

  const rawInstructions = Array.isArray(bodyData.instructions)
    ? (bodyData.instructions as unknown as RecipeInstructionStep[])
    : [];

  const allergenState = (
    ["unknown", "reviewed_listed", "reviewed_no_allergens"].includes(
      bodyData.allergen_review_state
    )
      ? bodyData.allergen_review_state
      : "unknown"
  ) as RecipeBody["allergenReviewState"];

  // A recipe page must never break on bad method data: anything malformed falls back to today's layout.
  const method = parseRecipeMethod(bodyData.method);
  if (bodyData.method != null && !method) {
    console.warn(`Recipe ${slug}: method content is malformed at ${methodProblem(bodyData.method)}; showing the classic layout.`);
  }

  const body: RecipeBody = {
    recipeId: bodyData.recipe_id,
    contentVersion: bodyData.content_version,
    ingredients: rawIngredients,
    instructions: rawInstructions,
    yield: bodyData.yield,
    yieldStructured:
      bodyData.yield_structured && typeof bodyData.yield_structured === "object"
        ? (bodyData.yield_structured as Record<string, unknown>)
        : null,
    reviewedNotes: bodyData.reviewed_notes,
    allergenReviewState: allergenState,
    allergens: bodyData.allergens,
    storageNotes: bodyData.storage_notes,
    method,
    updatedAt: bodyData.updated_at,
  };

  return {
    status: "ok",
    recipe: {
      catalog,
      body,
    },
  };
}

/**
 * Fetch assigned free recipe slots.
 */
export async function getFreeRecipeSlots(
  client: SupabaseClient<Database>
): Promise<FreeSlotItem[]> {
  const { data, error } = await client
    .from("free_recipe_slots")
    .select(`
      slot,
      assigned_at,
      recipe_catalog:recipe_id (
        id, slug, title, public_summary, preview_image_path, preview_image_alt, preview_image_description, total_minutes, meal_labels, diet_labels, published_at
      )
    `)
    .order("slot");

  if (error || !data) {
    throw new Error(
      `Failed to fetch free slots: ${error?.message ?? "empty free slots response"}`
    );
  }

  return data
    .filter((row) => row.recipe_catalog !== null)
    .map((row) => ({
      slot: row.slot,
      assignedAt: row.assigned_at,
      recipe: mapCatalogRow(row.recipe_catalog as unknown as Parameters<typeof mapCatalogRow>[0]),
    }));
}

/**
 * Fetch only the recipes assigned to free slots, preserving their slot order.
 * A failed slot lookup is an error; callers must not broaden to all published recipes.
 */
export async function getFreeRecipeCatalog(
  client: SupabaseClient<Database>
): Promise<RecipeCatalogItem[]> {
  const slots = await getFreeRecipeSlots(client);
  return slots.map(({ recipe }) => recipe);
}
