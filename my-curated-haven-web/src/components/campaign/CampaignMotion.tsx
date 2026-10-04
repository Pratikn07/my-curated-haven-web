"use client";

import { useEffect, useRef } from "react";
import { setupDock } from "./motion/dock";
import { setupCountUps, setupReveals } from "./motion/reveal";
import { setupPinnedStory } from "./motion/story";

/** A mouse. Touch screens never download the pointer details. */
const FINE_POINTER = "(hover: hover) and (pointer: fine)";
/** The WebGL ripple is for large screens with motion allowed. */
const LARGE_FINE_POINTER = `${FINE_POINTER} and (min-width: 1024px) and (prefers-reduced-motion: no-preference)`;

/**
 * Everything on a campaign page that moves by script, set up once:
 * - on every screen: reveals as sections arrive, the recipe dock and count-ups;
 * - with a mouse (loaded on demand): dragging the related shelf and, with
 *   motion allowed, magnetic buttons, card tilt, the cursor label, the
 *   headline's weight under the pointer and leaning ingredients;
 * - large screens with a mouse: the WebGL ripple on the hero photo;
 * - large screens: the pinned kitchen story (GSAP, loaded on demand).
 * The page is complete without any of it; each part cleans up after itself.
 */
export default function CampaignMotion() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = anchor.current?.closest<HTMLElement>(".campaign");
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let disposed = false;
    const cleanups = [setupReveals(root), setupDock(root)];
    if (!reduce) cleanups.push(setupCountUps(root));

    const story = root.querySelector<HTMLElement>(".cp-story");
    if (story) cleanups.push(setupPinnedStory(story));

    // Mouse details load only for a mouse, so phones never download them.
    if (window.matchMedia(FINE_POINTER).matches) {
      const arch = root.querySelector<HTMLElement>("[data-ripple]");
      const large = window.matchMedia(LARGE_FINE_POINTER).matches;
      void Promise.all([import("./motion/pointer"), arch && large ? import("./motion/ripple") : null])
        .then(([pointer, ripple]) => {
          if (disposed) return;
          cleanups.push(pointer.setupShelfDrag(root));
          if (!reduce) cleanups.push(pointer.setupPointer(root));
          if (arch && ripple) cleanups.push(ripple.setupRipple(arch));
        })
        .catch(() => {
          // The page works the same without them.
        });
    }

    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return <span ref={anchor} hidden />;
}
