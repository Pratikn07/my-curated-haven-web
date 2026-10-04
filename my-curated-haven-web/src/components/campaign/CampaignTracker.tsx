"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type {
  StoryAction,
  StoryOfferState,
  StoryPlacement,
  StoryRoomKey,
  StorySection,
} from "@/lib/analytics/events";
import { isPostHogActive, posthog } from "@/lib/analytics/posthog";

const ENTRY_STORY_KEY = "mch_entry_story";
const ACTIONS: readonly StoryAction[] = [
  "recipe_jump",
  "full_recipe",
  "more_recipe",
  "collection",
  "about",
  "campaign_recipe",
  "pack",
  "instagram",
  "recipes_index",
  "home",
];
const PLACEMENTS: readonly StoryPlacement[] = [
  "card",
  "sticky",
  "recipe",
  "next",
  "offer",
  "about",
  "hero",
  "recipes",
  "story",
  "pack",
  "collection",
  "related",
  "closing",
];
const SECTIONS: readonly StorySection[] = ["recipes", "story", "story_end", "pack", "collection", "related", "questions", "closing"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CampaignTrackerProps {
  slug: string;
  room: StoryRoomKey;
  recipeCount: number;
  offerState: StoryOfferState;
  series?: string;
}

/**
 * Analytics for a campaign page, all with fixed values:
 * - story_view once, and the page this visit started on (entry_story), so a
 *   recipe opened or a purchase later in the visit is tied back to the post;
 * - story_action_clicked for links marked data-story-action;
 * - story_section_viewed the first time each part of the page is reached.
 * Also gives the main buttons a slight pull toward a mouse pointer.
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

    const onClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const marked = element?.closest<HTMLElement>("[data-story-action]") ?? null;
      if (!marked) return;
      // A marked list (More from the kitchen) counts only taps on one of its links, not on blank card space.
      const link = element?.closest("a");
      if (!link || !marked.contains(link)) return;
      const action = marked.dataset.storyAction as StoryAction | undefined;
      const placement = marked.dataset.storyPlacement as StoryPlacement | undefined;
      if (!action || !placement || !ACTIONS.includes(action) || !PLACEMENTS.includes(placement)) return;

      const item = link.closest<HTMLElement>("[data-recipe-id]");
      const recipeId = item?.dataset.recipeId;
      const position = Number(item?.dataset.recipePosition);
      void trackAnalyticsEvent(
        "story_action_clicked",
        {
          story_slug: slug,
          story_action: action,
          story_placement: placement,
          ...(recipeId && UUID.test(recipeId) ? { recipe_id: recipeId } : {}),
          ...(Number.isInteger(position) && position > 0 ? { recipe_position: position } : {}),
        },
        "story"
      );
    };
    document.addEventListener("click", onClick);

    // A part counts as reached once its top passes two thirds of the way up the screen.
    const seen = new Set<StorySection>();
    const sections = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const section = (entry.target as HTMLElement).dataset.storySection as StorySection | undefined;
          sections?.unobserve(entry.target);
          if (!section || !SECTIONS.includes(section) || seen.has(section)) continue;
          seen.add(section);
          void trackAnalyticsEvent("story_section_viewed", { story_slug: slug, story_section: section }, "story");
        }
      },
      { rootMargin: "0px 0px -35% 0px" }
    );
    document.querySelectorAll("[data-story-section]").forEach((element) => sections?.observe(element));

    const magnets = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches
      ? Array.from(document.querySelectorAll<HTMLElement>(".campaign [data-magnetic]"))
      : [];
    const pull = (event: PointerEvent) => {
      const target = event.currentTarget as HTMLElement;
      const box = target.getBoundingClientRect();
      const x = ((event.clientX - box.left) / box.width - 0.5) * 10;
      const y = ((event.clientY - box.top) / box.height - 0.5) * 8;
      target.style.setProperty("--cp-mx", `${x.toFixed(1)}px`);
      target.style.setProperty("--cp-my", `${y.toFixed(1)}px`);
    };
    const release = (event: PointerEvent) => {
      const target = event.currentTarget as HTMLElement;
      target.style.removeProperty("--cp-mx");
      target.style.removeProperty("--cp-my");
    };
    for (const magnet of magnets) {
      magnet.addEventListener("pointermove", pull);
      magnet.addEventListener("pointerleave", release);
    }

    return () => {
      document.removeEventListener("click", onClick);
      sections?.disconnect();
      for (const magnet of magnets) {
        magnet.removeEventListener("pointermove", pull);
        magnet.removeEventListener("pointerleave", release);
      }
    };
  }, [slug, room, recipeCount, offerState, series]);

  return null;
}
