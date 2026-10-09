"use server";

import type { CollectionCommand, CollectionSnapshot, DraftControl, SaveCollectionCommand } from "./contracts";
import {
  controlCollectionDraft, createCollection, loadCollectionHistory, saveCollectionDraft, startCollectionDraft,
} from "./repository";

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
