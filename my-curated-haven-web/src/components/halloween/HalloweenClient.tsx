"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { HALLOWEEN_COLLECTION_SLUG } from "@/config/halloween";
import { offerAttributes } from "@/lib/analytics/track-markup";

const REST = 50;
const clamp = (value: number) => Math.min(100, Math.max(0, value));

/**
 * Before and after: the everyday recipe on the left of the line, the Halloween
 * one on the right, resting half and half. The first time the photo comes into
 * view the line shows the whole everyday photo, then the whole Halloween one,
 * then settles in the middle (not with reduced motion). Drag the handle, tap
 * anywhere on the photo, or use the arrow keys; any of these stops the sweep.
 * A sideways drag moves it; an up or down drag still scrolls the page. Also used
 * on a recipe's own page (src/app/recipes/[slug]/page.tsx), outside the .hw theme.
 */
export function BeforeAfter({ before, after, className }: { before: ReactNode; after: ReactNode; className?: string }) {
  const [position, setPosition] = useState(REST);
  const [settling, setSettling] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stopSweep = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSettling(false);
  };

  useEffect(() => {
    const element = box.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pending = timers.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setSettling(true);
        const steps: [number, () => void][] = [
          [300, () => setPosition(100)],
          [1500, () => setPosition(0)],
          [2700, () => setPosition(REST)],
          [3600, () => setSettling(false)],
        ];
        timers.current = steps.map(([delay, step]) => setTimeout(step, delay));
      },
      { threshold: 0.6 }
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      pending.forEach(clearTimeout);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const fromPointer = (x: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (rect && rect.width > 0) setPosition(clamp(((x - rect.left) / rect.width) * 100));
  };

  return (
    <div
      ref={box}
      className={className ? `hw-compare ${className}` : "hw-compare"}
      data-settling={settling ? "" : undefined}
      style={{ "--pos": `${position}%` } as CSSProperties}
      onPointerDown={(event) => {
        dragging.current = true;
        stopSweep();
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
          stopSweep();
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
          <li key={item.slug} data-track-pos={index + 1}>
            <button
              className="hw-book-tile"
              type="button"
              data-track-cta="book_tile"
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
              data-track-cta={recipe.free ? "open_recipe" : "see_collection"}
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
    <button
      className="hw-ghost"
      type="button"
      aria-label="Say hi to the ghost"
      data-giggle={showing ? "" : undefined}
      onClick={giggle}
      data-track-ux="story"
      data-track-cta="ghost"
    >
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
export function HalloweenDock({ title, price, count, extra, href, onSale }: { title: string; price: string; count: number; extra?: string; href: string; onSale: boolean }) {
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
    <div
      className="hw-dock"
      ref={dock}
      hidden
      data-track-ux="sticky_bar"
      {...(onSale ? offerAttributes("sticky_bar", HALLOWEEN_COLLECTION_SLUG) : {})}
    >
      <p className="hw-dock-text">
        <strong>{title}</strong>
        <span>
          {price} · {count} recipes{extra ? ` ${extra}` : ""}
        </span>
      </p>
      <a className="hw-dock-cta" href={href} data-story-action="collection" data-story-placement="sticky" data-track-cta="get_book">
        {onSale ? "Get it" : "See it"} <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}
