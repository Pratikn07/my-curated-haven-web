"use client";

import { useEffect, type ReactNode } from "react";

export default function AdminLibraryFocus({
  selectedId,
  children,
}: {
  selectedId: string | null;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!selectedId) return;
    // The library renders desktop (table) and mobile (cards) layouts side by
    // side with CSS hiding one of them. Focus the visible match: the first
    // match in DOM order is the desktop link, which is display:none on mobile
    // and cannot receive focus.
    const candidates = [
      ...document.querySelectorAll<HTMLAnchorElement>('a[data-selected="true"]'),
    ];
    const visible = candidates.find((a) => a.offsetParent !== null) ?? candidates[0];
    visible?.focus({ preventScroll: true });
  }, [selectedId]);
  return <>{children}</>;
}
