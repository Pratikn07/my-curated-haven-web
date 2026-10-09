import "server-only";
import type { AdminCode, AdminContext, LibraryQuery, LibraryView } from "../contracts";
import { loadAdminLibrary } from "../context";
import { adminRpc } from "../rpc";
import { createClient } from "../../supabase/server";
import { loadCollectionLibrary } from "../collections/repository";
import {
  collectionFeed, decodeContinueWork, decodeHomeResults, recipeFeed, type AdminHome, type AttentionFeed,
} from "./contracts";

function recipeQuery(view: LibraryView): LibraryQuery {
  return { q: "", collections: [], publication: [], review: [], view, page: 1, pageSize: 25 };
}

function unavailable(failure: { code: AdminCode; reference: string }, inventoryHref: string): AttentionFeed {
  return { state: "unavailable", code: failure.code, reference: failure.reference, inventoryHref };
}

async function recipeAttention(): Promise<AttentionFeed> {
  const [attention, review, ready] = await Promise.all([loadAdminLibrary(recipeQuery("attention")),
    loadAdminLibrary(recipeQuery("awaiting_review")), loadAdminLibrary(recipeQuery("ready"))]);
  if (!attention.ok) return unavailable(attention, "/admin/recipes");
  if (!review.ok) return unavailable(review, "/admin/recipes");
  if (!ready.ok) return unavailable(ready, "/admin/recipes");
  return recipeFeed(attention.value, review.value, ready.value);
}

async function collectionAttention(): Promise<AttentionFeed> {
  const library = await loadCollectionLibrary({ q: "", shelf: [], stage: [], status: [], draft: null, attention: true,
    page: 1, pageSize: 25 });
  return library.ok ? collectionFeed(library.value) : unavailable(library, "/admin/collections");
}

/**
 * Each lane is read only when the operator may read that domain, and independently, so one failing
 * source leaves the other useful. Results and Continue work come from narrow same-actor reads.
 */
export async function loadAdminHome(context: AdminContext): Promise<AdminHome> {
  const permissions = context.operator.permissions;
  const recipes = permissions.includes("recipe.read");
  const collections = permissions.includes("collection.read") && context.collectionStage !== "disabled";
  const canEdit = (permissions.includes("recipe.edit") || permissions.includes("collection.edit"))
    && (context.stage === "editing" || context.stage === "publication");
  const supabase = await createClient();
  const [recipeLane, collectionLane, results, continueWork] = await Promise.all([
    recipes ? recipeAttention() : Promise.resolve<AttentionFeed>({ state: "unauthorised" }),
    collections ? collectionAttention() : Promise.resolve<AttentionFeed>({ state: "unauthorised" }),
    adminRpc(() => supabase.rpc("admin_home_publishing_results", { p_limit: 10 }), decodeHomeResults),
    canEdit ? adminRpc(() => supabase.rpc("admin_home_continue_work", { p_limit: 10 }), decodeContinueWork)
      : Promise.resolve(null),
  ]);
  return { recipes: recipeLane, collections: collectionLane, results, continueWork };
}
