"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { getAnalyticsProvider } from "@/lib/analytics/provider";
import { isPostHogActive, posthog, syncInternalBrowser, syncSessionRecording } from "@/lib/analytics/posthog";
import { isNotFoundPage } from "@/lib/analytics/not-found";
import { isAdminNavigationContext, isAdminPath } from "@/lib/analytics/private-paths";
import { pathToCanonicalRouteKey, toDeviceClass } from "@/lib/analytics/schema";

function identifyUser(user: { id: string; email?: string }) {
  try {
    if (typeof window !== "undefined" && isAdminNavigationContext(window.location.href)) return;
  } catch {
    return;
  }
  if (posthog.get_distinct_id() === user.id) return;
  posthog.identify(user.id, user.email ? { email: user.email } : undefined);
}

/**
 * Tracking PR 2: the signed_in super property on every later event, from the auth state on each page.
 * null clears it (sign-out), until the next page reads the session again.
 */
function setSignedIn(signedIn: boolean | null) {
  try {
    if (typeof window !== "undefined" && isAdminNavigationContext(window.location.href)) return;
    if (signedIn === null) posthog.unregister("signed_in");
    else posthog.register({ signed_in: signedIn });
  } catch {
    // Analytics must never interrupt the page.
  }
}

/**
 * Starts analytics for every visitor (no consent step; see the Privacy Policy).
 * With PostHog configured: automatic page views, clicks and session recordings
 * (typed text masked, never on sign-in, account or checkout pages), and
 * signed-in parents linked to their account. Without it, events go to an
 * in-memory recorder that tests read.
 */
export default function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Unlink on sign-out, and link sign-ins that happen in this browser tab.
  // Never runs on admin: the SDK must not initialise there.
  useEffect(() => {
    if (pathname && isAdminPath(pathname)) return;
    getAnalyticsProvider();
    if (!isPostHogActive()) return;
    // Before this page's events: an admin's browser comes back opted in and tagged internal.
    syncInternalBrowser();

    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        identifyUser(session.user);
        setSignedIn(true);
      } else if (event === "SIGNED_OUT") {
        posthog.reset();
        setSignedIn(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  // Sign-in completes in a server action, which sets the session cookie and
  // redirects without telling this tab. Re-read the session on every page.
  useEffect(() => {
    if (!isPostHogActive()) return;
    if (pathname && isAdminPath(pathname)) return;
    void createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        try {
          if (typeof window !== "undefined" && isAdminNavigationContext(window.location.href)) return;
        } catch {
          return;
        }
        if (session?.user) identifyUser(session.user);
        setSignedIn(Boolean(session?.user));
      })
      .catch(() => {
        // Analytics must never interrupt the page.
      });
  }, [pathname]);

  // PostHog records its own $pageview; page_view carries the canonical route key.
  useEffect(() => {
    if (!pathname) return;
    if (isAdminPath(pathname)) return;
    syncSessionRecording(pathname);
    // A 404 sends not_found_viewed instead: a page_view there would count a missing recipe as a recipe page.
    if (isNotFoundPage(pathname)) return;

    const routeKey = pathToCanonicalRouteKey(pathname);
    if (!routeKey) return;
    const deviceClass = typeof navigator !== "undefined"
      ? toDeviceClass(navigator.userAgent)
      : "desktop";

    trackAnalyticsEvent(
      "page_view",
      {
        route_key: routeKey,
        device_class: deviceClass,
      },
      routeKey
    );
  }, [pathname]);

  return <>{children}</>;
}
