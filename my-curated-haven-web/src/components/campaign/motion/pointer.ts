type Off = () => void;

function listen<K extends keyof HTMLElementEventMap>(
  target: HTMLElement | Document,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  off: Off[]
) {
  target.addEventListener(type, handler as EventListener, { passive: true });
  off.push(() => target.removeEventListener(type, handler as EventListener));
}

/** Where the pointer is inside a box, from 0 to 1 on each axis. */
function within(event: PointerEvent, element: Element) {
  const box = element.getBoundingClientRect();
  return { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height, box };
}

/**
 * Buttons lean toward the pointer, and their darker fill grows from where it
 * came in. Every .cp-button gets the fill; [data-magnetic] ones also lean.
 */
function buttons(root: HTMLElement, off: Off[]) {
  root.querySelectorAll<HTMLElement>(".cp-button").forEach((button) => {
    const magnetic = button.hasAttribute("data-magnetic");
    const aim = (event: PointerEvent) => {
      const { x, y } = within(event, button);
      button.style.setProperty("--cp-hx", `${(x * 100).toFixed(1)}%`);
      button.style.setProperty("--cp-hy", `${(y * 100).toFixed(1)}%`);
      if (!magnetic) return;
      button.style.setProperty("--cp-mx", `${((x - 0.5) * 12).toFixed(1)}px`);
      button.style.setProperty("--cp-my", `${((y - 0.5) * 9).toFixed(1)}px`);
    };
    listen(button, "pointerenter", aim, off);
    listen(button, "pointermove", aim, off);
    listen(
      button,
      "pointerleave",
      (event) => {
        aim(event);
        button.style.removeProperty("--cp-mx");
        button.style.removeProperty("--cp-my");
      },
      off
    );
  });
}

/** Recipe cards tilt a few degrees under the pointer, less for the big single card. */
function tilt(root: HTMLElement, off: Off[]) {
  root.querySelectorAll<HTMLElement>("[data-tilt]").forEach((card) => {
    listen(
      card,
      "pointermove",
      (event) => {
        const { x, y, box } = within(event, card);
        const range = box.width > 640 ? 2.2 : 5;
        card.setAttribute("data-tilting", "");
        card.style.setProperty("--ry", `${((x - 0.5) * range).toFixed(2)}deg`);
        card.style.setProperty("--rx", `${((0.5 - y) * range * 0.8).toFixed(2)}deg`);
      },
      off
    );
    listen(
      card,
      "pointerleave",
      () => {
        card.removeAttribute("data-tilting");
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
      },
      off
    );
  });
}

/**
 * A round label that follows the mouse over things it can open or drag
 * ([data-cursor]). The real cursor stays; this only says what a click does.
 * On recipe cards it shows over the photo only, not over the words.
 */
function cursorLabel(root: HTMLElement, off: Off[]) {
  const label = document.createElement("div");
  label.className = "cp-cursor";
  label.setAttribute("aria-hidden", "true");
  root.appendChild(label);
  off.push(() => label.remove());

  let x = 0;
  let y = 0;
  let shownX = 0;
  let shownY = 0;
  let frame = 0;
  let active: HTMLElement | null = null;

  const loop = () => {
    shownX += (x - shownX) * 0.22;
    shownY += (y - shownY) * 0.22;
    label.style.transform = `translate3d(${shownX.toFixed(1)}px, ${shownY.toFixed(1)}px, 0)`;
    frame = Math.abs(x - shownX) + Math.abs(y - shownY) > 0.2 ? requestAnimationFrame(loop) : 0;
  };

  const zoneFor = (event: PointerEvent): HTMLElement | null => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-cursor]") : null;
    if (!target || !root.contains(target)) return null;
    const photo = target.querySelector(".cp-recipe-photo");
    if (!photo) return target;
    const box = photo.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    return inside ? target : null;
  };

  listen(
    document,
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") return;
      x = event.clientX;
      y = event.clientY;
      const zone = zoneFor(event);
      if (zone !== active) {
        if (zone && !active) {
          // Appear where the pointer is, not slide in from the last place it was.
          shownX = x;
          shownY = y;
        }
        active = zone;
        if (zone) label.textContent = zone.dataset.cursor ?? "";
        label.toggleAttribute("data-on", Boolean(zone));
      }
      if (!frame) frame = requestAnimationFrame(loop);
    },
    off
  );
  listen(
    document.documentElement,
    "pointerleave",
    () => {
      active = null;
      label.removeAttribute("data-on");
    },
    off
  );
  off.push(() => cancelAnimationFrame(frame));
}

/**
 * The hero's letters thicken as the pointer passes over them, like pressing
 * into soft dough. Fraunces is a variable font, so only its weight changes.
 */
function proximity(root: HTMLElement, off: Off[]) {
  const title = root.querySelector<HTMLElement>("[data-proximity]");
  const zone = title?.closest<HTMLElement>(".cp-hero");
  if (!title || !zone) return;
  const letters = Array.from(title.querySelectorAll<HTMLElement>(".cp-char")).map((element) => ({
    element,
    base: element.closest("[data-em]") ? 340 : 300,
  }));
  let px = 0;
  let py = 0;
  let frame = 0;

  const paint = () => {
    frame = 0;
    for (const letter of letters) {
      const box = letter.element.getBoundingClientRect();
      const distance = Math.hypot(box.left + box.width / 2 - px, box.top + box.height / 2 - py);
      const near = Math.max(0, 1 - distance / 190);
      const eased = near * near * (3 - 2 * near);
      if (eased > 0.01) letter.element.style.setProperty("--cp-wght", String(Math.round(letter.base + eased * 380)));
      else letter.element.style.removeProperty("--cp-wght");
    }
  };

  listen(
    zone,
    "pointermove",
    (event) => {
      px = event.clientX;
      py = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    },
    off
  );
  listen(
    zone,
    "pointerleave",
    () => {
      cancelAnimationFrame(frame);
      frame = 0;
      letters.forEach((letter) => letter.element.style.removeProperty("--cp-wght"));
    },
    off
  );
  off.push(() => cancelAnimationFrame(frame));
}

/** Drawn ingredients and the hero's prints lean with the pointer (--depth in campaign.css). */
function depth(root: HTMLElement, off: Off[]) {
  root.querySelectorAll<HTMLElement>(".cp-hero, .cp-story, .cp-closing").forEach((zone) => {
    listen(
      zone,
      "pointermove",
      (event) => {
        const { x, y } = within(event, zone);
        zone.style.setProperty("--cp-px", (x * 2 - 1).toFixed(3));
        zone.style.setProperty("--cp-py", (y * 2 - 1).toFixed(3));
      },
      off
    );
    listen(
      zone,
      "pointerleave",
      () => {
        zone.style.removeProperty("--cp-px");
        zone.style.removeProperty("--cp-py");
      },
      off
    );
  });
}

/** Mouse-only details. Touch screens and reduced motion never call this. */
export function setupPointer(root: HTMLElement): () => void {
  const off: Off[] = [];
  buttons(root, off);
  tilt(root, off);
  cursorLabel(root, off);
  proximity(root, off);
  depth(root, off);
  return () => off.forEach((remove) => remove());
}

/**
 * The related shelf can be dragged with a mouse, like sliding cards across a
 * table. A drag never opens the card it ends on; a plain click still does.
 */
export function setupShelfDrag(root: HTMLElement): () => void {
  const shelf = root.querySelector<HTMLElement>("[data-drag]");
  if (!shelf) return () => {};
  const off: Off[] = [];
  let pointer: number | null = null;
  let startX = 0;
  let startLeft = 0;
  let moved = 0;

  listen(
    shelf,
    "pointerdown",
    (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      pointer = event.pointerId;
      startX = event.clientX;
      startLeft = shelf.scrollLeft;
      moved = 0;
    },
    off
  );
  listen(
    shelf,
    "pointermove",
    (event) => {
      if (event.pointerId !== pointer) return;
      const dx = event.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved < 5) return;
      if (!shelf.hasAttribute("data-dragging")) {
        shelf.setAttribute("data-dragging", "");
        shelf.setPointerCapture(event.pointerId);
      }
      shelf.scrollLeft = startLeft - dx;
    },
    off
  );
  const end = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    if (!shelf.hasAttribute("data-dragging")) return;
    shelf.removeAttribute("data-dragging");
    // Settle on the nearest card, as a swipe would.
    const cards = Array.from(shelf.children) as HTMLElement[];
    const padding = parseFloat(getComputedStyle(shelf).scrollPaddingInlineStart) || 0;
    const nearest = cards.reduce(
      (best, card) => {
        const distance = Math.abs(card.offsetLeft - padding - shelf.scrollLeft);
        return distance < best.distance ? { left: card.offsetLeft - padding, distance } : best;
      },
      { left: shelf.scrollLeft, distance: Infinity }
    );
    shelf.scrollTo({ left: nearest.left, behavior: "smooth" });
  };
  listen(shelf, "pointerup", end, off);
  listen(shelf, "pointercancel", end, off);

  // Capture, so a drag that ends on a link neither opens it nor counts as a tap.
  const swallow = (event: MouseEvent) => {
    if (moved < 5) return;
    event.preventDefault();
    event.stopPropagation();
    moved = 0;
  };
  const noNativeDrag = (event: DragEvent) => event.preventDefault();
  shelf.addEventListener("click", swallow, true);
  shelf.addEventListener("dragstart", noNativeDrag);
  off.push(() => {
    shelf.removeEventListener("click", swallow, true);
    shelf.removeEventListener("dragstart", noNativeDrag);
  });

  return () => off.forEach((remove) => remove());
}
