"use client";

import { useEffect, useRef } from "react";
import { HOMEPAGE_CONTENT_VERSION, HOME_FEATURE_PREVIEWS } from "@/config/homepage-content";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

export default function HomepagePreviewTracker() {
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const featureKey = entry.target.getAttribute("data-homepage-preview");
          if (!featureKey || seen.current.has(featureKey)) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (timers.has(featureKey)) continue;
            timers.set(
              featureKey,
              setTimeout(() => {
                timers.delete(featureKey);
                if (document.visibilityState !== "visible" || seen.current.has(featureKey)) return;
                seen.current.add(featureKey);
                if (featureKey === "chat" || featureKey === "shop" || featureKey === "bloom") {
                  void trackAnalyticsEvent(
                    "homepage_preview_viewed",
                    { feature_key: featureKey, content_version: HOMEPAGE_CONTENT_VERSION },
                    "home",
                  );
                }
              }, 1000),
            );
          } else {
            const timer = timers.get(featureKey);
            if (timer) clearTimeout(timer);
            timers.delete(featureKey);
          }
        }
      },
      { threshold: [0, 0.5] },
    );

    for (const feature of HOME_FEATURE_PREVIEWS) {
      const target = document.getElementById(feature.id);
      if (target) observer.observe(target);
    }

    return () => {
      observer.disconnect();
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  return null;
}
