"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { pathToCanonicalRouteKey, routeClassFromPath } from "@/lib/analytics/schema";

/** not_found_viewed: a 404 page showed. Only the kind of address is sent (recipe, collection, story, other), never the address. */
export default function NotFoundTracker() {
  const pathname = usePathname();
  const sentFor = useRef<string | null>(null);

  useEffect(() => {
    const path = pathname ?? window.location.pathname;
    if (sentFor.current === path) return;
    sentFor.current = path;
    void trackAnalyticsEvent(
      "not_found_viewed",
      { route_class: routeClassFromPath(path) },
      pathToCanonicalRouteKey(path) ?? undefined
    );
  }, [pathname]);

  return null;
}
