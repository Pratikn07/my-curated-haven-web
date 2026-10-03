import { HOMEPAGE_RECIPE_STATE, projectHomepageRecipes } from "@/config/homepage-content";
import { classifyHomepageRecipeLoadFailure } from "@/lib/data/homepage-recipes";
import { getFreeRecipeSlots, type RecipeCatalogItem } from "@/lib/data/recipes";
import { createClient } from "@/lib/supabase/server";

export type HomepageRecipes =
  | { status: "preparation" }
  | { status: "unavailable" }
  | { status: "ready"; recipes: RecipeCatalogItem[] };

/** Load the approved free recipes once per homepage render, shared by the house and the Kitchen section. */
export async function loadHomepageRecipes(): Promise<HomepageRecipes> {
  const state = HOMEPAGE_RECIPE_STATE;
  if (state.mode === "preparation") return { status: "preparation" };

  try {
    const supabase = await createClient();
    const slots = await getFreeRecipeSlots(supabase);
    const recipes = projectHomepageRecipes(state, slots).map(({ recipe }) => recipe);
    if (slots.length === 0) {
      console.warn("[homepage] No assigned free recipe slots returned", {
        category: "empty_free_slot_catalog",
      });
    } else if (recipes.length === 0) {
      console.warn("[homepage] No approved homepage recipes matched assigned slots", {
        category: "no_approved_slot_match",
      });
    }
    return { status: "ready", recipes };
  } catch (error) {
    console.error("[homepage] Free recipe list unavailable", {
      category: classifyHomepageRecipeLoadFailure(error),
    });
    return { status: "unavailable" };
  }
}
