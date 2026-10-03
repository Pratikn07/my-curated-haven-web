/**
 * The painted homepage house: a clay miniature in day, evening and night light,
 * layered over a sky. The paintings blend by the visitor's clock through the
 * --hs-* numbers that src/lib/house-light.ts writes on <html>, and each painting
 * downloads only once it shows (see house.css). HouseDepth adds the gentle depth
 * on scroll and touch.
 *
 * Purely decorative: room names, status and actions live in HTML around it.
 * Art source and preparation: docs/implementation/haven-house/ART-SHOT-LIST.md
 * and scripts/house-art/prepare_house_art.py.
 */
import type { CSSProperties } from "react";

// Fixed positions so the server and browser render the same scene.
const STARS: [number, number, number][] = [
  [6, 8, 1.4], [14, 22, 1], [22, 5, 1.2], [9, 36, 0.9], [27, 15, 0.8], [35, 4, 1.1], [4, 52, 1],
  [92, 30, 1], [96, 12, 1.3], [88, 44, 0.8], [95, 56, 1.1], [69, 5, 0.9], [76, 22, 0.8], [61, 12, 1],
  [18, 46, 0.8], [83, 5, 1.2], [44, 3, 0.8], [3, 24, 1.2],
];

// [left %, top %, drift x px, drift y px, seconds, delay seconds]
const FIREFLIES: [number, number, number, number, number, number][] = [
  [8, 78, 18, -26, 11, 0], [15, 90, -14, -18, 13, -4], [24, 70, 22, -14, 9, -7], [86, 74, -20, -24, 12, -2],
  [92, 88, -16, -12, 10, -6], [78, 92, 14, -20, 14, -9], [5, 62, 12, -30, 15, -3], [95, 64, -12, -22, 12, -8],
  [36, 95, 20, -10, 10, -5], [64, 96, -18, -12, 11, -1], [12, 54, 16, -16, 13, -10], [89, 50, -14, -18, 16, -12],
];

export default function HouseScene() {
  return (
    <div className="hs-scene" aria-hidden="true">
      <div className="hs-depth hs-depth-sky" data-depth="sky">
        <div className="hs-sky hs-sky-day" />
        <div className="hs-sky hs-sky-evening" />
        <div className="hs-sky hs-sky-twilight" />
        <div className="hs-sky hs-sky-night">
          <div className="hs-sky-view">
            <svg className="hs-stars" viewBox="0 0 100 125" preserveAspectRatio="none" focusable="false">
              {STARS.map(([x, y, r]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y * 1.25} r={r * 0.32} />
              ))}
            </svg>
            <div className="hs-moon" />
          </div>
        </div>
        <div className="hs-ground" />
      </div>

      <div className="hs-depth hs-depth-house" data-depth="house">
        <div className="hs-house">
          <div className="hs-shadow" />
          <div className="hs-paint hs-paint-day" />
          <div className="hs-paint hs-paint-evening" />
          <div className="hs-paint hs-paint-night" />
        </div>
      </div>

      {/* Its own layer, so the screen blend mixes with the sky and house below it. */}
      <div className="hs-depth hs-glow" data-depth="house">
        <div className="hs-house">
          <div className="hs-glow-breath" />
        </div>
      </div>

      <div className="hs-depth hs-depth-near" data-depth="near">
        <div className="hs-fireflies">
          {FIREFLIES.map(([x, y, dx, dy, seconds, delay]) => (
            <span
              key={`${x}-${y}`}
              className="hs-firefly"
              style={
                {
                  left: `${x}%`,
                  top: `${y}%`,
                  "--ff-dx": `${dx}px`,
                  "--ff-dy": `${dy}px`,
                  "--ff-time": `${seconds}s`,
                  "--ff-delay": `${delay}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
