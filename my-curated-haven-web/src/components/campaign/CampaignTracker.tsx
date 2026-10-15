"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { StoryOfferState, StoryRoomKey } from "@/lib/analytics/events";
import { ENTRY_STORY_STORAGE_KEY as ENTRY_STORY_KEY } from "@/lib/analytics/consent";
import { isPostHogActive, posthog } from "@/lib/analytics/posthog";

interface CampaignTrackerProps {
  slug: string;
  room: StoryRoomKey;
  recipeCount: number;
  offerState: StoryOfferState;
  series?: string;
}

/**
 * Analytics for a campaign page, all with fixed values: story_view once, and the page this visit started on
 * (entry_story), so a recipe opened or a purchase later in the visit is tied back to the post.
 * Taps and sections are labelled in the markup (data-track-*) and sent as cta_clicked and section_viewed by
 * ClickTracker and ViewTracker, like every other page. Motion and pointer details live in CampaignMotion.
 */
export default function CampaignTracker({ slug, room, recipeCount, offerState, series }: CampaignTrackerProps) {
  useEffect(() => {
    void trackAnalyticsEvent(
      "story_view",
      { story_slug: slug, room, recipe_count: recipeCount, offer_state: offerState, ...(series ? { story_series: series } : {}) },
      "story"
    );

    try {
      if (!sessionStorage.getItem(ENTRY_STORY_KEY)) {
        sessionStorage.setItem(ENTRY_STORY_KEY, slug);
        if (isPostHogActive()) posthog.register_for_session({ entry_story: slug });
      }
    } catch {
      // Storage can be blocked; the view event above still names the page.
    }
  }, [slug, room, recipeCount, offerState, series]);

  return null;
}
