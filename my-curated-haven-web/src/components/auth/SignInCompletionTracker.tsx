"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { coarseEntryPoint, pathToCanonicalRouteKey } from "@/lib/analytics/schema";
import { isAdminPath } from "@/lib/analytics/private-paths";
import { SIGN_IN_METHOD_COOKIE, isSignInMethodMarker } from "@/lib/auth/oauth";

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
 * Both sign-in methods complete on the server and redirect: Google in
 * /auth/callback, the email code in verifyOtpAction. Each leaves a short-lived
 * marker cookie; this reads and clears it on the destination page and emits
 * sign_in_completed. Clearing the cookie is what keeps it to one event, so a
 * second sign-in in the same tab is counted too.
 */
export default function SignInCompletionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && isAdminPath(pathname)) return;

    const method = readAndClearMethodMarker();
    if (!isSignInMethodMarker(method)) return;

    trackAnalyticsEvent(
      "sign_in_completed",
      { entry_point: coarseEntryPoint(pathname), method },
      pathToCanonicalRouteKey(pathname) ?? undefined
    );
  }, [pathname]);

  return null;
}
