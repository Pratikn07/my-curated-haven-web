"use server";

import { createClient } from "@/lib/supabase/server";
import {
  loadAdminRevision,
  rebaseAdminDraft,
  saveAdminDraft,
  startAdminDraft,
} from "@/lib/admin/recipes";
import { listAdminAssets, verifyAdminAsset } from "@/lib/admin/assets";
import { loadAdminRecipe } from "@/lib/admin/context";
import type { Base, DraftCommand, Revision } from "@/lib/admin/contracts";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
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

export async function verifyAssetAction(revision: Revision) {
  if (!isUuid(revision.id) || !isUuid(revision.recipeId)) {
    return { ok: false as const, code: "INVALID" as const, reference: "asset-verify" };
  }
  return verifyAdminAsset(revision);
}
