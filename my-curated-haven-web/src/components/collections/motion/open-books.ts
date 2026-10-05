import { OPEN_QUERY } from "./queries";

/**
 * Large screens with motion allowed: as each chapter scrolls in, its book
 * slides over and the cover swings open on its spine, showing the first page,
 * which lists the book's real contents. Scrubbed by scroll, so scrolling back
 * closes it again. gsap.matchMedia undoes everything if the screen shrinks or
 * motion is turned off; the closed book is the resting state.
 */
export async function setupOpeningBooks(root: HTMLElement): Promise<() => void> {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  mm.add(OPEN_QUERY, () => {
    const chapters = Array.from(root.querySelectorAll<HTMLElement>(".cl-chapter"));
    for (const chapter of chapters) {
      const book = chapter.querySelector<HTMLElement>(".cl-book3d");
      const cover = chapter.querySelector<HTMLElement>(".cl-book3d-cover");
      const numeral = chapter.querySelector<HTMLElement>(".cl-numeral");
      if (!book || !cover) continue;

      book.dataset.open = "";
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: chapter, start: "top 72%", end: "top 8%", scrub: 0.7 },
      });
      timeline
        // The spine moves to the middle of the column so the open spread is centred.
        .fromTo(book, { xPercent: 0, rotate: 4, scale: 1 }, { xPercent: 50, rotate: 0, scale: 0.9, duration: 1, ease: "power2.inOut" }, 0)
        .fromTo(cover, { rotateY: 0 }, { rotateY: -162, duration: 0.85, ease: "power2.inOut" }, 0.15);
      if (numeral) timeline.fromTo(numeral, { yPercent: 12 }, { yPercent: -12, duration: 1 }, 0);
    }

    return () => {
      chapters.forEach((chapter) => {
        const book = chapter.querySelector<HTMLElement>(".cl-book3d");
        if (book) delete book.dataset.open;
      });
    };
  });

  void document.fonts?.ready.then(() => ScrollTrigger.refresh());
  return () => mm.revert();
}
