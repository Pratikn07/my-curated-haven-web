"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { isStageKey, type StageKey } from "@/lib/collections/bookcase";

const STAGE_STORAGE_KEY = "mch:collections-stage";

/**
 * The line under a series' volumes, with "Your child is here" at the volume
 * for the age the parent chose on the bookcase (from the address, or this
 * device). Without a chosen age, or without script, it is a plain line.
 */
export default function SeriesMarker({ stops }: { stops: (StageKey | null)[] }) {
  const [stage, setStage] = useState<StageKey | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("stage");
    let next: string | null = fromUrl;
    if (!isStageKey(next)) {
      try {
        next = window.localStorage.getItem(STAGE_STORAGE_KEY);
      } catch {
        next = null;
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the chosen age after hydration
    if (isStageKey(next) && next !== "all") setStage(next);
  }, []);

  const here = stage ? stops.indexOf(stage) : -1;

  return (
    <div className="bk-timeline" aria-hidden={here === -1 ? true : undefined}>
      <ol className="bk-timeline-line" style={{ gridTemplateColumns: `repeat(${stops.length}, 1fr)`, "--n": stops.length } as CSSProperties}>
        {stops.map((stop, index) => (
          <li key={`${stop}-${index}`} className="bk-timeline-stop" data-here={index === here ? "" : undefined}>
            <span className="bk-timeline-dot" />
            {index === here ? <span className="bk-timeline-flag">Your child is here</span> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
