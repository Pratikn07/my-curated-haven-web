import type { CampaignMotif } from "@/lib/campaigns/types";
import { parseCampaignTitle } from "@/lib/campaigns/validate";

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

export function Kicker({ children, tone = "ink" }: { children: React.ReactNode; tone?: "ink" | "light" }) {
  return (
    <p className="cp-kicker" data-tone={tone}>
      {children}
    </p>
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
 * from assistive technology, still with reduced motion, and never covering text.
 */
export function Motif({ motif, placement }: { motif?: CampaignMotif; placement: "hero" | "story" }) {
  if (!motif || motif === "none") return null;
  const Shape = SHAPES[motif];
  // Mixing in oats keeps berries and leaves from looking stamped.
  const Second = motif === "berries" || motif === "leaves" ? Oat : Shape;
  return (
    <div className="cp-motif" data-placement={placement} aria-hidden="true">
      <span className="cp-motif-item" data-slot="a">
        <Shape />
      </span>
      <span className="cp-motif-item" data-slot="b">
        <Second />
      </span>
      <span className="cp-motif-item" data-slot="c">
        <Shape />
      </span>
    </div>
  );
}
