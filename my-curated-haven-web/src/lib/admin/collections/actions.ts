"use server";

import { loadCollectionHistory } from "./repository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Cursor issued by admin_collection_history: "<timestamptz>|<audit uuid>".
const CURSOR = /^[0-9T:.+\- ]{10,40}\|[0-9a-f-]{36}$/i;

export async function loadCollectionHistoryAction(collectionId: string, cursor: string) {
  if (!UUID.test(collectionId) || !CURSOR.test(cursor)) {
    return { ok: false as const, code: "INVALID" as const, reference: "collection-history" };
  }
  return loadCollectionHistory(collectionId, cursor);
}
