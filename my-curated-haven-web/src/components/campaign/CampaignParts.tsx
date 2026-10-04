import type { CSSProperties, ReactNode } from "react";
import type { CampaignMotif } from "@/lib/campaigns/types";
import { parseCampaignTitle, plainCampaignTitle } from "@/lib/campaigns/validate";

/** A title from config, with its *marked* phrase set in italics. Config text is never read as HTML. */
export function CampaignText({ text }: { text: string }) {
  return (
    <>
      {parseCampaignTitle(text).map((part, index) =>
        part.emphasis ? <em key={index}>{part.text}</em> : <span key={index}>{part.text}</span>
      )}
    </>
  );
}

/**
 * A title cut into masked words for the load and scroll reveals. Screen readers
 * get the plain title once; the cut copy is hidden from them, so no reader
 * spells a word letter by letter. With `letters`, each letter is its own span
 * for the pointer weight effect on large screens.
 */
export function SplitTitle({ text, letters = false }: { text: string; letters?: boolean }) {
  let index = 0;
  return (
    <>
      <span className="cp-sr">{plainCampaignTitle(text)}</span>
      <span className="cp-split" aria-hidden="true">
        {parseCampaignTitle(text).map((part, partIndex) =>
          part.text.split(/(\s+)/).map((word, wordIndex) => {
            if (!word) return null;
            const key = `${partIndex}-${wordIndex}`;
            if (/^\s+$/.test(word)) return <span key={key}> </span>;
            const order = index++;
            return (
              <span
                key={key}
                className="cp-word"
                data-em={part.emphasis ? "true" : undefined}
                style={{ "--w": order } as CSSProperties}
              >
                <span className="cp-word-in">
                  {letters
                    ? Array.from(word).map((letter, letterIndex) => (
                        <span key={letterIndex} className="cp-char">
                          {letter}
                        </span>
                      ))
                    : word}
                </span>
              </span>
            );
          })
        )}
      </span>
    </>
  );
}

/**
 * A paragraph whose words darken one after another as it scrolls through the
 * screen, like reading along. Every word is readable from the start (the
 * lighter ink still passes AA); browsers without scroll timelines show it plain.
 */
export function InkText({ text, offset, total }: { text: string; offset: number; total: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, index) => (
        <span key={index} className="cp-ink" style={{ "--k": (offset + index) / total } as CSSProperties}>
          {word}{" "}
        </span>
      ))}
    </>
  );
}

export function Kicker({ children, tone = "ink", index }: { children: ReactNode; tone?: "ink" | "light"; index?: string }) {
  return (
    <p className="cp-kicker" data-tone={tone}>
      {index ? (
        <span className="cp-kicker-index" aria-hidden="true">
          {index}
        </span>
      ) : null}
      <span>{children}</span>
    </p>
  );
}

/** Words set around a slowly turning ring, with something at its centre. Decoration: the same facts are in the page text. */
export function Orbit({ id, text, children, className }: { id: string; text: string; children?: ReactNode; className?: string }) {
  return (
    <span className={["cp-orbit", className].filter(Boolean).join(" ")} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="cp-orbit-ring" focusable="false">
        <defs>
          <path id={id} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text>
          <textPath href={`#${id}`} textLength="486" lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      {children ? <span className="cp-orbit-core">{children}</span> : null}
    </span>
  );
}

/** A slow, endless band of short facts. Hidden from assistive technology; it repeats what the page says. */
export function Marquee({ items, tone = "ink" }: { items: string[]; tone?: "ink" | "accent" }) {
  const loop = [...items, ...items];
  return (
    <div className="cp-marquee" data-tone={tone} aria-hidden="true">
      <div className="cp-marquee-track">
        {loop.map((item, index) => (
          <span key={index} className="cp-marquee-item">
            {item}
            <svg viewBox="0 0 40 40" className="cp-marquee-star" focusable="false">
              <path d="M20 4c1.6 9 4.6 12.4 14 16-9.4 3.6-12.4 7-14 16-1.6-9-4.6-12.4-14-16 9.4-3.6 12.4-7 14-16z" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}

function Berry() {
  return (
    <svg viewBox="0 0 40 40" className="cp-motif-shape">
      <circle cx="20" cy="21" r="15" fill="#4f4a78" />
      <circle cx="14.5" cy="15.5" r="4.5" fill="#8b86b8" opacity="0.55" />
      <path d="M20 9.5l1.6 2.9 3.2-.6-1.4 2.9 2.2 2.4-3.2.4-.9 3.1-1.5-2.8-1.5 2.8-.9-3.1-3.2-.4 2.2-2.4-1.4-2.9 3.2.6z" fill="#2d2a4a" />
    </svg>
  );
}

function Oat() {
  return (
    <svg viewBox="0 0 40 40" className="cp-motif-shape">
      <ellipse cx="20" cy="20" rx="8" ry="15" transform="rotate(28 20 20)" fill="#e9d6b3" stroke="#c9a676" strokeWidth="1.4" />
      <path d="M15 29c3-6 6-12 10-18" stroke="#c9a676" strokeWidth="1" fill="none" opacity="0.7" />
    </svg>
  );
}

function Leaf() {
  return (
    <svg viewBox="0 0 40 40" className="cp-motif-shape">
      <path d="M8 32C9 17 18 8 34 7c-1 15-10 25-26 25z" fill="#9db08f" />
      <path d="M9 31C16 23 22 17 30 11" stroke="#6f8463" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Star() {
  return (
    <svg viewBox="0 0 40 40" className="cp-motif-shape">
      <path d="M20 4c1.6 9 4.6 12.4 14 16-9.4 3.6-12.4 7-14 16-1.6-9-4.6-12.4-14-16 9.4-3.6 12.4-7 14-16z" fill="#e2a65a" />
    </svg>
  );
}

const SHAPES: Record<Exclude<CampaignMotif, "none">, () => React.ReactElement> = {
  berries: Berry,
  oats: Oat,
  leaves: Leaf,
  stars: Star,
};

/**
 * A few drawn ingredients drifting near the photos. Decoration only: hidden
 * from assistive technology, still with reduced motion, and never covering
 * text. On large screens they lean with the pointer (--depth).
 */
export function Motif({ motif, placement }: { motif?: CampaignMotif; placement: "hero" | "story" | "closing" }) {
  if (!motif || motif === "none") return null;
  const Shape = SHAPES[motif];
  // Mixing in oats keeps berries and leaves from looking stamped.
  const Second = motif === "berries" || motif === "leaves" ? Oat : Shape;
  return (
    <div className="cp-motif" data-placement={placement} aria-hidden="true">
      <span className="cp-motif-item" data-slot="a" style={{ "--depth": 1.6 } as CSSProperties}>
        <Shape />
      </span>
      <span className="cp-motif-item" data-slot="b" style={{ "--depth": -1.1 } as CSSProperties}>
        <Second />
      </span>
      <span className="cp-motif-item" data-slot="c" style={{ "--depth": 2.4 } as CSSProperties}>
        <Shape />
      </span>
      <span className="cp-motif-item" data-slot="d" style={{ "--depth": -2 } as CSSProperties}>
        <Second />
      </span>
    </div>
  );
}
