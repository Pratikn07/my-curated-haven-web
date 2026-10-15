"use client";

import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { CollectionOwnershipState } from "@/lib/analytics/events";

interface CollectionViewTrackerProps {
  collectionSlug: string;
  /** Absent while nothing is on sale or the commerce lookup failed. */
  releaseId?: string;
  ownershipState?: CollectionOwnershipState;
}

/** collection_view once per collection page view: the funnel step between landing pages and Buy. */
export default function CollectionViewTracker({ collectionSlug, releaseId, ownershipState }: CollectionViewTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    void trackAnalyticsEvent(
      "collection_view",
      {
        collection_slug: collectionSlug,
        ...(releaseId ? { collection_release_id: releaseId } : {}),
        ...(ownershipState ? { ownership_state: ownershipState } : {}),
      },
      "collection_detail"
    );
  }, [collectionSlug, releaseId, ownershipState]);

  return null;
}
