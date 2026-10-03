"use client";

import { useEffect, type RefObject } from "react";

/** How far each layer travels, in CSS pixels. Nearer layers move more, which reads as depth. */
const LAYERS = {
  sky: { tilt: 4, scroll: 0.16 },
  house: { tilt: 9, scroll: 0 },
  near: { tilt: 16, scroll: -0.08 },
} as const;

type LayerName = keyof typeof LAYERS;

/**
 * Gentle depth for the painted house. A finger or pointer over the scene tilts
 * the layers a few pixels; scrolling the page lets the sky lag behind the house.
 * Movement eases toward its target and stops when it settles, so nothing runs
 * while the visitor is still. Off for reduced motion, and paused off screen.
 */
export default function HouseDepth({ frameRef }: { frameRef: RefObject<HTMLElement | null> }) {
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const layers: [HTMLElement, LayerName][] = [];
    frame.querySelectorAll<HTMLElement>("[data-depth]").forEach((node) => {
      const name = node.dataset.depth as LayerName;
      if (name in LAYERS) layers.push([node, name]);
    });
    if (layers.length === 0) return;

    const target = { x: 0, y: 0, scroll: 0 };
    const current = { x: 0, y: 0, scroll: 0 };
    let frameId = 0;
    let visible = true;
    let releaseTimer = 0;

    const render = () => {
      frameId = 0;
      // Ease a little closer to the target each frame.
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      current.scroll += (target.scroll - current.scroll) * 0.2;
      for (const [node, name] of layers) {
        const { tilt, scroll } = LAYERS[name];
        const x = -current.x * tilt;
        const y = -current.y * tilt * 0.6 + current.scroll * scroll;
        node.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
      }
      const settled =
        Math.abs(target.x - current.x) < 0.002 &&
        Math.abs(target.y - current.y) < 0.002 &&
        Math.abs(target.scroll - current.scroll) < 0.1;
      if (!settled) frameId = window.requestAnimationFrame(render);
    };
    const wake = () => {
      if (!frameId && visible && !motion.matches) frameId = window.requestAnimationFrame(render);
    };

    const aimAt = (clientX: number, clientY: number) => {
      const box = frame.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, ((clientX - box.left) / box.width) * 2 - 1));
      target.y = Math.max(-1, Math.min(1, ((clientY - box.top) / box.height) * 2 - 1));
      wake();
    };
    const release = () => {
      target.x = 0;
      target.y = 0;
      wake();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse") aimAt(event.clientX, event.clientY);
    };
    // Touch events keep arriving while the page scrolls, unlike pointer events.
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      aimAt(touch.clientX, touch.clientY);
      window.clearTimeout(releaseTimer);
    };
    const onTouchEnd = () => {
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(release, 400);
    };
    const onScroll = () => {
      const box = frame.getBoundingClientRect();
      target.scroll = Math.max(0, Math.min(box.height, -box.top + window.innerHeight * 0.15));
      wake();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
    });
    observer.observe(frame);

    const reset = () => {
      for (const [node] of layers) node.style.translate = "";
    };
    const onMotionChange = () => (motion.matches ? reset() : onScroll());

    frame.addEventListener("pointermove", onPointerMove);
    frame.addEventListener("pointerleave", release);
    frame.addEventListener("touchstart", onTouch, { passive: true });
    frame.addEventListener("touchmove", onTouch, { passive: true });
    frame.addEventListener("touchend", onTouchEnd, { passive: true });
    frame.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    motion.addEventListener("change", onMotionChange);
    onScroll();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(releaseTimer);
      observer.disconnect();
      frame.removeEventListener("pointermove", onPointerMove);
      frame.removeEventListener("pointerleave", release);
      frame.removeEventListener("touchstart", onTouch);
      frame.removeEventListener("touchmove", onTouch);
      frame.removeEventListener("touchend", onTouchEnd);
      frame.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("scroll", onScroll);
      motion.removeEventListener("change", onMotionChange);
      reset();
    };
  }, [frameRef]);

  return null;
}
