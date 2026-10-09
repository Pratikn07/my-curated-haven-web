import { commerceDatabaseConfigured } from "@/lib/payments/database-config";
import { getCollectionOfferDetails } from "@/lib/payments/repository";
import type { CollectionOfferDto } from "@/lib/payments/types";
import { SLUG_PATTERN } from "@/lib/collections/visibility";

export {
  collectionFacts,
  getShowroomCollection,
  hasShowroomCollections,
  listOpenCollections,
  listShowroomChapters,
  listShowroomCollections,
} from "@/lib/collections/visibility";

export {
  getPublishedCollection,
  isWithheldCollection,
  listOpenPublishedCollections,
  listPublishedCollections,
  listPublishedShowroomChapters,
} from "@/lib/collections/publication";

export type LiveOffer = { ok: true; offer: CollectionOfferDto | null } | { ok: false };

/**
 * The live offer for a slug. A commerce lookup failure is { ok: false }, never "no offer": the page must
 * not infer a price, an open sale or non-ownership from an outage. A deployment without the commerce
 * database has no live offers yet, which is "no offer", not an outage.
 */
export async function loadLiveOffer(slug: string, userId?: string | null): Promise<LiveOffer> {
  if (!SLUG_PATTERN.test(slug) || !commerceDatabaseConfigured()) return { ok: true, offer: null };
  try {
    return { ok: true, offer: await getCollectionOfferDetails(slug, userId) };
  } catch (error) {
    console.error("[collections] offer unavailable", error instanceof Error ? error.message : error);
    return { ok: false };
  }
}

/** Price display only: an unavailable offer shows the configured placeholder, like a missing one. */
export function offerOrNull(live: LiveOffer): CollectionOfferDto | null {
  return live.ok ? live.offer : null;
}
