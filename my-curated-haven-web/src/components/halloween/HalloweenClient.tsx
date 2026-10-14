"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

const HINTS = ["Tap the pumpkin to carve it", "Tap again", "One more tap", "Happy Halloween! Recipes below ↓"];

/**
 * The hero pumpkin. Each tap carves a little more (eyes, grin, candle); after
 * the third the menu glows once to point at the recipes. A ring, a small hop
 * and the label invite the tap. Nothing on the page needs it.
 */
export function PumpkinCarve() {
  const [stage, setStage] = useState(0);
  const [bursts, setBursts] = useState(0);

  const carve = () => {
    setBursts((count) => count + 1);
    if (stage >= 3) return;
    const next = stage + 1;
    setStage(next);
    if (next === 3) document.getElementById("hw-menu")?.classList.add("hw-menu-ready");
  };

  return (
    <div className="hw-pumpkin">
      <button className="hw-carve" type="button" data-stage={stage} aria-label="Carve the pumpkin" onClick={carve}>
        <svg viewBox="0 0 200 190" aria-hidden="true">
          <defs>
            <radialGradient id="hw-pg" cx="45%" cy="40%" r="70%">
              <stop offset="0" stopColor="#f59a4a" />
              <stop offset="1" stopColor="#c9561a" />
            </radialGradient>
            <radialGradient id="hw-gl" cx="50%" cy="55%" r="50%">
              <stop offset="0" stopColor="#ffd27a" stopOpacity="0.95" />
              <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle className="hw-glow" cx="100" cy="112" r="95" fill="url(#hw-gl)" />
          <path d="M100 52c-4-14 0-26 12-34" stroke="#5b6b3a" strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M112 34c14-10 32-8 38 4-14 2-26 4-38-4z" fill="#6f8445" />
          <ellipse cx="58" cy="114" rx="40" ry="56" fill="#c9561a" />
          <ellipse cx="142" cy="114" rx="40" ry="56" fill="#c9561a" />
          <ellipse cx="78" cy="112" rx="40" ry="62" fill="#dd6a25" />
          <ellipse cx="122" cy="112" rx="40" ry="62" fill="#dd6a25" />
          <ellipse cx="100" cy="110" rx="36" ry="64" fill="url(#hw-pg)" />
          <g className="hw-face">
            <g className="hw-eyes">
              <path d="M64 98q12-18 26 0q-13-7-26 0z" />
              <path d="M110 98q13-18 26 0q-13-7-26 0z" />
            </g>
            <g className="hw-mouth">
              <path d="M66 124q34 34 68 0q-8 14-20 18l-4-8-6 9q-4 1-8 0l-6-9-4 8q-12-4-20-18z" />
            </g>
          </g>
        </svg>
        {bursts > 0 ? (
          <span className="hw-burst" key={bursts} aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => (
              <i key={index} style={{ "--a": `${index * 30}deg` } as CSSProperties} />
            ))}
          </span>
        ) : null}
      </button>
      <p className="hw-carve-hint">
        <span aria-live="polite">{HINTS[stage]}</span>
        <span className="hw-dots" aria-hidden="true">
          {[1, 2, 3].map((dot) => (
            <i key={dot} data-on={stage >= dot ? "" : undefined} />
          ))}
        </span>
      </p>
    </div>
  );
}

const REST = 78;
const clamp = (value: number) => Math.min(100, Math.max(0, value));

/**
 * Before and after: the everyday recipe on the left of the line, the Halloween
 * one on the right. Drag the handle, tap anywhere on the photo, or use the arrow
 * keys. The line moves once when the photo first arrives, so people see it can.
 * A sideways drag moves it; an up or down drag still scrolls the page.
 */
export function BeforeAfter({ before, after }: { before: ReactNode; after: ReactNode }) {
  const [position, setPosition] = useState(REST);
  const [settling, setSettling] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const element = box.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setSettling(true);
        timers.push(setTimeout(() => setPosition(40), 300));
        timers.push(setTimeout(() => setPosition(REST), 1200));
        timers.push(setTimeout(() => setSettling(false), 2000));
      },
      { threshold: 0.6 }
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  const fromPointer = (x: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (rect && rect.width > 0) setPosition(clamp(((x - rect.left) / rect.width) * 100));
  };

  return (
    <div
      ref={box}
      className="hw-compare"
      data-settling={settling ? "" : undefined}
      style={{ "--pos": `${position}%` } as CSSProperties}
      onPointerDown={(event) => {
        dragging.current = true;
        setSettling(false);
        event.currentTarget.setPointerCapture(event.pointerId);
        fromPointer(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragging.current) fromPointer(event.clientX);
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <div className="hw-compare-after">{after}</div>
      <div className="hw-compare-before">{before}</div>
      <span className="hw-compare-label hw-compare-left" aria-hidden="true">Everyday</span>
      <span className="hw-compare-label hw-compare-right" aria-hidden="true">Halloween</span>
      <span className="hw-compare-bar" aria-hidden="true" />
      <span
        className="hw-compare-knob"
        role="slider"
        tabIndex={0}
        aria-label="Compare the everyday and Halloween versions"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${Math.round(position)}% everyday`}
        onKeyDown={(event) => {
          const step = event.key === "ArrowLeft" ? -5 : event.key === "ArrowRight" ? 5 : 0;
          if (!step) return;
          event.preventDefault();
          setSettling(false);
          setPosition((value) => clamp(value + step));
        }}
      >
        ⇆
      </span>
    </div>
  );
}

/**
 * The pages inside the open book: every recipe as a photo, sized to fit under
 * the cover. A tap names the dish and offers its link (the recipe when it is
 * free, otherwise the book), so a stray tap never leaves the page.
 */
export function BookGrid({ recipes }: { recipes: { slug: string; title: string; image: string; free: boolean; href: string }[] }) {
  const [picked, setPicked] = useState<number | null>(null);
  const recipe = picked === null ? null : recipes[picked];

  return (
    <>
      <ol className="hw-book-tiles">
        {recipes.map((item, index) => (
          <li key={item.slug}>
            <button
              className="hw-book-tile"
              type="button"
              aria-label={`${item.title}, ${item.free ? "free" : "in the book"}`}
              aria-pressed={picked === index}
              onClick={() => setPicked(picked === index ? null : index)}
            >
              {item.image ? <Image src={item.image} alt="" fill sizes="4.5rem" /> : null}
              {item.free ? <b aria-hidden="true">Free</b> : null}
            </button>
          </li>
        ))}
      </ol>
      <div className="hw-book-caption" aria-live="polite" data-on={recipe ? "" : undefined}>
        {recipe ? (
          <>
            <span>{recipe.title}</span>
            <Link
              href={recipe.href}
              data-story-action={recipe.free ? "campaign_recipe" : "collection"}
              data-story-placement="collection"
            >
              {recipe.free ? "Free · open the recipe" : "In the book · see it"} <span aria-hidden="true">→</span>
            </Link>
          </>
        ) : null}
      </div>
    </>
  );
}

/** The friendly ghost beside the 10:30 moment. A tap makes it giggle. */
export function GhostPeek() {
  const [giggles, setGiggles] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showing, setShowing] = useState(false);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const giggle = () => {
    setGiggles((count) => count + 1);
    setShowing(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShowing(false), 1600);
  };

  return (
    <button className="hw-ghost" type="button" aria-label="Say hi to the ghost" data-giggle={showing ? "" : undefined} onClick={giggle}>
      <span className="hw-bubble" aria-hidden="true">hee hee</span>
      <svg key={giggles} viewBox="0 0 100 110" aria-hidden="true">
        <path d="M50 4C24 4 10 24 10 50v52l10-8 10 8 10-8 10 8 10-8 10 8 10-8 10 8V50C90 24 76 4 50 4z" fill="#fffaf1" />
        <ellipse cx="38" cy="46" rx="5" ry="7" fill="#2b1a12" />
        <ellipse cx="62" cy="46" rx="5" ry="7" fill="#2b1a12" />
        <circle cx="30" cy="60" r="5" fill="#f4b6a0" opacity="0.7" />
        <circle cx="70" cy="60" r="5" fill="#f4b6a0" opacity="0.7" />
        <path d="M44 62q6 6 12 0" stroke="#2b1a12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/**
 * The small time pill under the site header. It follows whichever part of the
 * page is in the middle of the screen (each carries data-hw-clock).
 */
export function ClockPill({ initial }: { initial: string }) {
  const [label, setLabel] = useState(initial);
  const row = useRef<HTMLDivElement>(null);

  // Sit just under the site header, whatever its height on this screen.
  useEffect(() => {
    const header = document.querySelector("header");
    const page = row.current?.closest<HTMLElement>(".hw");
    if (!header || !page) return;
    const measure = () => page.style.setProperty("--hw-nav", `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(header);
    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const next = (entry.target as HTMLElement).dataset.hwClock;
          if (entry.isIntersecting && next) setLabel(next);
        }
      },
      { rootMargin: "-48% 0px -48% 0px" }
    );
    document.querySelectorAll("[data-hw-clock]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="hw-clock-row" ref={row} aria-hidden="true">
      <span className="hw-clock">
        <span className="hw-clock-dot" />
        <span className="hw-clock-text" key={label}>{label}</span>
      </span>
    </div>
  );
}

/**
 * The buy bar on phones: shown once the book card under the menu has scrolled away, hidden
 * again when the book section near the end arrives. Measured on scroll, like the collection
 * page's dock, because a jump (a link, the back button) can skip an observer's crossing.
 * While it is off screen it is inert, so it is never focused or read out.
 */
export function HalloweenDock({ title, price, count, href, onSale }: { title: string; price: string; count: number; href: string; onSale: boolean }) {
  const dock = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = dock.current;
    const card = document.getElementById("hw-bookcard");
    const end = document.querySelector<HTMLElement>('[data-story-section="collection"]');
    if (!element || !card) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const pastCard = card.getBoundingClientRect().bottom < 0;
      const atEnd = end ? end.getBoundingClientRect().top < window.innerHeight : false;
      const on = pastCard && !atEnd;
      element.toggleAttribute("data-on", on);
      element.inert = !on;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    element.removeAttribute("hidden");
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div className="hw-dock" ref={dock} hidden>
      <p className="hw-dock-text">
        <strong>{title}</strong>
        <span>
          {price} · {count} recipes
        </span>
      </p>
      <a className="hw-dock-cta" href={href} data-story-action="collection" data-story-placement="sticky">
        {onSale ? "Get it" : "See it"} <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}
