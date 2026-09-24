import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export type AccessStatus =
  | { type: "free"; slot: number }
  | { type: "entitled"; releaseId: string }
  | { type: "denied" }
  | { type: "not_found" }
  | { type: "error"; message: string };

function isMissingSession(error: { name?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.name === "AuthSessionMissingError" ||
    message.includes("auth session missing") ||
    message.includes("session missing")
  );
}

/**
 * Authoritative access check evaluating database constraints and user grants.
 */
export async function checkRecipeAccess(
  client: SupabaseClient<Database>,
  recipeId: string
): Promise<AccessStatus> {
  try {
    return await resolveRecipeAccess(client, recipeId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Recipe access check failed";
    return { type: "error", message };
  }
}

async function resolveRecipeAccess(
  client: SupabaseClient<Database>,
  recipeId: string
): Promise<AccessStatus> {
  // 1. Verify existence in published catalog
  const { data: catalog, error: catalogError } = await client
    .from("recipe_catalog")
    .select("id")
    .eq("id", recipeId)
    .maybeSingle();

  if (catalogError) {
    return { type: "error", message: catalogError.message };
  }

  if (!catalog) {
    return { type: "not_found" };
  }

  // 2. Check if recipe occupies an active free slot
  const { data: freeSlot, error: freeSlotError } = await client
    .from("free_recipe_slots")
    .select("slot")
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (freeSlotError) {
    return { type: "error", message: freeSlotError.message };
  }

  if (freeSlot) {
    return { type: "free", slot: freeSlot.slot };
  }

  // 3. Identity comes from the verified session, never from a caller-supplied user id
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError && !isMissingSession(userError)) {
    return { type: "error", message: userError.message };
  }

  const user = userData.user;
  if (!user) {
    return { type: "denied" };
  }

  const { data: entitlements, error: entitlementError } = await client
    .from("access_entitlements")
    .select("id, release_id, state, valid_from, expires_at, revoked_at")
    .eq("user_id", user.id)
    .eq("state", "active")
    .is("revoked_at", null);

  if (entitlementError) {
    return { type: "error", message: entitlementError.message };
  }

  if (!entitlements || entitlements.length === 0) {
    return { type: "denied" };
  }

  const activeReleaseIds = entitlements
    .filter((e) => {
      const now = new Date();
      const validFrom = new Date(e.valid_from);
      if (validFrom > now) return false;
      if (e.expires_at && new Date(e.expires_at) <= now) return false;
      return true;
    })
    .map((e) => e.release_id);

  if (activeReleaseIds.length === 0) {
    return { type: "denied" };
  }

  const { data: matchedRecipes, error: membershipError } = await client
    .from("collection_recipes")
    .select("release_id")
    .eq("recipe_id", recipeId)
    .in("release_id", activeReleaseIds)
    .limit(1);

  if (membershipError) {
    return { type: "error", message: membershipError.message };
  }

  if (matchedRecipes && matchedRecipes.length > 0) {
    return { type: "entitled", releaseId: matchedRecipes[0].release_id };
  }

  return { type: "denied" };
}
