import "server-only";
import type {
  Base,
  DraftCommand,
  LibraryQuery,
  MutationReceipt,
  Result,
  Revision,
} from "./contracts";
import { adminRpc } from "./rpc";
import { createClient } from "../supabase/server";
import { loadAdminHistory, loadAdminLibrary, loadAdminRecipe } from "./context";

export { loadAdminHistory, loadAdminLibrary, loadAdminRecipe };

export async function loadAdminRecipePage(recipeId: string, query: LibraryQuery | null) {
  const detail = await loadAdminRecipe(recipeId);
  if (!detail.ok) return { detail, library: null };
  if (!query) return { detail, library: null };
  const library = await loadAdminLibrary(query);
  return { detail, library };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeRevision(data: unknown): Revision {
  if (!isRecord(data) || typeof data["id"] !== "string") return bad();
  return data as unknown as Revision;
}

function bad(): never {
  throw new Error("bad revision");
}

function decodeReceipt(data: unknown): MutationReceipt {
  if (!isRecord(data) || typeof data["operationId"] !== "string") return bad();
  return data as unknown as MutationReceipt;
}

function toDbCommand(input: DraftCommand): Record<string, unknown> {
  return {
    operation_id: input.operationId,
    recipe_id: input.recipeId,
    reason: input.reason,
    expected_version: input.expectedVersion,
    expected_digest: input.expectedDigest,
    base: {
      content_version: input.base.contentVersion,
      active_hash: input.base.activeHash,
    },
    snapshot: input.snapshot,
    reopen_reviewed: input.reopenReviewed,
  };
}

export async function startAdminDraft(
  recipeId: string,
  operationId: string
): Promise<Result<Revision>> {
  const supabase = await createClient();
  return adminRpc(
    () =>
      supabase.rpc("admin_draft_start", {
        p_recipe_id: recipeId as never,
        p_operation_id: operationId as never,
      }),
    decodeRevision
  );
}

export async function saveAdminDraft(input: DraftCommand): Promise<Result<MutationReceipt>> {
  const supabase = await createClient();
  return adminRpc(
    () => supabase.rpc("admin_draft_save", { p_command: toDbCommand(input) as never }),
    decodeReceipt
  );
}

export async function rebaseAdminDraft(
  input: DraftCommand & { newBase: Base }
): Promise<Result<MutationReceipt>> {
  const supabase = await createClient();
  const command = {
    ...toDbCommand(input),
    new_base: {
      content_version: input.newBase.contentVersion,
      active_hash: input.newBase.activeHash,
    },
  };
  return adminRpc(
    () => supabase.rpc("admin_draft_rebase", { p_command: command as never }),
    decodeReceipt
  );
}

export async function loadAdminRevision(
  recipeId: string,
  revisionId: string
): Promise<Result<Revision>> {
  const supabase = await createClient();
  return adminRpc(
    () =>
      supabase.rpc("admin_recipe_revision", {
        p_recipe_id: recipeId as never,
        p_revision_id: revisionId as never,
      }),
    decodeRevision
  );
}
