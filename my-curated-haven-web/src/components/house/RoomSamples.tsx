"use client";

import { useState } from "react";

const KEEPSAKES = [
  { moment: "First word", detail: "“Ba”, for banana." },
  { moment: "First food", detail: "Two bites of pear, then a big no." },
  { moment: "First steps", detail: "Three steps, then a very proud sit-down." },
] as const;

/** Shows how the Nursery will keep small moments. Nothing is stored. */
export function NurserySample() {
  const [index, setIndex] = useState<number | null>(null);
  const keepsake = index === null ? null : KEEPSAKES[index];
  const today = new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={() => setIndex((current) => (current === null ? 0 : (current + 1) % KEEPSAKES.length))}
        className="inline-flex min-h-12 items-center justify-center justify-self-start rounded-xl border border-border-control bg-surface px-4 font-semibold hover:bg-surface-muted"
      >
        {keepsake ? "Stamp another sample" : "Stamp a sample keepsake"}
      </button>
      <div aria-live="polite">
        {keepsake ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border-control bg-[#fbe9de] p-4 text-[#3d405b]">
            <p className="text-sm font-semibold tracking-wide uppercase">{keepsake.moment}</p>
            <p className="mt-1 font-display text-xl">{keepsake.detail}</p>
            <p className="mt-2 text-sm">{today}</p>
            <p className="mt-3 text-sm text-[#666578]">Sample only. Nothing is saved.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Shows how a Shelf pick will explain itself. Not a product listing. */
export function ShelfSample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="grid gap-3">
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <p className="text-sm font-semibold tracking-wide text-accent-strong uppercase">Sample find</p>
        <p className="mt-1 font-display text-xl">A plate that stays put</p>
        <div id="shelf-sample-why" hidden={!open} className="mt-3 grid gap-2 text-text-muted">
          <p>
            <span className="font-semibold text-foreground">Why we&apos;d pick it:</span> it grips the high chair tray, so
            more of dinner stays on the plate.
          </p>
          <p>
            <span className="font-semibold text-foreground">What we check first:</span> what it&apos;s made of, how it
            cleans, and whether parents still use it a month later.
          </p>
          <p className="text-sm">Sample only. Not a product listing.</p>
        </div>
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="shelf-sample-why"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-12 items-center justify-center justify-self-start rounded-xl border border-border-control bg-surface px-4 font-semibold hover:bg-surface-muted"
      >
        {open ? "Hide why we'd pick it" : "See why we'd pick it"}
      </button>
    </div>
  );
}
