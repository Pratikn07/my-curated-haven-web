"use client";

import { useEffect, useRef } from "react";
import { setupReveals } from "@/components/campaign/motion/reveal";
import { FINE_POINTER, MOTION_QUERY } from "./motion/queries";

/**
 * Marks which chapter fills the middle of the screen: the cloth behind the
 * chapters takes its colour and the shelf rail marks it as current.
 */
function setupFlood(root: HTMLElement): () => void {
  const shelf = root.querySelector<HTMLElement>(".cl-chapters");
  if (!shelf || typeof IntersectionObserver === "undefined") return () => {};
  const chapters = Array.from(shelf.querySelectorAll<HTMLElement>("[data-chapter]"));
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("[data-rail]"));
  if (chapters.length === 0) return () => {};

  const track = root.querySelector<HTMLElement>(".cl-rail-track");
  const pill = track?.querySelector<HTMLElement>(".cl-rail-pill");
  const placePill = () => {
    const current = links.find((link) => link.getAttribute("aria-current") === "true");
    if (!track || !pill || !current) return;
    pill.style.transform = `translateX(${current.offsetLeft}px)`;
    pill.style.width = `${current.offsetWidth}px`;
    track.dataset.pill = "";
  };

  const activate = (chapter: HTMLElement) => {
    shelf.dataset.cloth = chapter.dataset.cloth;
    links.forEach((link) => {
      if (link.dataset.rail === chapter.dataset.chapter) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    placePill();
  };

  activate(chapters[0]);
  shelf.dataset.flood = "";

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) activate(entry.target as HTMLElement);
      }
    },
    // A thin band across the middle of the screen: whichever chapter crosses it is current.
    { rootMargin: "-48% 0px -48% 0px" }
  );
  chapters.forEach((chapter) => observer.observe(chapter));

  window.addEventListener("resize", placePill);
  void document.fonts?.ready.then(placePill);

  return () => {
    observer.disconnect();
    window.removeEventListener("resize", placePill);
    delete shelf.dataset.flood;
    if (track) delete track.dataset.pill;
  };
}

/**
 * Tapping a book (or "Browse the collections") floods the screen with that
 * book's cloth from the finger outward, then lands in its chapter.
 */
function setupFloodTaps(root: HTMLElement): () => void {
  const click = (event: MouseEvent) => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("[data-flood-to]") : null;
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const chapter = root.querySelector<HTMLElement>(`#${CSS.escape(link.dataset.floodTo ?? "")}`);
    if (!chapter || typeof document.body.animate !== "function") return;
    event.preventDefault();

    const box = link.getBoundingClientRect();
    const x = event.clientX || box.left + box.width / 2;
    const y = event.clientY || box.top + box.height / 2;
    const ink = document.createElement("div");
    ink.className = "cl-tap-ink";
    ink.dataset.cloth = chapter.dataset.cloth;
    ink.setAttribute("aria-hidden", "true");
    root.append(ink);

    const spread = ink.animate(
      [{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(150vmax at ${x}px ${y}px)` }],
      { duration: 620, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" }
    );
    spread.onfinish = () => {
      chapter.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
      history.replaceState(null, "", `#${chapter.id}`);
      const settle = ink.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: "ease-out", fill: "forwards" });
      settle.onfinish = () => ink.remove();
      chapter.querySelector<HTMLElement>(".cl-chapter-title")?.focus({ preventScroll: true });
    };
  };
  root.addEventListener("click", click);
  return () => root.removeEventListener("click", click);
}

/** Recipe pages turn over on a tap to show their details; only one is turned at a time. */
function setupPages(root: HTMLElement): () => void {
  const click = (event: MouseEvent) => {
    const page = event.target instanceof Element ? event.target.closest<HTMLButtonElement>(".cl-page") : null;
    if (!page) return;
    const turned = page.getAttribute("aria-pressed") === "true";
    root.querySelectorAll<HTMLButtonElement>('.cl-page[aria-pressed="true"]').forEach((other) => other.setAttribute("aria-pressed", "false"));
    page.setAttribute("aria-pressed", turned ? "false" : "true");
  };
  root.addEventListener("click", click);
  return () => root.removeEventListener("click", click);
}

/** Ambient loops (the books breathing) pause while the hero is off screen. */
function setupAmbientPause(root: HTMLElement): () => void {
  const hero = root.querySelector<HTMLElement>(".cl-hero");
  if (!hero || typeof IntersectionObserver === "undefined") return () => {};
  const observer = new IntersectionObserver(([entry]) => hero.toggleAttribute("data-offscreen", !entry.isIntersecting));
  observer.observe(hero);
  return () => observer.disconnect();
}

/**
 * The mobile buy dock: shown once the buy card has scrolled up out of view,
 * hidden again when the page's end (the next book) arrives. Measured on scroll,
 * because a jump (a link, the back button) can skip an observer's crossing.
 */
function setupDock(root: HTMLElement): () => void {
  const dock = root.querySelector<HTMLElement>(".cl-dock");
  const buy = root.querySelector<HTMLElement>("#buy");
  const end = root.querySelector<HTMLElement>("[data-dock-end]");
  if (!dock || !buy) return () => {};

  let frame = 0;
  const update = () => {
    frame = 0;
    const pastBuy = buy.getBoundingClientRect().bottom < 0;
    const atEnd = end ? end.getBoundingClientRect().top < window.innerHeight : false;
    dock.toggleAttribute("data-on", pastBuy && !atEnd);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  dock.removeAttribute("hidden");
  update();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
  };
}

/**
 * Everything on the collections pages that moves by script. The pages are
 * complete without it; each part cleans up after itself.
 */
export default function CollectionsMotion() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = anchor.current?.closest<HTMLElement>(".cl");
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let disposed = false;
    const cleanups = [setupReveals(root), setupFlood(root), setupDock(root), setupPages(root), setupAmbientPause(root)];
    if (!reduce) cleanups.push(setupFloodTaps(root));

    if (window.matchMedia(FINE_POINTER).matches && !reduce) {
      void import("./motion/pointer")
        .then(({ setupPointer }) => {
          if (!disposed) cleanups.push(setupPointer(root));
        })
        .catch(() => {});
    }

    // Scroll scenes on every screen size, loaded once the first screen is usable.
    let idle = 0;
    if (window.matchMedia(MOTION_QUERY).matches) {
      const start = () => {
        void import("./motion/scenes")
          // A disposed effect (React re-runs effects in development) must not build, or its
          // cleanup would undo the scenes the live effect just set up.
          .then(({ setupScenes }) => (disposed ? null : setupScenes(root)))
          .then((cleanup) => {
            if (!cleanup) return;
            if (disposed) cleanup();
            else cleanups.push(cleanup);
          })
          .catch(() => {
            // The page is complete and still without them.
          });
      };
      idle =
        typeof window.requestIdleCallback === "function"
          ? window.requestIdleCallback(start, { timeout: 1200 })
          : window.setTimeout(start, 600);
    }

    return () => {
      disposed = true;
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return <span ref={anchor} hidden />;
}
