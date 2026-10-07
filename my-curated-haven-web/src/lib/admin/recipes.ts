import "server-only";
import type {
  Base,
  DraftCommand,
  LibraryQuery,
  MutationReceipt,
  Operation,
  PublishCommand,
  Result,
  Revision,
  ReviewCommand,
  Usage,
  WithdrawCommand,
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

export async function submitAdminRevision(
  input: Operation & { revisionId: string; expectedVersion: number; expectedDigest: string }
): Promise<Result<Revision>> {
  const supabase = await createClient();
  return adminRpc(
    () =>
      supabase.rpc("admin_revision_submit", {
        p_command: {
          operation_id: input.operationId,
          recipe_id: input.recipeId,
          reason: input.reason,
          revision_id: input.revisionId,
          expected_version: input.expectedVersion,
          expected_digest: input.expectedDigest,
        } as never,
      }),
    decodeRevision
  );
}

export async function recordAdminIssue(
  input: Operation & {
    revisionId: string;
    expectedDigest: string;
    code: string;
    field: string | null;
    severity: "blocker" | "suggestion";
    explanation: string;
  }
): Promise<Result<{ issueId: string }>> {
  const supabase = await createClient();
  return adminRpc(
    () =>
      supabase.rpc("admin_revision_issue", {
        p_command: {
          operation_id: input.operationId,
          recipe_id: input.recipeId,
          reason: input.reason,
          revision_id: input.revisionId,
          expected_digest: input.expectedDigest,
          code: input.code,
          field: input.field,
          severity: input.severity,
          explanation: input.explanation,
        } as never,
      }),
    (data) => {
      if (!isRecord(data) || typeof data["issueId"] !== "string") throw new Error("bad issue");
      return { issueId: data["issueId"] as string };
    }
  );
}

export async function reviewAdminRevision(
  input: ReviewCommand
): Promise<Result<MutationReceipt>> {
  const supabase = await createClient();
  return adminRpc(
    () =>
      supabase.rpc("admin_revision_review", {
        p_command: {
          operation_id: input.operationId,
          recipe_id: input.recipeId,
          reason: input.reason,
          revision_id: input.revisionId,
          expected_version: input.expectedVersion,
          expected_digest: input.expectedDigest,
          submission_id: input.submissionId,
          decision: input.decision,
          resolved_issue_ids: input.resolvedIssueIds,
        } as never,
      }),
    decodeReceipt
  );
}

export interface ReviewIssue {
  id: string;
  code: string;
  field: string | null;
  severity: "blocker" | "suggestion";
  origin: string;
  explanation: string;
  createdBy: string;
  createdAt: string;
  resolved: boolean;
}

export interface ReviewState {
  submission: {
    id: string;
    digest: string;
    version: number;
    submittedBy: string;
    submittedAt: string;
  } | null;
  decisions: {
    decision: string;
    reviewer: string;
    reason: string;
    decidedAt: string;
    submissionId: string;
  }[];
  issues: ReviewIssue[];
}

export async function loadReviewState(revisionId: string): Promise<Result<ReviewState>> {
  const supabase = await createClient();
  return adminRpc(
    () => supabase.rpc("admin_review_state", { p_revision_id: revisionId as never }),
    (data) => {
      if (!isRecord(data) || !Array.isArray(data["issues"])) throw new Error("bad review state");
      return data as unknown as ReviewState;
    }
  );
}

export async function loadAdminImpact(
  recipeId: string
): Promise<Result<{ usage: Usage; base: Base; impactToken: string; checkedAt: string }>> {
  const supabase = await createClient();
  return adminRpc(
    () => supabase.rpc("admin_recipe_impact", { p_recipe_id: recipeId as never }),
    (data) => {
      if (!isRecord(data) || typeof data["impactToken"] !== "string") {
        throw new Error("bad impact");
      }
      return data as unknown as {
        usage: Usage;
        base: Base;
        impactToken: string;
        checkedAt: string;
      };
    }
  );
}

export async function publishAdminRevision(
  input: PublishCommand
): Promise<Result<MutationReceipt>> {
  const supabase = await createClient();
  return adminRpc(
    () =>
      supabase.rpc("admin_revision_publish", {
        p_command: {
          operation_id: input.operationId,
          recipe_id: input.recipeId,
          reason: input.reason,
          revision_id: input.revisionId,
          expected_version: input.expectedVersion,
          expected_digest: input.expectedDigest,
          base: {
            content_version: input.base.contentVersion,
            active_hash: input.base.activeHash,
          },
          impact_token: input.impactToken,
        } as never,
      }),
    decodeReceipt
  );
}

export async function withdrawAdminRecipe(
  input: WithdrawCommand
): Promise<Result<MutationReceipt>> {
  const supabase = await createClient();
  return adminRpc(
    () =>
      supabase.rpc("admin_recipe_withdraw", {
        p_command: {
          operation_id: input.operationId,
          recipe_id: input.recipeId,
          reason: input.reason,
          base: {
            content_version: input.base.contentVersion,
            active_hash: input.base.activeHash,
          },
          emergency: input.emergency,
          acknowledge_promise_impact: input.acknowledgePromiseImpact,
        } as never,
      }),
    decodeReceipt
  );
}
