"use client";

import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { AnalyticsEventMap, AnalyticsEventName } from "@/lib/analytics/events";
import { pathToCanonicalRouteKey } from "@/lib/analytics/schema";

/**
 * Sends one event when it first appears, once per page view. A server page puts it inside the branch the parent
 * actually sees (a locked recipe, an empty list, "You're in"), so the event says what was on screen. The payload
 * must already hold only fixed values; the validator still drops anything else.
 */
export default function PageEventTracker<T extends AnalyticsEventName>({
  event,
  payload,
}: {
  event: T;
  payload: AnalyticsEventMap[T];
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void trackAnalyticsEvent(event, payload, pathToCanonicalRouteKey(window.location.pathname) ?? undefined);
  }, [event, payload]);

  return null;
}
