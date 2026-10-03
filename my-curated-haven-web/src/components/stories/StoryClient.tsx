"use client";

import { useEffect, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { StoryAction, StoryPlacement, StoryRoomKey } from "@/lib/analytics/events";
import { isPostHogActive, posthog } from "@/lib/analytics/posthog";

const ENTRY_STORY_KEY = "mch_entry_story";
const STORY_ACTIONS: readonly StoryAction[] = ["recipe_jump", "full_recipe", "more_recipe", "collection", "about"];
const STORY_PLACEMENTS: readonly StoryPlacement[] = ["card", "sticky", "recipe", "next", "offer", "about"];

/**
 * Records the landing page view, remembers which page this visit started on so
 * later events (a recipe opened, a checkout) can be tied back to the post, and
 * records taps on links marked with data-story-action.
 */
export function StoryTracker({ slug, room }: { slug: string; room: StoryRoomKey }) {
  useEffect(() => {
    void trackAnalyticsEvent("story_view", { story_slug: slug, room }, "story");

    try {
      if (!sessionStorage.getItem(ENTRY_STORY_KEY)) {
        sessionStorage.setItem(ENTRY_STORY_KEY, slug);
        if (isPostHogActive()) posthog.register_for_session({ entry_story: slug });
      }
    } catch {
      // Storage can be blocked; the view event above still names the page.
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-story-action]") : null;
      if (!target) return;
      const action = target.dataset.storyAction as StoryAction | undefined;
      const placement = target.dataset.storyPlacement as StoryPlacement | undefined;
      if (!action || !placement || !STORY_ACTIONS.includes(action) || !STORY_PLACEMENTS.includes(placement)) return;
      void trackAnalyticsEvent(
        "story_action_clicked",
        { story_slug: slug, story_action: action, story_placement: placement },
        "story"
      );
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [slug, room]);

  return null;
}

/**
 * The one main action, in thumb reach: it appears once the card's own button
 * has scrolled away and leaves for good once the recipe is reached, so it never
 * follows a parent around the rest of the page.
 */
export function StoryStickyAction({ label }: { label: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const cardAction = document.getElementById("story-card-action");
    const recipe = document.getElementById("story-recipe");
    if (!cardAction || !recipe || typeof IntersectionObserver === "undefined") return;

    let cardVisible = true;
    let recipeReached = false;
    const update = () => setShow(!cardVisible && !recipeReached);

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === cardAction) cardVisible = entry.isIntersecting;
        if (entry.target === recipe) {
          // Reached means the recipe is on screen or already above it.
          recipeReached = entry.isIntersecting || entry.boundingClientRect.top < 0;
        }
      }
      update();
    });
    observer.observe(cardAction);
    observer.observe(recipe);
    return () => observer.disconnect();
  }, []);

  return (
    <a
      href="#story-recipe"
      className="story-sticky"
      data-visible={show ? "true" : "false"}
      aria-hidden={show ? undefined : true}
      tabIndex={show ? undefined : -1}
      data-story-action="recipe_jump"
      data-story-placement="sticky"
    >
      {label} <span aria-hidden="true">↓</span>
    </a>
  );
}
