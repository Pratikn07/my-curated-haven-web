import "server-only";
import type { Result } from "../contracts";
import { adminRpc } from "../rpc";
import { createClient } from "../../supabase/server";
import type {
  CatalogPage, CollectionCommand, CollectionDetail, CollectionHistoryPage, CollectionLibrary, CollectionQuery, CollectionSnapshot,
  DraftControl, DraftResult, SaveCollectionCommand,
} from "./contracts";
import {
  decodeCatalogPage, decodeCollectionDetail, decodeCollectionHistory, decodeCollectionLibrary, decodeDraftResult,
} from "./decode";
import { controlWire, createWire, saveWire, startWire } from "./wire";

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

export async function loadCollectionDetail(id: string): Promise<Result<CollectionDetail>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_collection_detail", { p_collection_id: id }),
    strict(decodeCollectionDetail), true);
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
