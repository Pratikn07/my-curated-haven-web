import "server-only";
import { getCommercePool } from "./repository";
import type { CheckoutExpectation } from "./types";

export type ReservedOrder = {
  id: string;
  supportReference: string;
  offerId: string;
  releaseId: string;
  snapshot: Record<string, unknown>;
  attemptState: string;
  sessionId: string | null;
  checkoutUrl: string | null;
  idempotencyKey: string;
};

export type Reservation =
  | { state: "reserved" | "existing"; order: ReservedOrder }
  | { state: "owned" }
  | { state: "unavailable" }
  | { state: "review_required" }
  | { state: "stale"; expected: CheckoutExpectation | null };

function isExpectation(value: unknown): value is CheckoutExpectation {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (v.publicationId === null || typeof v.publicationId === "string") && typeof v.releaseId === "string"
    && typeof v.offerId === "string" && typeof v.manifestHash === "string" && typeof v.sourceDigest === "string";
}

function isOrder(value: unknown): value is ReservedOrder {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.supportReference === "string" && typeof o.offerId === "string"
    && typeof o.releaseId === "string" && typeof o.snapshot === "object" && o.snapshot !== null
    && typeof o.attemptState === "string" && typeof o.idempotencyKey === "string"
    && (o.sessionId === null || typeof o.sessionId === "string") && (o.checkoutUrl === null || typeof o.checkoutUrl === "string");
}

/**
 * Reserve (or reuse) the buyer's order for a collection in one locked transaction. The database checks
 * that `expected` still matches what is on sale and freezes the full terms into the order.
 */
export async function reserveCollectionOrder(userId: string, collectionId: string,
  expected: CheckoutExpectation | null, idempotencyKey: string): Promise<Reservation> {
  const { rows } = await getCommercePool().query(
    "SELECT private.reserve_collection_order($1, $2, $3::jsonb, $4) AS reservation",
    [userId, collectionId, expected ? JSON.stringify(expected) : null, idempotencyKey]);
  const r = rows[0]?.reservation as { state?: unknown; order?: unknown; expected?: unknown } | undefined;
  if ((r?.state === "reserved" || r?.state === "existing") && isOrder(r.order)) return { state: r.state, order: r.order };
  if (r?.state === "owned") return { state: "owned" };
  if (r?.state === "unavailable") return { state: "unavailable" };
  if (r?.state === "review_required") return { state: "review_required" };
  if (r?.state === "stale") return { state: "stale", expected: isExpectation(r.expected) ? r.expected : null };
  throw new Error("Unexpected collection reservation response");
}

/** The current checkout expectation for a collection, or null when nothing is on sale. */
export async function loadCheckoutExpectation(collectionId: string): Promise<CheckoutExpectation | null> {
  const { rows } = await getCommercePool().query(
    "SELECT private.collection_sellable($1) - 'offer' - 'memberIds' AS expected", [collectionId]);
  const expected = rows[0]?.expected;
  return isExpectation(expected) ? expected : null;
}

export async function findCollectionIdBySlug(slug: string): Promise<string | null> {
  const { rows } = await getCommercePool().query("SELECT id FROM public.recipe_collections WHERE slug=$1", [slug]);
  return (rows[0]?.id as string | undefined) ?? null;
}
