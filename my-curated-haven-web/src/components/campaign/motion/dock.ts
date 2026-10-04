/**
 * Shows the recipe dock once the promised recipes have scrolled past, and
 * hides it again while the hero, the recipes, an offer, the closing or the
 * site footer is on screen, so it never sits on top of what it points to or
 * competes with a price. Hidden means inert: not focusable, not announced.
 */
export function setupDock(root: HTMLElement): () => void {
  const dock = root.querySelector<HTMLElement>(".cp-dock");
  const inner = dock?.querySelector<HTMLElement>(".cp-dock-inner");
  const recipes = root.querySelector<HTMLElement>("#cp-recipes");
  if (!dock || !inner || !recipes || typeof IntersectionObserver === "undefined") return () => {};

  const blockers = [
    root.querySelector(".cp-hero"),
    recipes,
    root.querySelector(".cp-pack"),
    root.querySelector(".cp-collection"),
    root.querySelector(".cp-closing"),
    document.querySelector("footer"),
  ].filter((element): element is Element => element !== null);

  const onScreen = new Set<Element>();
  let frame = 0;
  const update = () => {
    frame = 0;
    const passed = recipes.getBoundingClientRect().bottom < 0;
    const visible = passed && onScreen.size === 0;
    dock.dataset.visible = String(visible);
    inner.inert = !visible;
  };

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) onScreen.add(entry.target);
      else onScreen.delete(entry.target);
    }
    if (!frame) frame = requestAnimationFrame(update);
  });
  blockers.forEach((element) => observer.observe(element));
  inner.inert = true;

  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    dock.dataset.visible = "false";
    inner.inert = true;
  };
}
