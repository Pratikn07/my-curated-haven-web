/**
 * Marks each [data-reveal] element with data-inview the first time it reaches
 * the screen; campaign.css does the moving. Anything already on screen is
 * marked before the page is flagged ready, so nothing visible jumps back to
 * hide. Returns a cleanup that leaves every element in its revealed state.
 */
export function setupReveals(root: HTMLElement): () => void {
  const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
  const show = (element: Element) => element.setAttribute("data-inview", "");

  if (typeof IntersectionObserver === "undefined") {
    items.forEach(show);
    return () => {};
  }

  const height = window.innerHeight;
  const pending = items.filter((element) => {
    const box = element.getBoundingClientRect();
    if (box.height > 0 && box.top < height && box.bottom > 0) {
      show(element);
      return false;
    }
    return true;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        show(entry.target);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px" }
  );
  pending.forEach((element) => observer.observe(element));
  root.dataset.motionReady = "true";

  return () => {
    observer.disconnect();
    items.forEach(show);
    delete root.dataset.motionReady;
  };
}

/** Numbers that count up from zero the first time they are seen, like a timer settling. */
export function setupCountUps(root: HTMLElement): () => void {
  const items = Array.from(root.querySelectorAll<HTMLElement>("[data-count-to]"));
  if (items.length === 0 || typeof IntersectionObserver === "undefined") return () => {};

  const frames = new Map<HTMLElement, number>();
  const run = (element: HTMLElement) => {
    const target = Number(element.dataset.countTo);
    if (!Number.isFinite(target) || target < 2) return;
    // Hold the final width so the line doesn't shuffle while the digits change.
    element.style.display = "inline-block";
    element.style.minWidth = `${String(target).length}ch`;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 1100);
      element.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 4))));
      if (progress < 1) frames.set(element, requestAnimationFrame(tick));
      else frames.delete(element);
    };
    element.textContent = "0";
    frames.set(element, requestAnimationFrame(tick));
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        run(entry.target as HTMLElement);
      }
    },
    { rootMargin: "0px 0px -12% 0px" }
  );
  items.forEach((element) => observer.observe(element));

  return () => {
    observer.disconnect();
    frames.forEach((frame) => cancelAnimationFrame(frame));
    items.forEach((element) => {
      element.textContent = element.dataset.countTo ?? element.textContent;
    });
  };
}
