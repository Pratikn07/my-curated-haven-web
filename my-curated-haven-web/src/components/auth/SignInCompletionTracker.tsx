"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { coarseEntryPoint, pathToCanonicalRouteKey } from "@/lib/analytics/schema";
import { isAdminPath } from "@/lib/analytics/private-paths";
import { SIGN_IN_METHOD_COOKIE, isOAuthProvider } from "@/lib/auth/oauth";

function readAndClearMethodMarker(): string | null {
  try {
    const prefix = `${SIGN_IN_METHOD_COOKIE}=`;
    const match = document.cookie.split("; ").find((part) => part.startsWith(prefix));
    if (!match) return null;
    document.cookie = `${prefix}; path=/; max-age=0`;
    return decodeURIComponent(match.slice(prefix.length));
  } catch {
    return null;
  }
}

/**
 * Google sign-in completes in /auth/callback and redirects, so the tab that
 * started it never sees a success response and cannot close the funnel the way
 * the email-code form does. The callback leaves a short-lived marker cookie;
 * this reads it once on the destination page and emits sign_in_completed.
 */
export default function SignInCompletionTracker() {
  const pathname = usePathname();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (pathname && isAdminPath(pathname)) return;

    const method = readAndClearMethodMarker();
    if (!isOAuthProvider(method)) return;

    firedRef.current = true;
    trackAnalyticsEvent(
      "sign_in_completed",
      { entry_point: coarseEntryPoint(pathname), method },
      pathToCanonicalRouteKey(pathname) ?? undefined
    );
  }, [pathname]);

  return null;
}
