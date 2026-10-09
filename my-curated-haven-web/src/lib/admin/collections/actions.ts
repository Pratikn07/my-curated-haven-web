"use server";

import type {
  CollectionCommand, CollectionSnapshot, DraftControl, IssueCollectionCommand, PublishCollectionCommand, ReviewCollectionCommand,
  SaveCollectionCommand, SubmitCollectionCommand,
} from "./contracts";
import {
  controlCollectionDraft, createCollection, listCollectionRecipes, loadCollectionDetail, loadCollectionHistory,
  publishCollection, raiseCollectionIssue, reviewCollection, saveCollectionDraft, startCollectionDraft, submitCollection,
} from "./repository";
import { refreshCollectionPublication, retryCollectionRefresh } from "./refresh";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Cursor issued by admin_collection_history: "<timestamptz>|<audit uuid>".
const CURSOR = /^[0-9T:.+\- ]{10,40}\|[0-9a-f-]{36}$/i;

export async function loadCollectionHistoryAction(collectionId: string, cursor: string) {
  if (!UUID.test(collectionId) || !CURSOR.test(cursor)) {
    return { ok: false as const, code: "INVALID" as const, reference: "collection-history" };
  }
  return loadCollectionHistory(collectionId, cursor);
}

function invalid(reference: string) {
  return { ok: false as const, code: "INVALID" as const, reference };
}

function validCommand(input: CollectionCommand): boolean {
  return UUID.test(input.collectionId) && UUID.test(input.operationId)
    && typeof input.reason === "string" && input.reason.trim().length > 0 && input.reason.length <= 1000;
}

export async function createCollectionAction(input: CollectionCommand & { snapshot: CollectionSnapshot }) {
  if (!validCommand(input) || input.snapshot?.collectionId !== input.collectionId) return invalid("collection-create");
  return createCollection(input);
}

export async function startCollectionDraftAction(input: CollectionCommand) {
  if (!validCommand(input)) return invalid("collection-start");
  return startCollectionDraft(input);
}

export async function saveCollectionDraftAction(input: SaveCollectionCommand) {
  if (!validCommand(input) || input.snapshot?.collectionId !== input.collectionId) return invalid("collection-save");
  return saveCollectionDraft(input);
}

export async function controlCollectionDraftAction(input: DraftControl) {
  if (!validCommand(input) || !["rebase", "copy_publication", "discard"].includes(input.action)
    || (input.referenceId !== null && !UUID.test(input.referenceId))) return invalid("collection-control");
  return controlCollectionDraft(input);
}

export async function listCollectionRecipesAction(q: string, page: number) {
  if (typeof q !== "string" || !Number.isInteger(page) || page < 1 || page > 1000) return invalid("collection-catalog");
  return listCollectionRecipes({ q, page });
}

export async function loadCollectionDetailAction(collectionId: string) {
  if (!UUID.test(collectionId)) return invalid("collection-detail");
  return loadCollectionDetail(collectionId);
}

function validExact(input: CollectionCommand & { revisionId: string; expectedVersion: number; expectedDigest: string }): boolean {
  return validCommand(input) && UUID.test(input.revisionId) && Number.isInteger(input.expectedVersion)
    && /^[0-9a-f]{64}$/.test(input.expectedDigest);
}

/** Readiness recomputed here (including the cover manifest) for exactly the revision being acted on. */
async function readyForApproval(collectionId: string, revisionId: string): Promise<{ ok: true } | { ok: false; code: "BLOCKED" | "CONFLICT" | "UNAVAILABLE"; reference: string }> {
  const detail = await loadCollectionDetail(collectionId);
  if (!detail.ok) return { ok: false, code: "UNAVAILABLE", reference: detail.reference };
  if (detail.value.working?.id !== revisionId) return { ok: false, code: "CONFLICT", reference: "collection-stale-revision" };
  if (!detail.value.readiness.readyForApproval) return { ok: false, code: "BLOCKED", reference: "collection-not-ready" };
  return { ok: true };
}

export async function submitCollectionAction(input: SubmitCollectionCommand) {
  if (!validExact(input) || typeof input.impactToken !== "string") return invalid("collection-submit");
  const ready = await readyForApproval(input.collectionId, input.revisionId);
  if (!ready.ok) return ready;
  return submitCollection(input);
}

export async function raiseCollectionIssueAction(input: IssueCollectionCommand) {
  if (!validExact(input) || !["blocker", "suggestion"].includes(input.severity) || !/^[A-Z][A-Z0-9_]{1,63}$/.test(input.code)
    || typeof input.explanation !== "string" || input.explanation.trim().length === 0) return invalid("collection-issue");
  return raiseCollectionIssue(input);
}

export async function reviewCollectionAction(input: ReviewCollectionCommand) {
  if (!validExact(input) || !UUID.test(input.submissionId) || !["approve", "changes_requested", "reject"].includes(input.decision)
    || !Array.isArray(input.resolvedIssueIds) || !input.resolvedIssueIds.every((id) => UUID.test(id))) return invalid("collection-review");
  if (input.decision === "approve") {
    const ready = await readyForApproval(input.collectionId, input.revisionId);
    if (!ready.ok) return ready;
  }
  return reviewCollection(input);
}

/**
 * Owner one-step (approveNow) or separated publisher (an existing approval). The public refresh runs straight
 * after the commit; if it fails the receipt still reports the committed publication, with refresh pending.
 */
export async function approveAndPublishCollection(input: PublishCollectionCommand) {
  if (!validExact(input) || typeof input.impactToken !== "string" || typeof input.approveNow !== "boolean"
    || !input.base || !(input.base.publicationId === null || UUID.test(input.base.publicationId))
    || !Array.isArray(input.accessDecisions) || !input.accessDecisions.every((d) => UUID.test(d.releaseId)
      && typeof d.sourceKind === "string" && (d.policy === "additions-v1" || d.policy === "original-only"))) {
    return invalid("collection-publish");
  }
  const ready = await readyForApproval(input.collectionId, input.revisionId);
  // A commit closes the draft, so a retry of a committed command reads as stale here. The database replays
  // that operation's receipt (same id and payload) and refuses anything else, so it is still asked.
  if (!ready.ok && ready.code !== "CONFLICT") return ready;
  const published = await publishCollection(input);
  if (!published.ok) return ready.ok ? published : ready;
  const refresh = await refreshCollectionPublication(published.value);
  return { ok: true as const, value: { ...published.value, refreshState: refresh.state } };
}

export async function retryCollectionRefreshAction(collectionId: string, operationId: string) {
  if (!UUID.test(collectionId) || !UUID.test(operationId)) return invalid("collection-refresh");
  return retryCollectionRefresh(collectionId, operationId);
}
