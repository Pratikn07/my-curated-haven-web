"use client";

import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

export default function PurchasedLibraryTracker({ releaseId }: { releaseId?: string }) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    trackAnalyticsEvent(
      "purchased_library_open",
      { collection_release_id: releaseId },
      "account_collections"
    );
  }, [releaseId]);

  return null;
}
