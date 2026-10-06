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
    document.querySelector<HTMLAnchorElement>('a[data-selected="true"]')?.focus();
  }, [selectedId]);
  return <>{children}</>;
}
