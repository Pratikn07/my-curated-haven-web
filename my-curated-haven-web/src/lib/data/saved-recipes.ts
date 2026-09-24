import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { RecipeCatalogItem } from "./recipes";
import { checkRecipeAccess } from "./access";

export interface SavedRecipeItem {
  id: string;
  recipeId: string;
  savedAt: string;
  isAvailable: boolean;
  catalog: RecipeCatalogItem | null;
}

export type SavedRecipesResult =
  | { status: "ok"; items: SavedRecipeItem[] }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

export type SavedMutationErrorCode =
  | "recipe_access_denied"
  | "recipe_not_found"
  | "recipe_access_unavailable"
  | "save_failed"
  | "remove_failed";

export type SavedMutationResult =
  | { status: "ok"; isSaved: boolean }
  | { status: "unauthenticated" }
  | { status: "error"; code: SavedMutationErrorCode; message: string };

export async function getSavedRecipes(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<SavedRecipesResult> {
  if (!userId) {
    return { status: "unauthenticated" };
  }

  try {
    // 1. Fetch user's saved_recipes
    const { data: savedRows, error: savedError } = await supabase
      .from("saved_recipes")
      .select("id, recipe_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (savedError) {
      return { status: "error", message: savedError.message };
    }

    if (!savedRows || savedRows.length === 0) {
      return { status: "ok", items: [] };
    }

    // 2. Fetch corresponding published recipe catalog metadata
    const recipeIds = savedRows.map((r) => r.recipe_id);
    const { data: catalogRows, error: catalogError } = await supabase
      .from("recipe_catalog")
      .select(
        "id, slug, title, public_summary, preview_image_path, total_minutes, meal_labels, diet_labels, published_at"
      )
      .in("id", recipeIds)
      .eq("publication_state", "published");

    if (catalogError) {
      return { status: "error", message: catalogError.message };
    }

    const catalogMap = new Map<string, RecipeCatalogItem>();
    (catalogRows || []).forEach((row) => {
      catalogMap.set(row.id, {
        id: row.id,
        slug: row.slug,
        title: row.title,
        publicSummary: row.public_summary,
        previewImagePath: row.preview_image_path,
        totalMinutes: row.total_minutes,
        mealLabels: row.meal_labels || [],
        dietLabels: row.diet_labels || [],
        publishedAt: row.published_at,
      });
    });

    const items: SavedRecipeItem[] = savedRows.map((saved) => {
      const catalog = catalogMap.get(saved.recipe_id) || null;
      return {
        id: saved.id,
        recipeId: saved.recipe_id,
        savedAt: saved.created_at || new Date().toISOString(),
        isAvailable: Boolean(catalog),
        catalog,
      };
    });

    return { status: "ok", items };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Unexpected error reading saved recipes",
    };
  }
}

export async function getSavedRecipeIds(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Set<string>> {
  if (!userId) return new Set();

  try {
    const { data, error } = await supabase
      .from("saved_recipes")
      .select("recipe_id")
      .eq("user_id", userId);

    if (error || !data) return new Set();
    return new Set(data.map((r) => r.recipe_id));
  } catch {
    return new Set();
  }
}

export async function saveRecipe(
  supabase: SupabaseClient<Database>,
  userId: string,
  recipeId: string
): Promise<SavedMutationResult> {
  if (!userId) {
    return { status: "unauthenticated" };
  }

  try {
    const access = await checkRecipeAccess(supabase, recipeId);

    if (access.type === "denied") {
      return {
        status: "error",
        code: "recipe_access_denied",
        message: "This recipe isn't available to save.",
      };
    }

    if (access.type === "not_found") {
      return {
        status: "error",
        code: "recipe_not_found",
        message: "This recipe could not be found.",
      };
    }

    if (access.type === "error") {
      return {
        status: "error",
        code: "recipe_access_unavailable",
        message: "We couldn't verify access to this recipe. Please try again.",
      };
    }

    // Idempotent insert: duplicate saves resolve to success
    const { error } = await supabase
      .from("saved_recipes")
      .upsert(
        { user_id: userId, recipe_id: recipeId },
        { onConflict: "user_id, recipe_id", ignoreDuplicates: true }
      );

    if (error) {
      return { status: "error", code: "save_failed", message: error.message };
    }

    return { status: "ok", isSaved: true };
  } catch (err) {
    return {
      status: "error",
      code: "save_failed",
      message: err instanceof Error ? err.message : "Failed to save recipe",
    };
  }
}

export async function removeSavedRecipe(
  supabase: SupabaseClient<Database>,
  userId: string,
  recipeId: string
): Promise<SavedMutationResult> {
  if (!userId) {
    return { status: "unauthenticated" };
  }

  try {
    const { error } = await supabase
      .from("saved_recipes")
      .delete()
      .eq("user_id", userId)
      .eq("recipe_id", recipeId);

    if (error) {
      return { status: "error", code: "remove_failed", message: error.message };
    }

    return { status: "ok", isSaved: false };
  } catch (err) {
    return {
      status: "error",
      code: "remove_failed",
      message: err instanceof Error ? err.message : "Failed to remove recipe",
    };
  }
}
