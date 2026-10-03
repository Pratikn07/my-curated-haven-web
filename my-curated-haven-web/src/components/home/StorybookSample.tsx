"use client";

import { useEffect, useState } from "react";

const STYLES = [
  { id: "watercolor", label: "Watercolor" },
  { id: "cartoon", label: "Cartoon" },
  { id: "paper", label: "Paper cut" },
  { id: "crayon", label: "Crayon" },
] as const;

const STORIES = [
  {
    id: "moon",
    label: "Bedtime adventure",
    text: (name: string) => `Once upon a time, ${name} found a silver ladder leaning on the moon. “Just one climb,” said ${name}, “and then bed.”`,
  },
  {
    id: "sibling",
    label: "A new baby at home",
    text: (name: string) => `Once upon a time, ${name} got a very important new job: Chief Helper to the new baby, who was tiny, loud, and had never seen the moon.`,
  },
  {
    id: "nursery",
    label: "First day at nursery",
    text: (name: string) => `On Monday morning, ${name} packed a small bag with one apple, two crayons and a whole lot of brave.`,
  },
  {
    id: "dummy",
    label: "Bye-bye dummy",
    text: (name: string) => `One night, ${name} decided the dummy should go on holiday to the moon, where the baby owls needed it more.`,
  },
] as const;

const SAMPLE_NAMES = ["Maya", "Arlo", "Zara", "Leo"] as const;

function SampleChild() {
  return (
    <>
      <rect className="sb-sky" width="300" height="340" />
      <g className="sb-star">
        <circle cx="40" cy="50" r="3" /><circle cx="90" cy="28" r="2" /><circle cx="150" cy="60" r="2.5" />
        <circle cx="70" cy="110" r="2" /><circle cx="270" cy="150" r="2" />
      </g>
      <circle className="sb-moon sb-line sb-shadow" cx="222" cy="78" r="36" />
      <path className="sb-hill sb-line sb-shadow" d="M-5 268 Q150 206 305 258 L305 345 L-5 345Z" />
      <path className="sb-pj sb-line sb-shadow" d="M108 300 q-4 -54 22 -64 h24 q26 10 22 64z" />
      <rect className="sb-pj sb-line" x="118" y="296" width="18" height="22" rx="7" />
      <rect className="sb-pj sb-line" x="148" y="296" width="18" height="22" rx="7" />
      <circle className="sb-skin sb-line sb-shadow" cx="142" cy="204" r="30" />
      <path className="sb-hair sb-line" d="M112 202 q-2 -34 30 -36 q32 2 30 32 q-12 -16 -30 -14 q-16 2 -30 18z" />
      <circle className="sb-eye" cx="132" cy="207" r="2.6" /><circle className="sb-eye" cx="153" cy="207" r="2.6" />
      <circle className="sb-cheek" cx="125" cy="217" r="5" /><circle className="sb-cheek" cx="160" cy="217" r="5" />
      <path className="sb-mouth" d="M135 222 q7 6 14 0" />
      <g className="sb-shadow">
        <circle className="sb-teddy sb-line" cx="196" cy="276" r="16" /><circle className="sb-teddy sb-line" cx="196" cy="252" r="11" />
        <circle className="sb-teddy sb-line" cx="187" cy="243" r="4.5" /><circle className="sb-teddy sb-line" cx="205" cy="243" r="4.5" />
      </g>
      <path className="sb-arm" d="M170 262 q14 4 16 12" />
    </>
  );
}

export default function StorybookSample() {
  const [tick, setTick] = useState(0);
  const [pickedStyle, setPickedStyle] = useState<number | null>(null);
  const [storyId, setStoryId] = useState<(typeof STORIES)[number]["id"]>("moon");
  const [typedName, setTypedName] = useState("");

  // Gently show each style until the parent picks one. Off when reduced motion is requested.
  useEffect(() => {
    if (pickedStyle !== null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 4200);
    return () => window.clearInterval(timer);
  }, [pickedStyle]);

  const styleIndex = pickedStyle ?? tick % STYLES.length;
  const sampleName = Math.floor(tick / STYLES.length) % SAMPLE_NAMES.length;
  const trimmed = typedName.trim();
  const name = trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : SAMPLE_NAMES[sampleName];
  const story = STORIES.find((item) => item.id === storyId) ?? STORIES[0];

  return (
    <div className="grid min-w-0 gap-5">
      <figure className="storybook-book m-0 max-sm:-mx-3">
        <div className="storybook-page-left" aria-hidden="true">
          <svg viewBox="0 0 300 340" className="block h-full w-full">
            <defs>
              <filter id="sb-watercolor" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" result="moved" />
                <feGaussianBlur in="moved" stdDeviation="0.9" />
              </filter>
              <filter id="sb-crayon" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="turbulence" baseFrequency="0.9" numOctaves="2" seed="2" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
              </filter>
              <filter id="sb-paper" x="-10%" y="-10%" width="125%" height="125%">
                <feDropShadow dx="0" dy="3" stdDeviation="2.4" floodColor="#3b2a1e" floodOpacity="0.32" />
              </filter>
            </defs>
            {STYLES.map((style, index) => (
              <g
                key={style.id}
                className="storybook-layer"
                data-style={style.id}
                data-on={index === styleIndex ? "" : undefined}
              >
                <SampleChild />
              </g>
            ))}
          </svg>
        </div>
        <figcaption className="storybook-page-right text-[#3b3346]">
          <p className="font-display text-[0.8rem] leading-[1.4] italic min-[420px]:text-[0.9rem] sm:text-lg lg:text-xl">
            {story.text(name)}
          </p>
        </figcaption>
      </figure>
      <p className="-mt-2 text-center text-xs tracking-widest text-text-muted uppercase">Sample page</p>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <label htmlFor="storybook-name" className="text-sm font-semibold text-text-muted">
            Try your child&apos;s name
          </label>
          <input
            id="storybook-name"
            type="text"
            maxLength={18}
            autoComplete="off"
            placeholder="Their first name"
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
            className="min-h-12 w-full max-w-sm rounded-xl border border-border-control bg-surface px-4"
          />
          <p className="text-sm text-text-muted">The name stays on your device.</p>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold text-text-muted">Pick a story</legend>
          <div className="flex flex-wrap gap-2">
            {STORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === storyId}
                onClick={() => setStoryId(item.id)}
                className="min-h-11 rounded-full border border-border-control bg-surface px-4 text-sm font-semibold aria-pressed:border-[var(--room-library-accent)] aria-pressed:bg-[var(--room-library-accent)] aria-pressed:text-white"
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold text-text-muted">Pick a style</legend>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((style, index) => (
              <button
                key={style.id}
                type="button"
                aria-pressed={index === styleIndex}
                onClick={() => setPickedStyle(index)}
                className="min-h-11 rounded-full border border-border-control bg-surface px-4 text-sm font-semibold aria-pressed:border-[var(--room-library-accent)] aria-pressed:bg-[var(--room-library-accent)] aria-pressed:text-white"
              >
                {style.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
