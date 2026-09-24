"use client";

import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

export default function CollectionViewTracker({ releaseId }: { releaseId: string }) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    trackAnalyticsEvent(
      "collection_view",
      { collection_release_id: releaseId },
      "collection_detail"
    );
  }, [releaseId]);

  return null;
}
