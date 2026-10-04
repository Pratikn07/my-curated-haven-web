"use client";

import { useEffect, useState } from "react";

/** Previous and next for a horizontal shelf, so nothing on it is reachable by swipe alone. Hidden when everything fits. */
export default function ShelfControls({ targetId }: { targetId: string }) {
  const [state, setState] = useState({ overflow: false, atStart: true, atEnd: false });

  useEffect(() => {
    const shelf = document.getElementById(targetId);
    if (!shelf) return;
    const update = () => {
      const max = shelf.scrollWidth - shelf.clientWidth;
      setState({ overflow: max > 4, atStart: shelf.scrollLeft <= 4, atEnd: shelf.scrollLeft >= max - 4 });
    };
    update();
    shelf.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(shelf);
    return () => {
      shelf.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [targetId]);

  const move = (direction: 1 | -1) => {
    const shelf = document.getElementById(targetId);
    if (!shelf) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    shelf.scrollBy({ left: direction * shelf.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  if (!state.overflow) return null;
  return (
    <div className="cp-shelf-controls">
      <button type="button" onClick={() => move(-1)} disabled={state.atStart} aria-controls={targetId} aria-label="Previous recipes">
        <span aria-hidden="true">←</span>
      </button>
      <button type="button" onClick={() => move(1)} disabled={state.atEnd} aria-controls={targetId} aria-label="Next recipes">
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
