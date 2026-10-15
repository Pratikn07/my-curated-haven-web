"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { pathToCanonicalRouteKey } from "@/lib/analytics/schema";
import { isPrimaryUx } from "@/lib/analytics/ux";

/**
 * faq_opened: a question marked `<details data-track-faq="<question_key>">` opens. `toggle` does not bubble, so one
 * listener on the document in the capture phase sees every question on every page. Closing one sends nothing.
 * The module comes from the nearest `data-track-ux`, and is "faq" when the page has none.
 */
export default function FaqTracker() {
  useEffect(() => {
    const onToggle = (event: Event) => {
      const details = event.target;
      if (!(details instanceof HTMLDetailsElement) || !details.open) return;
      const questionKey = details.dataset.trackFaq;
      if (!questionKey) return;
      const ux = details.closest<HTMLElement>("[data-track-ux]")?.dataset.trackUx;
      void trackAnalyticsEvent(
        "faq_opened",
        { primary_ux: isPrimaryUx(ux) ? ux : "faq", question_key: questionKey },
        pathToCanonicalRouteKey(window.location.pathname) ?? undefined
      );
    };
    document.addEventListener("toggle", onToggle, true);
    return () => document.removeEventListener("toggle", onToggle, true);
  }, []);

  return null;
}
