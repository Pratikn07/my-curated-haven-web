"use client";

import { useEffect, useRef } from "react";
import { buildHalloweenMotion, shouldAnimate } from "./motion";

/**
 * Loads GSAP for /halloween once the first screen is up (when the browser is
 * idle, or on the first scroll, whichever comes first), so the menu paints and
 * answers taps before any motion code arrives. The page is complete without it.
 */
export default function HalloweenMotion() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = anchor.current?.closest<HTMLElement>(".hw");
    if (!root || !shouldAnimate()) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;
    let started = false;

    const start = () => {
      if (started) return;
      started = true;
      window.removeEventListener("scroll", start);
      void Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
        .then(([{ gsap }, { ScrollTrigger }]) => {
          if (!disposed) cleanup = buildHalloweenMotion(root, gsap, ScrollTrigger);
        })
        .catch(() => {
          // The still page is complete.
        });
    };

    window.addEventListener("scroll", start, { passive: true, once: true });
    // Safari has no requestIdleCallback; a short timer stands in.
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idle = hasIdle ? window.requestIdleCallback(start, { timeout: 1500 }) : window.setTimeout(start, 900);

    return () => {
      disposed = true;
      window.removeEventListener("scroll", start);
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      cleanup?.();
    };
  }, []);

  return <span ref={anchor} hidden />;
}
