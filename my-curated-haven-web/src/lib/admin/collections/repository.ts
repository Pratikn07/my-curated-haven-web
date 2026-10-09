import "server-only";
import type { Result } from "../contracts";
import { adminRpc } from "../rpc";
import { createClient } from "../../supabase/server";
import type { CollectionDetail, CollectionHistoryPage, CollectionLibrary, CollectionQuery } from "./contracts";
import { decodeCollectionDetail, decodeCollectionHistory, decodeCollectionLibrary } from "./decode";

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
