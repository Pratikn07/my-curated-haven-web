"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * Protects unsaved editor work: the browser's own leave warning for reloads and closes, and a
 * Stay / Discard dialog for in-app links (client navigation never fires beforeunload).
 */
export function useUnsavedGuard(dirty: boolean, noun: string): { dialog: ReactNode; allowLeaving: () => void } {
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const allow = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!leaveHref || !dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [leaveHref]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      if (allow.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const guardLink = (event: MouseEvent) => {
      if (allow.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
        || event.altKey || event.shiftKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download") || link.target === "_blank") return;
      let destination: URL;
      try { destination = new URL(link.href); } catch { return; }
      const here = window.location;
      if (destination.origin === here.origin && destination.pathname === here.pathname && destination.search === here.search) return;
      event.preventDefault();
      event.stopPropagation();
      setLeaveHref(destination.href);
    };
    document.addEventListener("click", guardLink, true);
    return () => document.removeEventListener("click", guardLink, true);
  }, [dirty]);

  function discardAndLeave() {
    if (!leaveHref) return;
    const destination = new URL(leaveHref);
    allow.current = true;
    setLeaveHref(null);
    if (destination.origin === window.location.origin) {
      router.push(`${destination.pathname}${destination.search}${destination.hash}`);
    } else {
      window.location.assign(destination.href);
    }
  }

  const dialog = leaveHref ? (
    <dialog ref={dialogRef} className="admin-editor__leave" aria-label={`Unsaved ${noun} changes`} onClose={() => setLeaveHref(null)}>
      <p>You have unsaved {noun} changes. Discard them and leave this page?</p>
      <button type="button" autoFocus onClick={() => setLeaveHref(null)}>Stay and keep editing</button>
      <button type="button" onClick={discardAndLeave}>Discard changes</button>
    </dialog>
  ) : null;
  return { dialog, allowLeaving: () => { allow.current = true; } };
}
