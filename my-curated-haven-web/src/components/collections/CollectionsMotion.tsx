"use client";

import { useEffect, useRef } from "react";
import { setupReveals } from "@/components/campaign/motion/reveal";
import { FINE_POINTER, OPEN_QUERY } from "./motion/queries";

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

  const activate = (chapter: HTMLElement) => {
    shelf.dataset.cloth = chapter.dataset.cloth;
    links.forEach((link) => {
      if (link.dataset.rail === chapter.dataset.chapter) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
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

  return () => {
    observer.disconnect();
    delete shelf.dataset.flood;
  };
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
    const cleanups = [setupReveals(root), setupFlood(root), setupDock(root)];

    if (window.matchMedia(FINE_POINTER).matches && !reduce) {
      void import("./motion/pointer")
        .then(({ setupPointer }) => {
          if (!disposed) cleanups.push(setupPointer(root));
        })
        .catch(() => {});
    }

    if (root.querySelector(".cl-book3d") && window.matchMedia(OPEN_QUERY).matches) {
      void import("./motion/open-books")
        // A disposed effect (React re-runs effects in development) must not build, or its
        // cleanup would close the books the live effect just opened.
        .then(({ setupOpeningBooks }) => (disposed ? null : setupOpeningBooks(root)))
        .then((cleanup) => {
          if (!cleanup) return;
          if (disposed) cleanup();
          else cleanups.push(cleanup);
        })
        .catch(() => {});
    }

    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return <span ref={anchor} hidden />;
}
