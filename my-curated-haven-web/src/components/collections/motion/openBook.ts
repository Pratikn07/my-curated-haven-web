/**
 * Opening a book on the bookcase (option A, chosen 2026-10-06; see
 * docs/implementation/recipe-collections/BOOK-MOTION.md).
 *
 * A tap lifts the book from its shelf to the middle of the screen, swings the
 * cover open on its spine to a contents page, and hands over to the
 * collection page, which loads while the cover opens. The overlay lives on
 * <body>, outside React, so it survives the route change and fades once the
 * new page has drawn underneath it.
 *
 * Only transform and opacity move, with the browser's own animation API (no
 * library). A modified click, reduced motion, or a browser without the API
 * gets the plain link. Anything unexpected falls back to plain navigation.
 */

const LIFT_MS = 380;
const OPEN_MS = 620;
const HOLD_MS = 140;
const FADE_MS = 320;
const GIVE_UP_MS = 6000;
const COVER_RATIO = 1412 / 1040;
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

let opening = false;

/** Whether this click should open the book rather than follow the link plainly. */
export function shouldOpenBook(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (typeof Element === "undefined" || !("animate" in Element.prototype)) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return true;
}

/** True while a book is opening; further taps wait for it. */
export function isOpeningBook(): boolean {
  return opening;
}

interface OpenBookOptions {
  link: HTMLAnchorElement;
  title: string;
  contents: readonly string[];
  total: number;
  cloth: string;
  navigate: () => void;
}

export function openBook({ link, title, contents, total, cloth, navigate }: OpenBookOptions): void {
  const source = link.querySelector<HTMLElement>(".cl-book");
  if (!source || opening) {
    navigate();
    return;
  }
  opening = true;

  let overlay: HTMLDivElement | null = null;
  let safety = 0;
  const cleanUp = () => {
    window.clearTimeout(safety);
    overlay?.remove();
    overlay = null;
    source.style.visibility = "";
    opening = false;
  };
  // Timers keep running in a background tab while animation frames pause, so the
  // overlay always goes, even if the parent switches apps mid-animation.
  safety = window.setTimeout(cleanUp, LIFT_MS + OPEN_MS + GIVE_UP_MS + 1500);
  try {
    const from = source.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // The open spread (inside cover + contents page) is two book widths and must fit the screen.
    const width = Math.min(vw * 0.45, 300, (vh * 0.58) / COVER_RATIO);
    const height = width * COVER_RATIO;
    const spineX = vw / 2;
    const top = (vh - height) / 2;

    overlay = buildOverlay({ source, title, contents, total, cloth, width, height, spineX, top });
    document.body.appendChild(overlay);
    source.style.visibility = "hidden";

    const book = overlay.querySelector<HTMLElement>(".bk-open-book")!;
    const cover = overlay.querySelector<HTMLElement>(".bk-open-cover")!;
    const scrim = overlay.querySelector<HTMLElement>(".bk-open-scrim")!;
    const fold = overlay.querySelector<HTMLElement>(".bk-open-fold")!;

    const closed = `translate(${-width / 2}px, 0px) scale(1)`;
    const start = `translate(${from.left - spineX}px, ${from.top - top}px) scale(${from.width / width})`;

    scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: LIFT_MS, easing: EASE_OUT, fill: "both" });
    const lift = book.animate([{ transform: start }, { transform: closed }], { duration: LIFT_MS, easing: EASE_OUT, fill: "both" });

    lift.finished
      .then(() => {
        // The collection page starts loading while the cover opens.
        navigate();
        book.animate([{ transform: closed }, { transform: "translate(0px, 0px) scale(1)" }], {
          duration: OPEN_MS,
          easing: EASE_IN_OUT,
          fill: "both",
        });
        fold.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: OPEN_MS, easing: EASE_IN_OUT, fill: "both" });
        return cover.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(-180deg)" }], {
          duration: OPEN_MS,
          easing: EASE_IN_OUT,
          fill: "both",
        }).finished;
      })
      .then(() => waitForRoute(link.pathname))
      .then(() => wait(HOLD_MS))
      .then(() => overlay?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: "ease-out", fill: "both" }).finished)
      .catch(() => undefined)
      .finally(cleanUp);
  } catch {
    cleanUp();
    navigate();
  }
}

function buildOverlay(options: {
  source: HTMLElement;
  title: string;
  contents: readonly string[];
  total: number;
  cloth: string;
  width: number;
  height: number;
  spineX: number;
  top: number;
}): HTMLDivElement {
  const { source, title, contents, total, cloth, width, height, spineX, top } = options;
  const overlay = document.createElement("div");
  // Inside .cl so the cloth colours and fonts apply; aria-hidden because the link already navigates.
  overlay.className = "cl bk bk-open";
  overlay.setAttribute("aria-hidden", "true");
  overlay.dataset.cloth = cloth;

  const scrim = el("div", "bk-open-scrim");
  const book = el("div", "bk-open-book");
  Object.assign(book.style, { left: `${spineX}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
  book.style.setProperty("--bk-open-w", `${width}px`);

  const page = el("div", "bk-open-page");
  page.appendChild(el("span", "bk-open-eyebrow", "Contents"));
  page.appendChild(el("span", "bk-open-title", title));
  const list = el("ol", "bk-open-list");
  for (const line of contents) list.appendChild(el("li", "", line));
  page.appendChild(list);
  if (total > contents.length) page.appendChild(el("span", "bk-open-more", `and ${total - contents.length} more`));
  page.appendChild(el("span", "bk-open-fold"));

  const cover = el("div", "bk-open-cover");
  const front = source.cloneNode(true) as HTMLElement;
  front.style.visibility = "";
  front.classList.add("bk-open-front");
  cover.appendChild(front);
  cover.appendChild(el("div", "bk-open-inside"));

  book.appendChild(page);
  book.appendChild(cover);
  overlay.appendChild(scrim);
  overlay.appendChild(book);
  return overlay;
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Resolves once the address shows the collection page (the new page has rendered), or after a while regardless. */
function waitForRoute(pathname: string): Promise<void> {
  return new Promise((resolve) => {
    const started = performance.now();
    const check = () => {
      if (window.location.pathname === pathname || performance.now() - started > GIVE_UP_MS) {
        // Two frames so the new page has painted under the overlay before it fades;
        // a timer as well, because frames pause in a background tab.
        let done = false;
        const finish = () => {
          if (!done) {
            done = true;
            resolve();
          }
        };
        requestAnimationFrame(() => requestAnimationFrame(finish));
        window.setTimeout(finish, 150);
      } else {
        window.setTimeout(check, 40);
      }
    };
    check();
  });
}
