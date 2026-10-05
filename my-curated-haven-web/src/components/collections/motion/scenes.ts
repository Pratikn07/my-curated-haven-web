import { LARGE_QUERY, MOTION_QUERY } from "./queries";

type Gsap = typeof import("gsap").gsap;

/**
 * Scroll scenes for the collections pages, on phones and large screens alike
 * (loaded after the first screen is usable; never with reduced motion).
 *
 * - Hero: the fanned books gather into a stack as the shelf scrolls away.
 * - Chapters: each book rises, straightens and swings open on its spine to its
 *   contents page; recipe pages deal out of the book one by one.
 * - Cloth: each chapter's cloth spreads up from the bottom of the screen over
 *   the last, like dye, instead of a flat crossfade.
 * - How it works: the thread draws with scroll and lights each step it reaches.
 * - Collection page: the book lifts away as the header scrolls.
 *
 * Everything is scrubbed by scroll, so scrolling back plays it in reverse.
 * gsap.matchMedia reverts all of it if motion is turned off; every element's
 * resting state is its CSS state, so nothing is left half-way.
 */
export async function setupScenes(root: HTMLElement): Promise<() => void> {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
  gsap.registerPlugin(ScrollTrigger);
  // Instagram's in-app browser resizes its toolbars while scrolling; don't recalculate for that.
  ScrollTrigger.config({ ignoreMobileResize: true });

  const mm = gsap.matchMedia();
  mm.add({ large: LARGE_QUERY, motion: MOTION_QUERY }, (context) => {
    const { large, motion } = context.conditions as { large: boolean; motion: boolean };
    if (!motion) return;
    root.dataset.scenes = "";
    heroScene(root, gsap);
    chapterScenes(root, gsap, large);
    inkScene(root, gsap);
    threadScene(root, gsap, large);
    detailScene(root, gsap);
    return () => {
      delete root.dataset.scenes;
      root.querySelector<HTMLElement>(".cl-chapters")?.removeAttribute("data-ink");
      root.querySelectorAll<HTMLElement>(".cl-book3d").forEach((book) => delete book.dataset.open);
      root.querySelectorAll<HTMLElement>(".cl-step").forEach((step) => step.classList.remove("is-lit"));
    };
  });

  void document.fonts?.ready.then(() => ScrollTrigger.refresh());
  return () => mm.revert();
}

/** The hand of books closes into a neat stack as the hero scrolls away. */
function heroScene(root: HTMLElement, gsap: Gsap) {
  const hero = root.querySelector<HTMLElement>(".cl-hero");
  const stack = root.querySelector<HTMLElement>(".cl-stack");
  if (!hero || !stack) return;
  gsap.fromTo(
    stack,
    { "--gather": 0 },
    { "--gather": 1, ease: "none", scrollTrigger: { trigger: stack, start: "top 35%", end: "bottom top", scrub: 0.6 } }
  );
}

function chapterScenes(root: HTMLElement, gsap: Gsap, large: boolean) {
  root.querySelectorAll<HTMLElement>(".cl-chapter").forEach((chapter) => {
    const book = chapter.querySelector<HTMLElement>(".cl-book3d");
    const cover = chapter.querySelector<HTMLElement>(".cl-book3d-cover");
    const numeral = chapter.querySelector<HTMLElement>(".cl-numeral");
    const fan = chapter.querySelector<HTMLElement>(".cl-fan");
    const cards = Array.from(chapter.querySelectorAll<HTMLElement>(".cl-fan-card"));

    if (book && cover) {
      book.dataset.open = "";
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: large ? chapter : book,
          // Phones: the book opens while it crosses the screen, so it's fully open by the time it's read.
          start: large ? "top 72%" : "top 100%",
          end: large ? "top 8%" : "top 34%",
          scrub: 0.6,
        },
      });
      timeline
        // It rises and straightens as it arrives...
        .fromTo(book, { y: large ? 30 : 70, rotate: 7, scale: 0.9 }, { y: 0, rotate: 0, scale: 1, duration: 0.45, ease: "power2.out" }, 0)
        // ...then slides so its spine sits in the middle, and the cover swings open.
        .to(book, { xPercent: 50, scale: large ? 0.9 : 0.8, duration: 0.55, ease: "power2.inOut" }, 0.4)
        .fromTo(cover, { rotateY: 0 }, { rotateY: -162, duration: 0.55, ease: "power2.inOut" }, 0.42);
      if (numeral) timeline.fromTo(numeral, { yPercent: 25, opacity: 0.2 }, { yPercent: -10, opacity: 1, duration: 1 }, 0);
    }

    if (fan && cards.length > 0) {
      // Pages deal out of the book one after another as the fan comes up the screen.
      gsap.fromTo(
        cards,
        { "--deal": 0 },
        {
          "--deal": 1,
          ease: "power2.out",
          stagger: 0.18,
          scrollTrigger: { trigger: fan, start: large ? "top 90%" : "top 98%", end: large ? "top 50%" : "top 52%", scrub: 0.5 },
        }
      );
    }
  });
}

/** Each chapter's cloth spreads up from the bottom of the screen over the one before. */
function inkScene(root: HTMLElement, gsap: Gsap) {
  const shelf = root.querySelector<HTMLElement>(".cl-chapters");
  if (!shelf) return;
  const layers = Array.from(shelf.querySelectorAll<HTMLElement>(".cl-ink"));
  if (layers.length === 0) return;
  shelf.dataset.ink = "";
  layers.forEach((layer, index) => {
    if (index === 0) return;
    const chapter = shelf.querySelector<HTMLElement>(`#${CSS.escape(layer.dataset.ink ?? "")}`);
    if (!chapter) return;
    gsap.fromTo(
      layer,
      { clipPath: "circle(0% at 50% 108%)" },
      {
        clipPath: "circle(150% at 50% 108%)",
        ease: "power1.in",
        scrollTrigger: { trigger: chapter, start: "top bottom", end: "top 20%", scrub: true },
      }
    );
  });
}

/** The stitched thread draws with scroll and lights each step as it reaches it. */
function threadScene(root: HTMLElement, gsap: Gsap, large: boolean) {
  const steps = root.querySelector<HTMLElement>(".cl-steps");
  const thread = steps?.querySelector<HTMLElement>(".cl-thread");
  if (!steps || !thread) return;
  gsap.fromTo(
    thread,
    large ? { scaleX: 0 } : { scaleY: 0 },
    {
      ...(large ? { scaleX: 1 } : { scaleY: 1 }),
      ease: "none",
      scrollTrigger: { trigger: steps, start: "top 75%", end: large ? "top 25%" : "bottom 55%", scrub: 0.4 },
    }
  );
  steps.querySelectorAll<HTMLElement>(".cl-step").forEach((step) => {
    gsap.timeline({
      scrollTrigger: {
        trigger: step,
        start: large ? "top 60%" : "top 68%",
        toggleClass: { targets: step, className: "is-lit" },
      },
    });
  });
}

/** Collection page: the book lifts and turns away as the header scrolls. */
function detailScene(root: HTMLElement, gsap: Gsap) {
  const hero = root.querySelector<HTMLElement>(".cl-dhero");
  const book = hero?.querySelector<HTMLElement>(".cl-tilt");
  if (!hero || !book) return;
  gsap.fromTo(
    book,
    { y: 0, rotate: -3, scale: 1 },
    { y: -60, rotate: -9, scale: 0.92, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.5 } }
  );
}
