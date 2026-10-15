"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { clearNotFoundPage, markNotFoundPage } from "@/lib/analytics/not-found";
import { routeClassFromPath } from "@/lib/analytics/schema";

/**
 * not_found_viewed: a 404 page showed. Only the kind of address is sent (recipe, collection, story, other), never
 * the address. While the 404 shows, no event on it carries anything read from the address (lib/analytics/not-found):
 * this effect runs before AnalyticsProvider's and the trackers' (they sit later in the tree), so the mark is set
 * before the page's first event.
 */
export default function NotFoundTracker() {
  const pathname = usePathname();
  const sentFor = useRef<string | null>(null);

  useEffect(() => {
    const path = pathname ?? window.location.pathname;
    markNotFoundPage(path);
    if (sentFor.current !== path) {
      sentFor.current = path;
      void trackAnalyticsEvent("not_found_viewed", { route_class: routeClassFromPath(path) });
    }
    return () => clearNotFoundPage(path);
  }, [pathname]);

  return null;
}
