"use client";

import { useEffect, useRef } from "react";

type Gsap = typeof import("gsap").gsap;
type ScrollTriggerType = typeof import("gsap/ScrollTrigger").ScrollTrigger;

/**
 * Large screens with motion allowed only. Phones, Instagram's in-app browser on
 * a phone, and anyone who prefers less motion keep the CSS story and never
 * download GSAP.
 */
const PINNED_QUERY = "(min-width: 1024px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)";

/** Timeline units: each moment gets one unit of scroll, the new photo opens a quarter of the way in. */
const STEP = 1;
const OPEN_AT = 0.25;
const TEXT_AT = 0.35;
const TAIL = 0.65;

function buildPinnedStory(section: HTMLElement, gsap: Gsap, ScrollTrigger: ScrollTriggerType) {
  const track = section.querySelector<HTMLElement>(".cp-story-track");
  const stage = section.querySelector<HTMLElement>(".cp-story-stage");
  const moments = Array.from(section.querySelectorAll<HTMLElement>(".cp-moment"));
  if (!track || !stage || moments.length < 2) return;

  section.dataset.motion = "pinned";

  const shots = moments.map((moment) => moment.querySelector<HTMLElement>(".cp-moment-shot")!);
  const photos = moments.map((moment) => moment.querySelector<HTMLElement>(".cp-moment-shot img")!);
  const texts = moments.map((moment) => moment.querySelector<HTMLElement>(".cp-moment-text")!);
  const origins = moments.map((moment) => getComputedStyle(moment).getPropertyValue("--origin").trim() || "50% 60%");
  const ticks = Array.from(section.querySelectorAll<HTMLElement>(".cp-story-tick"));
  const fill = section.querySelector<HTMLElement>(".cp-story-progress-fill");
  const drift = Array.from(section.querySelectorAll<HTMLElement>('.cp-motif[data-placement="story"] .cp-motif-item'));
  const count = moments.length;

  gsap.set(texts.slice(1), { opacity: 0, y: 28 });
  gsap.set(photos, { scale: 1.14, transformOrigin: "50% 60%" });
  gsap.set(photos[0], { scale: 1.06 });
  shots.slice(1).forEach((shot, index) => gsap.set(shot, { clipPath: `circle(0% at ${origins[index + 1]})` }));

  const timeline = gsap.timeline({ defaults: { ease: "none" } });
  // The first moment settles while the parent reads the heading.
  timeline.to(photos[0], { scale: 1, duration: STEP * 0.9, ease: "power1.out" }, 0);

  for (let index = 1; index < count; index += 1) {
    const at = (index - 1) * STEP + OPEN_AT;
    timeline
      // The next moment opens from where the hands are, like the eye moving to them.
      .to(shots[index], { clipPath: `circle(145% at ${origins[index]})`, duration: 0.7, ease: "power2.inOut" }, at)
      .fromTo(photos[index], { scale: 1.16 }, { scale: 1, duration: 1.1, ease: "power2.out" }, at)
      // The moment before leans back a little, for depth.
      .to(photos[index - 1], { scale: 1.08, duration: 0.7, ease: "power1.in" }, at)
      .to(texts[index - 1], { opacity: 0, y: -24, duration: 0.25, ease: "power1.in" }, at + 0.1)
      .fromTo(texts[index], { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, at + TEXT_AT);
  }

  // A short rest on the last moment before the stage lets go.
  const length = (count - 1) * STEP + TAIL;
  if (timeline.duration() < length) timeline.to({}, { duration: length - timeline.duration() });
  if (fill) timeline.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: timeline.duration() }, 0);
  drift.forEach((item, index) => {
    timeline.fromTo(item, { yPercent: 0 }, { yPercent: -(70 + index * 55), duration: timeline.duration() }, 0);
  });

  let active = 0;
  const setActive = (time: number) => {
    let next = 0;
    for (let index = 1; index < count; index += 1) {
      if (time >= (index - 1) * STEP + OPEN_AT + TEXT_AT) next = index;
    }
    if (next === active) return;
    active = next;
    ticks.forEach((tick, index) => {
      if (index <= active) tick.dataset.active = "true";
      else delete tick.dataset.active;
    });
  };

  ScrollTrigger.create({
    trigger: track,
    // The stage sticks under the site header; its computed top is that offset in pixels.
    start: () => `top top+=${parseFloat(getComputedStyle(stage).top) || 0}`,
    end: "bottom bottom",
    animation: timeline,
    scrub: 0.8,
    invalidateOnRefresh: true,
    onUpdate: (self) => setActive(self.progress * timeline.duration()),
  });

  return () => {
    delete section.dataset.motion;
    ticks.forEach((tick, index) => {
      if (index === 0) tick.dataset.active = "true";
      else delete tick.dataset.active;
    });
  };
}

/**
 * Pins the kitchen story on large screens and moves through its moments with
 * scroll. GSAP loads only when the story is near or the browser is idle, and
 * gsap.matchMedia undoes everything if the screen shrinks or motion is turned off.
 */
export default function KitchenStoryMotion() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = anchor.current?.closest<HTMLElement>(".cp-story");
    if (!section || typeof IntersectionObserver === "undefined") return;

    const media = window.matchMedia(PINNED_QUERY);
    let disposed = false;
    let started = false;
    let revert: (() => void) | null = null;

    const start = () => {
      if (started || disposed || !media.matches) return;
      started = true;
      void Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
        .then(([{ gsap }, { ScrollTrigger }]) => {
          if (disposed) return;
          gsap.registerPlugin(ScrollTrigger);
          const mm = gsap.matchMedia();
          mm.add(PINNED_QUERY, () => buildPinnedStory(section, gsap, ScrollTrigger));
          revert = () => mm.revert();
        })
        .catch(() => {
          // The stacked story stays; nothing depends on the script.
        });
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) start();
    }, { rootMargin: "150% 0px" });
    observer.observe(section);

    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(start, { timeout: 2500 })
        : window.setTimeout(start, 1500);
    const onChange = () => start();
    media.addEventListener("change", onChange);

    return () => {
      disposed = true;
      observer.disconnect();
      media.removeEventListener("change", onChange);
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      revert?.();
    };
  }, []);

  return <span ref={anchor} hidden />;
}
