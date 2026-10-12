import "server-only";
import type { AdminCode, AdminContext, LibraryQuery, LibraryView } from "../contracts";
import { loadAdminLibrary } from "../context";
import { adminRpc } from "../rpc";
import { createClient } from "../../supabase/server";
import { loadCollectionLibrary } from "../collections/repository";
import { loadSupportQueue } from "../support/repository";
import { ACCESS_CONSEQUENCE_LABELS, QUEUE_REASONS } from "../support/labels";
import {
  collectionFeed, decodeContinueWork, decodeHomeResults, decodeSupportResults, recipeFeed, supportFeed, type AdminHome,
  type AttentionFeed,
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

async function supportAttention(): Promise<AttentionFeed> {
  const [live, test] = await Promise.all([loadSupportQueue("live", null), loadSupportQueue("test", null)]);
  if (!live.ok) return unavailable(live, "/admin/support");
  if (!test.ok) return unavailable(test, "/admin/support");
  return supportFeed(live.value, test.value, new Date().toISOString(), { reasons: QUEUE_REASONS, access: ACCESS_CONSEQUENCE_LABELS });
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
  // Support is read only for people who hold support.read now, so nothing of it reaches anyone else's page.
  const support = permissions.includes("support.read") && context.supportStage !== "disabled";
  const supabase = await createClient();
  const [recipeLane, collectionLane, results, continueWork, supportLane, supportResults] = await Promise.all([
    recipes ? recipeAttention() : Promise.resolve<AttentionFeed>({ state: "unauthorised" }),
    collections ? collectionAttention() : Promise.resolve<AttentionFeed>({ state: "unauthorised" }),
    adminRpc(() => supabase.rpc("admin_home_publishing_results", { p_limit: 10 }), decodeHomeResults),
    canEdit ? adminRpc(() => supabase.rpc("admin_home_continue_work", { p_limit: 10 }), decodeContinueWork)
      : Promise.resolve(null),
    support ? supportAttention() : Promise.resolve<AttentionFeed>({ state: "unauthorised" }),
    support ? adminRpc(() => supabase.rpc("admin_home_support_results", { p_limit: 10 }), decodeSupportResults) : Promise.resolve(null),
  ]);
  return { recipes: recipeLane, collections: collectionLane, results, continueWork, support: supportLane, supportResults };
}
