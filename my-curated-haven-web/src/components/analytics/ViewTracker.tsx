"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { CollectionOwnershipState, OfferSurface, OfferViewedPayload } from "@/lib/analytics/events";
import { isAdminPath } from "@/lib/analytics/private-paths";
import { pathToCanonicalRouteKey } from "@/lib/analytics/schema";
import { isPrimaryUx } from "@/lib/analytics/ux";

const SURFACES: readonly OfferSurface[] = ["lock_card", "buy_box", "sticky_bar", "book_card", "story_offer"];
const OWNERSHIP: readonly CollectionOwnershipState[] = ["owned", "not_owned", "unauthenticated", "pending_payment", "unavailable"];

/** An offer's labels: data-track-offer (surface), data-track-collection, and where known ownership, price and currency. */
function offerPayload(element: HTMLElement): OfferViewedPayload | null {
  const { trackOffer, trackCollection, trackOwnership, trackPriceMinor, trackCurrency } = element.dataset;
  const surface = SURFACES.find((value) => value === trackOffer);
  if (!surface || !trackCollection) return null;
  const ownership = OWNERSHIP.find((value) => value === trackOwnership);
  const price = Number(trackPriceMinor);
  const hasPrice = Number.isInteger(price) && price > 0;
  return {
    surface,
    collection_slug: trackCollection,
    ...(ownership ? { ownership_state: ownership } : {}),
    ...(hasPrice ? { price_minor: price } : {}),
    ...(hasPrice && trackCurrency ? { currency: trackCurrency.toLowerCase() } : {}),
  };
}

/**
 * Views, once per page view:
 * - section_viewed for a block marked data-track-view, when its top passes two thirds of the way up the screen
 *   (the rule CampaignTracker uses for story sections); primary_ux is its own or its module's label.
 * - offer_viewed for a block marked data-track-offer once half of it is on screen (or it fills half the screen),
 *   once per surface and book.
 * Two observers, because the section rule shrinks the screen from below and a phone buy bar fixed to the bottom
 * would never count under it. Blocks added later (a dialog, streamed content) are picked up as they appear.
 */
export default function ViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || isAdminPath(pathname) || typeof IntersectionObserver === "undefined") return;
    const routeKey = pathToCanonicalRouteKey(pathname) ?? undefined;
    const offersSent = new Set<string>();

    const sections = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          sections.unobserve(entry.target);
          const ux = entry.target.closest<HTMLElement>("[data-track-ux]")?.dataset.trackUx;
          if (!isPrimaryUx(ux)) continue;
          void trackAnalyticsEvent("section_viewed", { primary_ux: ux }, routeKey);
        }
      },
      { rootMargin: "0px 0px -35% 0px" }
    );

    const offers = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const halfScreen = (entry.rootBounds?.height ?? window.innerHeight) / 2;
          if (!entry.isIntersecting || (entry.intersectionRatio < 0.5 && entry.intersectionRect.height < halfScreen)) continue;
          const payload = offerPayload(entry.target as HTMLElement);
          if (!payload) continue;
          offers.unobserve(entry.target);
          const key = `${payload.surface}:${payload.collection_slug}`;
          if (offersSent.has(key)) continue;
          offersSent.add(key);
          void trackAnalyticsEvent("offer_viewed", payload, routeKey);
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    const watched = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll("[data-track-view], [data-track-offer]").forEach((element) => {
        if (watched.has(element)) return;
        watched.add(element);
        if (element.hasAttribute("data-track-view")) sections.observe(element);
        if (element.hasAttribute("data-track-offer")) offers.observe(element);
      });
    };
    let frame = 0;
    const added = new MutationObserver(() => {
      if (!frame) {
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          scan();
        });
      }
    });
    scan();
    added.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      added.disconnect();
      sections.disconnect();
      offers.disconnect();
    };
  }, [pathname]);

  return null;
}
