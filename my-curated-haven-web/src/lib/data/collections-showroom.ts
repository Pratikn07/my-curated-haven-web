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

/**
 * The live offer for a slug, or null. The commerce database is not deployed
 * everywhere yet, so an unavailable database reads as "no offer" (R8-05).
 */
export async function loadLiveOffer(slug: string, userId?: string | null): Promise<CollectionOfferDto | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  try {
    return await getCollectionOfferDetails(slug, userId);
  } catch (error) {
    console.error("[collections] offer unavailable", error instanceof Error ? error.message : error);
    return null;
  }
}
