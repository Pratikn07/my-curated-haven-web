import type { CollectionOwnershipState, OfferSurface } from "./events";

/**
 * The data-track-offer attributes for an offer container, which ViewTracker reads to send offer_viewed.
 * Ownership, price and currency are left out where the page does not know them.
 */
export function offerAttributes(
  surface: OfferSurface,
  collectionSlug: string,
  details: { ownershipState?: CollectionOwnershipState | null; priceMinor?: number | null; currency?: string | null } = {}
): Record<string, string> {
  return {
    "data-track-offer": surface,
    "data-track-collection": collectionSlug,
    ...(details.ownershipState ? { "data-track-ownership": details.ownershipState } : {}),
    ...(details.priceMinor && details.priceMinor > 0 ? { "data-track-price-minor": String(details.priceMinor) } : {}),
    ...(details.currency ? { "data-track-currency": details.currency } : {}),
  };
}
