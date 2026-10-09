"use server";

import { createClient } from "@/lib/supabase/server";
import {
  listAdminAssets,
  verifyAdminAsset,
} from "@/lib/admin/assets";
import {
  loadAdminImpact,
  loadAdminRevision,
  loadReviewState,
  publishAdminRevision,
  rebaseAdminDraft,
  recordAdminIssue,
  reviewAdminRevision,
  saveAdminDraft,
  startAdminDraft,
  submitAdminRevision,
  withdrawAdminRecipe,
} from "@/lib/admin/recipes";
import { publishRecipeCorrection } from "@/lib/admin/recipe-corrections";
import { retryAdminRefresh } from "@/lib/admin/refresh";
import { loadAdminHistory, loadAdminRecipe, loadAdminRecipeOperations } from "@/lib/admin/context";
import { adminRpc } from "@/lib/admin/rpc";
import type {
  Base,
  DraftCommand,
  Operation,
  PublishCommand,
  RecipeCorrectionCommand,
  RefreshReceipt,
  ReviewCommand,
  StaffRow,
  WithdrawCommand,
} from "@/lib/admin/contracts";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function listStaff() {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_staff_list"), (data): StaffRow[] => {
    if (!Array.isArray(data) || data.some((row) =>
      typeof row !== "object" || row === null || Array.isArray(row) ||
      typeof row.userId !== "string" || typeof row.email !== "string" ||
      !Array.isArray(row.roles) || typeof row.active !== "boolean")) {
      throw new Error("Invalid staff list");
    }
    return data as StaffRow[];
  });
}

export async function lookupStaff(email: string) {
  const supabase = await createClient();
  const normalized = email.trim().slice(0, 320);
  const { data, error } = await supabase.rpc("admin_staff_lookup", { p_email: normalized });
  if (error) return { ok: false as const, code: "UNAVAILABLE" as const, reference: "staff-lookup" };
  const status = (data as { status?: string })?.status;
  if (status === "found") {
    return { ok: true as const, value: data as { status: "found"; match: { userId: string; email: string } } };
  }
  return {
    ok: true as const,
    value: data as { status: "not_found" | "unconfirmed" | "ambiguous" },
  };
}

export async function assignStaff(input: { userId: string; roles: string[]; reason: string; operationId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_staff_assign", {
    p_user_id: input.userId,
    p_roles: input.roles,
    p_reason: input.reason,
    p_operation_id: input.operationId,
  });
  if (error) return { ok: false as const, code: "UNAVAILABLE" as const, reference: "staff-assign" };
  return { ok: true as const, value: data };
}

export async function revokeStaff(input: { userId: string; reason: string; operationId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_staff_revoke", {
    p_user_id: input.userId,
    p_reason: input.reason,
    p_operation_id: input.operationId,
  });
  if (error) return { ok: false as const, code: "UNAVAILABLE" as const, reference: "staff-revoke" };
  return { ok: true as const, value: data };
}

export async function startDraftAction(recipeId: string, operationId: string) {
  if (!isUuid(recipeId) || !isUuid(operationId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "draft-start" };
  }
  return startAdminDraft(recipeId, operationId);
}

export async function saveDraftAction(input: DraftCommand) {
  if (!isUuid(input.recipeId) || !isUuid(input.operationId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "draft-save" };
  }
  return saveAdminDraft(input);
}

export async function rebaseDraftAction(input: DraftCommand & { newBase: Base }) {
  if (!isUuid(input.recipeId) || !isUuid(input.operationId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "draft-rebase" };
  }
  return rebaseAdminDraft(input);
}

export async function loadRevisionAction(recipeId: string, revisionId: string) {
  if (!isUuid(recipeId) || !isUuid(revisionId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "draft-revision" };
  }
  return loadAdminRevision(recipeId, revisionId);
}

export async function refreshDraftAction(recipeId: string) {
  if (!isUuid(recipeId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "draft-refresh" };
  }
  const detail = await loadAdminRecipe(recipeId);
  if (!detail.ok) return detail;
  return detail;
}

export async function listAssetsAction() {
  return listAdminAssets();
}

export async function verifyAssetAction(recipeId: string, revisionId: string) {
  if (!isUuid(recipeId) || !isUuid(revisionId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "asset-verify" };
  }
  return verifyAdminAsset(recipeId, revisionId);
}

export async function submitRevisionAction(input: Operation & {
  revisionId: string;
  expectedVersion: number;
  expectedDigest: string;
}) {
  if (!isUuid(input.recipeId) || !isUuid(input.operationId) || !isUuid(input.revisionId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "revision-submit" };
  }
  return submitAdminRevision(input);
}

export async function recordIssueAction(input: Operation & {
  revisionId: string;
  expectedDigest: string;
  code: string;
  field: string | null;
  severity: "blocker" | "suggestion";
  explanation: string;
}) {
  if (!isUuid(input.recipeId) || !isUuid(input.operationId) || !isUuid(input.revisionId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "revision-issue" };
  }
  return recordAdminIssue(input);
}

export async function reviewRevisionAction(input: ReviewCommand) {
  if (
    !isUuid(input.recipeId) ||
    !isUuid(input.operationId) ||
    !isUuid(input.revisionId) ||
    !isUuid(input.submissionId)
  ) {
    return { ok: false as const, code: "INVALID" as const, reference: "revision-review" };
  }
  return reviewAdminRevision(input);
}

export async function loadReviewStateAction(revisionId: string) {
  if (!isUuid(revisionId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "review-state" };
  }
  return loadReviewState(revisionId);
}

export async function loadImpactAction(recipeId: string) {
  if (!isUuid(recipeId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "impact" };
  }
  return loadAdminImpact(recipeId);
}

export async function loadRecipeOperationsAction(recipeId: string) {
  if (!isUuid(recipeId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "recipe-operations" };
  }
  return loadAdminRecipeOperations(recipeId);
}

export async function loadHistoryAction(recipeId: string, cursor: string) {
  if (!isUuid(recipeId) || !/^[0-9a-f]{2,256}$/.test(cursor) || cursor.length % 2 !== 0) {
    return { ok: false as const, code: "INVALID" as const, reference: "recipe-history" };
  }
  return loadAdminHistory(recipeId, cursor);
}

export async function publishRevisionAction(input: PublishCommand) {
  if (!isUuid(input.recipeId) || !isUuid(input.operationId) || !isUuid(input.revisionId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "revision-publish" };
  }
  return publishAdminRevision(input);
}

export async function publishRecipeCorrectionAction(input: RecipeCorrectionCommand) {
  if (!isUuid(input.recipeId) || !isUuid(input.operationId) || !isUuid(input.revisionId)
    || input.correctionKind !== "same_recipe" || input.acknowledgeGlobalImpact !== true) {
    return { ok: false as const, code: "INVALID" as const, reference: "recipe-correct" };
  }
  return publishRecipeCorrection(input);
}

export async function withdrawRecipeAction(input: WithdrawCommand) {
  if (!isUuid(input.recipeId) || !isUuid(input.operationId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "recipe-withdraw" };
  }
  return withdrawAdminRecipe(input);
}

/**
 * Display refresh straight after a committed command. It runs the same checks as a retry: aal2 staff, an
 * operation of this recipe, and paths read from the database rather than sent by the browser.
 */
export async function refreshRecipeAction(receipt: { operationId: string; recipeId: string }): Promise<RefreshReceipt> {
  const pending = { operationId: String(receipt.operationId), state: "pending" as const };
  if (!isUuid(receipt.operationId) || !isUuid(receipt.recipeId)) return pending;
  const refreshed = await retryAdminRefresh(receipt.operationId, receipt.recipeId);
  return refreshed.ok ? refreshed.value : pending;
}

export async function retryRefreshAction(operationId: string, recipeId: string) {
  if (!isUuid(operationId) || !isUuid(recipeId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "refresh-retry" };
  }
  return retryAdminRefresh(operationId, recipeId);
}

export async function recordFailureAction(input: {
  action: string;
  target: string | null;
  operationId: string;
  code: string;
}) {
  if (!isUuid(input.operationId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "failure-audit" };
  }
  if (!/^[a-z.]{1,80}$/.test(input.action) || !/^[A-Z_]{1,40}$/.test(input.code)) {
    return { ok: false as const, code: "INVALID" as const, reference: "failure-audit" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isUuid(user.id)) {
    return { ok: false as const, code: "AUTH_REQUIRED" as const, reference: "failure-audit" };
  }
  if (input.target !== null && !isUuid(input.target)) {
    return { ok: false as const, code: "INVALID" as const, reference: "failure-audit" };
  }
  try {
    const { Client } = await import("pg");
    const pg = new Client({ connectionString: process.env.COMMERCE_DATABASE_URL });
    await pg.connect();
    try {
      await pg.query("SELECT private.admin_record_failure($1,$2,$3,$4,$5,$6)", [
        user.id,
        input.action,
        input.target,
        input.operationId,
        input.code,
        "admin-console",
      ]);
    } finally {
      await pg.end();
    }
  } catch {
    return { ok: false as const, code: "UNAVAILABLE" as const, reference: "failure-audit" };
  }
  return { ok: true as const, value: { recorded: true } };
}
