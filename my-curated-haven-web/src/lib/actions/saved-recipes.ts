"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { saveRecipe, removeSavedRecipe, type SavedMutationResult } from "@/lib/data/saved-recipes";
import { revalidatePath } from "next/cache";

export async function toggleSaveRecipeAction(
  recipeId: string,
  shouldSave: boolean
): Promise<SavedMutationResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "unauthenticated" };
  }

  const supabase = await createClient();
  const result = shouldSave
    ? await saveRecipe(supabase, user.id, recipeId)
    : await removeSavedRecipe(supabase, user.id, recipeId);

  revalidatePath("/account/saved-recipes");
  return result;
}
