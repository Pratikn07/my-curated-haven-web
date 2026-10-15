"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { ScrollDepth, VisibleSeconds } from "@/lib/analytics/events";
import { isAdminPath } from "@/lib/analytics/private-paths";
import { pathToCanonicalRouteKey } from "@/lib/analytics/schema";

const DEPTHS: readonly ScrollDepth[] = [25, 50, 75, 100];
const SECONDS: readonly VisibleSeconds[] = [15, 30, 60];
/** Sub-pixel rounding can leave the bottom a pixel short of the page's height. */
const BOTTOM_SLACK_PX = 2;

/**
 * How far parents read while they are still on the page, since Instagram's browser often closes without
 * sending PostHog's own page-leave depth:
 * - page_scroll_reached at 25, 50, 75 and 100% of the page, each once per page view. A skipped depth is sent
 *   on the way (a jump to 75% sends 25 and 50 too); a page that fits on one screen sends all four at load.
 * - page_time_reached at 15, 30 and 60 seconds of visible time; a background tab's time does not count.
 * Both start again on every new address (pathname). Never on admin pages.
 */
export default function PageEngagementTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || isAdminPath(pathname)) return;
    const routeKey = pathToCanonicalRouteKey(pathname) ?? undefined;

    let depthSent = 0;
    let frame = 0;
    const readDepth = () => {
      frame = 0;
      const height = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0);
      if (height <= 0) return;
      const bottom = window.scrollY + window.innerHeight;
      const percent = bottom >= height - BOTTOM_SLACK_PX ? 100 : (bottom / height) * 100;
      for (const depth of DEPTHS) {
        if (depth <= depthSent || percent < depth) continue;
        depthSent = depth;
        void trackAnalyticsEvent("page_scroll_reached", { depth }, routeKey);
      }
      // Every depth is sent: stop reading the page's height on each scroll.
      if (depthSent === DEPTHS[DEPTHS.length - 1]) window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(readDepth);
    };

    let secondsSent = 0;
    let visibleMs = 0;
    let visibleSince: number | null = document.visibilityState === "visible" ? performance.now() : null;
    const settle = () => {
      if (visibleSince === null) return;
      const now = performance.now();
      visibleMs += now - visibleSince;
      visibleSince = now;
    };
    const checkTime = () => {
      settle();
      for (const seconds of SECONDS) {
        if (seconds <= secondsSent || visibleMs < seconds * 1000) continue;
        secondsSent = seconds;
        void trackAnalyticsEvent("page_time_reached", { seconds }, routeKey);
      }
      if (secondsSent === SECONDS[SECONDS.length - 1]) window.clearInterval(timer);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (visibleSince === null) visibleSince = performance.now();
      } else {
        settle();
        visibleSince = null;
      }
    };
    const timer = window.setInterval(checkTime, 1000);

    frame = window.requestAnimationFrame(readDepth);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);

  return null;
}
