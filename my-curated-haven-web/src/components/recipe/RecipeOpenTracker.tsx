"use client";

import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { RecipeAccessKind } from "@/lib/analytics/events";

interface RecipeOpenTrackerProps {
  recipeId: string;
  accessKind: RecipeAccessKind;
}

export default function RecipeOpenTracker({ recipeId, accessKind }: RecipeOpenTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    trackAnalyticsEvent(
      "recipe_open",
      {
        recipe_id: recipeId,
        access_kind: accessKind,
      },
      "recipe_detail"
    );
  }, [recipeId, accessKind]);

  return null;
}
