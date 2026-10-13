/**
 * Mouse-only details for the collections pages. Loaded on demand, so phones
 * never download it, and only when motion is allowed.
 * - Books tilt toward the pointer and light sweeps across the foil.
 * - Buttons fill from where the pointer came in.
 */

function setupTilt(root: HTMLElement): () => void {
  const books = Array.from(root.querySelectorAll<HTMLElement>("[data-tilt]"));
  const offs = books.map((book) => {
    const host = book.closest<HTMLElement>("a, .cl-tilt") ?? book;
    let frame = 0;
    const move = (event: PointerEvent) => {
      const box = book.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        book.setAttribute("data-tilting", "");
        book.style.transform = `perspective(900px) rotateX(${(-y * 9).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg)`;
        book.style.setProperty("--sheen", `${Math.round((x + 0.5) * 100)}%`);
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      book.removeAttribute("data-tilting");
      book.style.transform = "";
    };
    book.style.transition = "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      leave();
      book.style.transition = "";
    };
  });
  return () => offs.forEach((off) => off());
}

function setupButtonFill(root: HTMLElement): () => void {
  const buttons = Array.from(root.querySelectorAll<HTMLElement>(".cl-button"));
  const enter = (event: PointerEvent) => {
    const button = event.currentTarget as HTMLElement;
    const box = button.getBoundingClientRect();
    button.style.setProperty("--px", `${event.clientX - box.left}px`);
    button.style.setProperty("--py", `${event.clientY - box.top}px`);
  };
  buttons.forEach((button) => button.addEventListener("pointerenter", enter));
  return () => buttons.forEach((button) => button.removeEventListener("pointerenter", enter));
}

export function setupPointer(root: HTMLElement): () => void {
  const offs = [setupTilt(root), setupButtonFill(root)];
  return () => offs.forEach((off) => off());
}
