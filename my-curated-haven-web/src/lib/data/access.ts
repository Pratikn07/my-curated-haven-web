import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export type AccessStatus =
  | { type: "free"; slot: number }
  | { type: "entitled"; releaseId: string }
  | { type: "denied" }
  | { type: "not_found" };

/**
 * Authoritative access check evaluating database constraints and user grants.
 */
export async function checkRecipeAccess(
  client: SupabaseClient<Database>,
  recipeId: string
): Promise<AccessStatus> {
  // 1. Verify existence in published catalog
  const { data: catalog, error: catalogError } = await client
    .from("recipe_catalog")
    .select("id")
    .eq("id", recipeId)
    .maybeSingle();

  if (catalogError || !catalog) {
    return { type: "not_found" };
  }

  // 2. Check if recipe occupies an active free slot
  const { data: freeSlot } = await client
    .from("free_recipe_slots")
    .select("slot")
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (freeSlot) {
    return { type: "free", slot: freeSlot.slot };
  }

  // 3. Check if caller has an active entitlement
  const {
    data: { user },
  } = await client.auth.getUser();

  if (user) {
    const { data: entitlements } = await client
      .from("access_entitlements")
      .select("id, release_id, state, valid_from, expires_at, revoked_at")
      .eq("user_id", user.id)
      .eq("state", "active")
      .is("revoked_at", null);

    if (entitlements && entitlements.length > 0) {
      const activeReleaseIds = entitlements
        .filter((e) => {
          const now = new Date();
          const validFrom = new Date(e.valid_from);
          if (validFrom > now) return false;
          if (e.expires_at && new Date(e.expires_at) <= now) return false;
          return true;
        })
        .map((e) => e.release_id);

      if (activeReleaseIds.length > 0) {
        const { data: matchedRecipes } = await client
          .from("collection_recipes")
          .select("release_id")
          .eq("recipe_id", recipeId)
          .in("release_id", activeReleaseIds)
          .limit(1);

        if (matchedRecipes && matchedRecipes.length > 0) {
          return { type: "entitled", releaseId: matchedRecipes[0].release_id };
        }
      }
    }
  }

  return { type: "denied" };
}
