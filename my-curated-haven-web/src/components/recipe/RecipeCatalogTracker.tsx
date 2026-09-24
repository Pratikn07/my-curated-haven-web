"use client";

import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { toResultCountBucket } from "@/lib/analytics/schema";

interface RecipeCatalogTrackerProps {
  totalCount: number;
}

export default function RecipeCatalogTracker({ totalCount }: RecipeCatalogTrackerProps) {
  const lastCountRef = useRef<number | null>(null);

  useEffect(() => {
    // Deduplicate strict-mode double render
    if (lastCountRef.current === totalCount) return;
    lastCountRef.current = totalCount;

    trackAnalyticsEvent(
      "recipe_list_view",
      {
        result_count_bucket: toResultCountBucket(totalCount),
        listing_kind: "all",
      },
      "recipes"
    );
  }, [totalCount]);

  return null;
}
