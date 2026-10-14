"use client";

import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

/** Counts a buyer opening the make-ahead plan, the way RecipeOpenTracker counts a recipe open. */
export default function MakeAheadPlanTracker({ releaseId }: { releaseId: string }) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    trackAnalyticsEvent("make_ahead_plan_open", { collection_release_id: releaseId }, "collection_detail");
  }, [releaseId]);

  return null;
}
