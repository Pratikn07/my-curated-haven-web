"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { clearPageAccessState, setPageAccessState } from "@/lib/analytics/client";
import type { AccessState } from "@/lib/analytics/events";

/**
 * Tells analytics what this visitor can open on the page (access_state on every event it sends): a free
 * recipe, a locked one, one they own, or a plan's preview. Kept with this page's address only.
 * Its effect runs before AnalyticsProvider's page_view (children's effects run first), so the view carries it.
 */
export default function TrackPageState({ accessState }: { accessState: AccessState }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    setPageAccessState(pathname, accessState);
    return () => clearPageAccessState(pathname, accessState);
  }, [pathname, accessState]);

  return null;
}
