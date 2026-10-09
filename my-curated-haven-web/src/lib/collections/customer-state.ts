import "server-only";
import type { Result } from "@/lib/admin/contracts";
import { getCommercePool } from "@/lib/payments/repository";

export type CollectionOwnership = "owned" | "pending_payment" | "not_owned";

/**
 * A signed-in customer's relationship to a whole collection (any release), read fresh on every request.
 * Never cache the answer in a shared or public cache. A lookup failure is UNAVAILABLE, never "not owned".
 */
export async function getCollectionCustomerState(collectionId: string, userId: string):
  Promise<Result<{ ownership: CollectionOwnership; releaseId: string | null }>> {
  try {
    const { rows } = await getCommercePool().query("SELECT private.collection_customer_state($1, $2) AS state",
      [userId, collectionId]);
    const state = rows[0]?.state as { ownership?: unknown; releaseId?: unknown } | undefined;
    if (state && (state.ownership === "owned" || state.ownership === "pending_payment" || state.ownership === "not_owned")
      && (state.releaseId === null || typeof state.releaseId === "string")) {
      return { ok: true, value: { ownership: state.ownership, releaseId: state.releaseId } };
    }
  } catch (error) {
    console.error("[collections] customer state unavailable", error instanceof Error ? error.message : error);
  }
  return { ok: false, code: "UNAVAILABLE", reference: `collection-customer-${collectionId.slice(0, 8)}` };
}
