import "server-only";
import type {
  AdminContext,
  ContextResult,
  HistoryPage,
  LibraryQuery,
  LibraryResult,
  RecipeDetail,
  Usage,
} from "./contracts";
import { adminRpc } from "./rpc";
import { createClient } from "../supabase/server";
import { decodeAdminRecipeOperations } from "./receipts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeContext(data: unknown): AdminContext {
  if (!isRecord(data)) throw new Error("bad context");
  const stage = data["stage"];
  const operator = data["operator"];
  const assurance = data["assurance"];
  if (stage !== "disabled" && stage !== "inspection" && stage !== "editing" && stage !== "publication") {
    throw new Error("bad stage");
  }
  if (!isRecord(operator) || typeof operator["id"] !== "string" || typeof operator["email"] !== "string") {
    throw new Error("bad operator");
  }
  if (assurance !== "aal1" && assurance !== "aal2") throw new Error("bad assurance");
  // Older databases omit collectionStage; treat that as collections switched off.
  const collectionStage = data["collectionStage"] ?? "disabled";
  if (collectionStage !== "disabled" && collectionStage !== "inspection" && collectionStage !== "editing"
    && collectionStage !== "publication") {
    throw new Error("bad collection stage");
  }
  return { ...(data as unknown as AdminContext), collectionStage };
}

function decodeLibrary(data: unknown): LibraryResult {
  if (!isRecord(data) || !Array.isArray(data["rows"])) throw new Error("bad library");
  return data as unknown as LibraryResult;
}

function decodeDetail(data: unknown): RecipeDetail {
  if (!isRecord(data) || !isRecord(data["active"])) throw new Error("bad detail");
  return data as unknown as RecipeDetail;
}

function decodeHistory(data: unknown): HistoryPage {
  if (!isRecord(data) || !Array.isArray(data["events"])) throw new Error("bad history");
  return data as unknown as HistoryPage;
}

export async function getAdminContext(): Promise<ContextResult> {
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return { ok: false, code: "AUTH_REQUIRED", reference: "admin-context-no-session" };
    }
    userId = data.user.id;
  } catch {
    return { ok: false, code: "UNAVAILABLE", reference: "admin-context-unavailable" };
  }
  if (!userId) {
    return { ok: false, code: "AUTH_REQUIRED", reference: "admin-context-no-session" };
  }
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_console_context"), decodeContext);
}

export async function loadAdminLibrary(query: LibraryQuery) {
  const supabase = await createClient();
  return adminRpc(
    () =>
      supabase.rpc("admin_recipe_list", {
        p_query: JSON.parse(JSON.stringify(query)) as never,
      }),
    decodeLibrary,
  );
}

export async function loadAdminRecipe(recipeId: string) {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_recipe_detail", { p_recipe_id: recipeId as never }), decodeDetail);
}

export async function loadAdminHistory(recipeId: string, cursor: string | null) {
  const supabase = await createClient();
  return adminRpc(
    () =>
      supabase.rpc("admin_recipe_history", {
        p_recipe_id: recipeId as never,
        p_cursor: cursor as never,
      }),
    decodeHistory,
  );
}

export async function loadAdminUsage(recipeId: string) {
  const supabase = await createClient();
  return adminRpc(
    () => supabase.rpc("admin_recipe_usage", { p_recipe_id: recipeId as never }),
    (data) => {
      if (!isRecord(data)) throw new Error("bad usage");
      return data as unknown as Usage;
    },
  );
}

export async function loadAdminRecipeOperations(recipeId: string) {
  const supabase = await createClient();
  return adminRpc(
    () => supabase.rpc("admin_recipe_operations", { p_recipe_id: recipeId as never }),
    (data) => decodeAdminRecipeOperations(data, recipeId)
  );
}
