type Gsap = typeof import("gsap").gsap;
type ScrollTriggerType = typeof import("gsap/ScrollTrigger").ScrollTrigger;

/**
 * Scroll motion for /halloween. Unlike the campaign pages, this runs on phones
 * too: the walk down the street is the point of the page. It still stays out of
 * the way of anyone who asked for less, so reduced motion and Data Saver keep
 * the still page (every layer in place, every light on).
 */
export function shouldAnimate(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !connection?.saveData;
}

/** Height of everything stuck to the top of the screen: the site header and the clock pill. */
function topOffset(root: HTMLElement): number {
  const header = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
  const pill = root.querySelector<HTMLElement>(".hw-clock")?.getBoundingClientRect().height ?? 0;
  return Math.round(header + pill + 18);
}

function buildStreet(root: HTMLElement, gsap: Gsap) {
  const section = root.querySelector<HTMLElement>("#hw-walk");
  const street = section?.querySelector<HTMLElement>(".hw-street");
  const sky = street?.querySelector<HTMLElement>(".hw-s-sky");
  const houses = street?.querySelector<HTMLElement>(".hw-s-houses");
  const fore = street?.querySelector<HTMLElement>(".hw-s-fore");
  const walkers = street?.querySelector<HTMLElement>(".hw-s-walkers");
  if (!section || !street || !sky || !houses || !fore || !walkers) return;

  const centres = (street.dataset.houses ?? "").split(",").map(Number).filter((value) => value > 0 && value < 1);
  const travel = () => Math.max(0, houses.offsetWidth - street.clientWidth);
  const walkerX = () => walkers.offsetLeft + walkers.offsetWidth * 0.55;

  // The street holds still while scrolling walks them past the houses: houses at walking pace,
  // the pumpkins in front faster, the sky barely, so the layers read as depth.
  const walk = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: () => `top top+=${topOffset(root)}`,
      end: () => `+=${Math.max(700, travel() * 2.6)}`,
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });
  walk
    .fromTo(houses, { x: 0 }, { x: () => -travel(), ease: "none", duration: 1 }, 0)
    .fromTo(sky, { x: 0 }, { x: () => -travel() * 0.2, ease: "none", duration: 1 }, 0)
    .fromTo(fore, { x: 0 }, { x: () => -travel() * 1.6, ease: "none", duration: 1 }, 0)
    .fromTo([houses, sky], { scale: 1 }, { scale: 1.04, transformOrigin: "50% 100%", ease: "none", duration: 1 }, 0);

  // Each house lights up as they reach it.
  centres.forEach((centre, index) => {
    const reach = gsap.utils.clamp(0, travel(), centre * houses.offsetWidth - walkerX());
    const at = gsap.utils.clamp(0.04, 0.92, (reach - 30) / Math.max(1, travel()));
    const lit = houses.querySelector(`.hw-s-on[data-i="${index}"]`);
    const pool = houses.querySelector(`.hw-s-pool[data-i="${index}"]`);
    if (lit) walk.to(lit, { opacity: 1, duration: 0.07 }, at);
    if (pool) walk.to(pool, { opacity: 1, duration: 0.1 }, at + 0.02);
  });

  // On the way in, each layer drifts into place at its own speed.
  gsap
    .timeline({ scrollTrigger: { trigger: street, start: "top bottom", end: "top 30%", scrub: true } })
    .fromTo(sky, { y: -24 }, { y: 0, ease: "none" }, 0)
    .fromTo(houses, { y: 34 }, { y: 0, ease: "none" }, 0)
    .fromTo(walkers, { y: 50 }, { y: 0, ease: "none" }, 0)
    .fromTo(fore, { y: 70 }, { y: 0, ease: "none" }, 0);
}

function buildSky(root: HTMLElement, gsap: Gsap) {
  const sky = root.querySelector<HTMLElement>(".hw-sky");
  if (!sky) return;
  let previous = getComputedStyle(sky).backgroundColor;
  root.querySelectorAll<HTMLElement>("[data-hw-sky]").forEach((section, index) => {
    const colour = section.dataset.hwSky!;
    const late = section.classList.contains("hw-late");
    gsap.fromTo(
      sky,
      { backgroundColor: previous },
      {
        backgroundColor: colour,
        ease: "none",
        immediateRender: index === 0,
        scrollTrigger: { trigger: section, start: late ? "top 65%" : "top 90%", end: late ? "top 15%" : "top 35%", scrub: true },
      }
    );
    previous = colour;
  });
  gsap
    .timeline({ scrollTrigger: { trigger: "#hw-walk", start: "top 70%", endTrigger: "#hw-night", end: "top 30%", scrub: true, invalidateOnRefresh: true } })
    .fromTo(".hw-moon", { y: () => window.innerHeight * 0.6, opacity: 0 }, { y: 0, opacity: 1, ease: "none" })
    .to(".hw-stars", { opacity: 1, ease: "none" }, 0);
  // Once the story is over the moon steps back, so it never sits behind the headings that follow.
  gsap.fromTo(".hw-moon", { opacity: 1 }, {
    opacity: 0,
    ease: "none",
    immediateRender: false,
    scrollTrigger: { trigger: ".hw-reasons", start: "top 85%", end: "top 45%", scrub: true },
  });
}

export function buildHalloweenMotion(root: HTMLElement, gsap: Gsap, ScrollTrigger: ScrollTriggerType): () => void {
  gsap.registerPlugin(ScrollTrigger);
  // Set first: the stylesheet hands the layers and the night sky over to the script.
  root.dataset.motion = "on";

  const context = gsap.context(() => {
    // The pinned street comes first, so every trigger below it accounts for its scroll length.
    buildStreet(root, gsap);
    buildSky(root, gsap);

    // Cards settle like prints as they arrive. Nothing is hidden waiting for them.
    gsap.utils.toArray<HTMLElement>(".hw-trick, .hw-chapter .hw-card, .hw-photo, .hw-window, .hw-reasons li, .hw-buy").forEach((element) => {
      gsap.from(element, {
        y: 44,
        rotate: () => gsap.utils.random(-2, 2),
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: element, start: "top 92%", toggleActions: "play none none reverse" },
      });
    });

    gsap.fromTo(".hw-ghost", { x: 70, rotate: 25 }, {
      x: 0,
      rotate: -6,
      ease: "none",
      scrollTrigger: { trigger: ".hw-ghost", start: "top 95%", end: "top 45%", scrub: true },
    });

    // The book lifts, then its cover swings open to the photos inside. The book slides right by
    // about half the open cover's width, so the cover stays on a phone screen.
    const coverWidth = () => root.querySelector<HTMLElement>(".hw-book-cover")?.offsetWidth ?? 0;
    gsap
      .timeline({
        scrollTrigger: { trigger: ".hw-book", start: "top 72%", end: "top 18%", scrub: true, refreshPriority: -1, invalidateOnRefresh: true },
      })
      .to(".hw-book-cover", { y: -10, duration: 0.2, ease: "none" })
      .to(".hw-book-cover", { rotateY: -108, duration: 0.8, ease: "power1.inOut" }, 0.15)
      .to(".hw-book", { x: () => coverWidth() * 0.17, duration: 0.8, ease: "power1.inOut" }, 0.15);
  }, root);

  // Photos arrive late inside Instagram's browser; measure again once they have. When the page had
  // already loaded before this ran, measure now, or the book (refreshPriority -1) is never measured.
  const refresh = () => ScrollTrigger.refresh();
  if (document.readyState === "complete") refresh();
  else window.addEventListener("load", refresh);

  return () => {
    window.removeEventListener("load", refresh);
    context.revert();
    delete root.dataset.motion;
  };
}
