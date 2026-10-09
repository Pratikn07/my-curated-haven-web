import "server-only";
import type { Result } from "../contracts";
import { adminRpc } from "../rpc";
import { createClient } from "../../supabase/server";
import type {
  CatalogPage, CollectionCommand, CollectionDetail, CollectionHistoryPage, CollectionLibrary, CollectionQuery, CollectionSnapshot,
  CollectionReceipt, CollectionReceiptLog, DraftControl, DraftResult, IssueCollectionCommand, PublishCollectionCommand,
  ReviewCollectionCommand, SaveCollectionCommand, SubmitCollectionCommand, UndecidedAccess,
} from "./contracts";
import {
  decodeCatalogPage, decodeCollectionDetail, decodeCollectionHistory, decodeCollectionLibrary, decodeDraftResult,
  decodeImpactResult, decodeReceipt, decodeReceiptLog, decodeUndecidedAccess,
} from "./decode";
import { controlWire, createWire, issueWire, publishWire, reviewWire, saveWire, startWire, submitWire } from "./wire";
import { collectionReadiness } from "./readiness";
import covers from "@/config/collection-covers.json";
import type { CollectionImpact, CoverAsset } from "./contracts";

/** Turns a strict decoder Result into adminRpc's throw-on-invalid decoder, so bad shapes become UNAVAILABLE. */
function strict<T>(decode: (data: unknown) => Result<T>): (data: unknown) => T {
  return (data) => {
    const decoded = decode(data);
    if (!decoded.ok) throw new Error("collection response did not match its contract");
    return decoded.value;
  };
}

export async function loadCollectionLibrary(query: CollectionQuery): Promise<Result<CollectionLibrary>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_collection_library", { p_query: JSON.parse(JSON.stringify(query)) }),
    strict(decodeCollectionLibrary), true);
}

export const COLLECTION_COVERS = covers as CoverAsset[];

/** Detail with readiness recomputed here so the cover check uses this deployment's cover manifest. */
export async function loadCollectionDetail(id: string): Promise<Result<CollectionDetail>> {
  const supabase = await createClient();
  const detail = await adminRpc(() => supabase.rpc("admin_collection_detail", { p_collection_id: id }),
    strict(decodeCollectionDetail), true);
  if (!detail.ok || !detail.value.working) return detail;
  return { ok: true, value: { ...detail.value,
    readiness: collectionReadiness(detail.value.working, detail.value.impact, COLLECTION_COVERS) } };
}

export async function loadCollectionImpact(collectionId: string, revisionId: string): Promise<Result<CollectionImpact>> {
  const supabase = await createClient();
  const outer = await adminRpc(() => supabase.rpc("admin_collection_impact", { p_collection_id: collectionId,
    p_revision_id: revisionId }), strict(decodeImpactResult), true);
  return outer.ok ? outer.value : outer;
}

export async function loadCollectionHistory(id: string, cursor: string | null): Promise<Result<CollectionHistoryPage>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_collection_history", { p_collection_id: id, p_cursor: cursor ?? undefined }),
    strict(decodeCollectionHistory), true);
}

export async function listCollectionRecipes(query: { q: string; page: number }): Promise<Result<CatalogPage>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_collection_catalog", { p_query: { q: query.q.slice(0, 200), page: query.page } }),
    strict(decodeCatalogPage), true);
}

// Writes retry only on lock timeouts and dropped transport: every command carries an operation id,
// so a replay returns the committed result instead of writing twice.
export async function createCollection(input: CollectionCommand & { snapshot: CollectionSnapshot }): Promise<Result<DraftResult>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_collection_create", { p_command: createWire(input) }), strict(decodeDraftResult), true);
}

export async function startCollectionDraft(input: CollectionCommand): Promise<Result<DraftResult>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_collection_draft_start", { p_command: startWire(input) }), strict(decodeDraftResult), true);
}

export async function saveCollectionDraft(input: SaveCollectionCommand): Promise<Result<DraftResult>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_collection_draft_save", { p_command: saveWire(input) }), strict(decodeDraftResult), true);
}

export async function controlCollectionDraft(input: DraftControl): Promise<Result<DraftResult>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_collection_draft_control", { p_command: controlWire(input) }), strict(decodeDraftResult), true);
}

export async function submitCollection(input: SubmitCollectionCommand): Promise<Result<DraftResult>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_collection_submit", { p_command: submitWire(input) }), strict(decodeDraftResult), true);
}

export async function raiseCollectionIssue(input: IssueCollectionCommand): Promise<Result<DraftResult>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_collection_issue", { p_command: issueWire(input) }), strict(decodeDraftResult), true);
}

export async function reviewCollection(input: ReviewCollectionCommand): Promise<Result<DraftResult>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_collection_review", { p_command: reviewWire(input) }), strict(decodeDraftResult), true);
}

export async function publishCollection(input: PublishCollectionCommand): Promise<Result<CollectionReceipt>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_collection_publish", { p_command: publishWire(input) }), strict(decodeReceipt), true);
}

/** Buyer groups (origin release and access source) whose additions decision must be made at publication. */
export async function loadUndecidedAccess(collectionId: string): Promise<Result<UndecidedAccess[]>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_collection_access_decisions", { p_collection_id: collectionId }),
    strict(decodeUndecidedAccess), true);
}

/** Recent publication receipts with their current public refresh state (newest first) and the active base. */
export async function loadCollectionReceipts(collectionId: string): Promise<Result<CollectionReceiptLog>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_collection_receipts", { p_collection_id: collectionId }),
    strict(decodeReceiptLog), true);
}
