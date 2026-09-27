"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { getAnalyticsProvider } from "@/lib/analytics/provider";
import { isPostHogActive, posthog, syncSessionRecording } from "@/lib/analytics/posthog";
import { pathToCanonicalRouteKey, toDeviceClass } from "@/lib/analytics/schema";

function identifyUser(user: { id: string; email?: string }) {
  if (posthog.get_distinct_id() === user.id) return;
  posthog.identify(user.id, user.email ? { email: user.email } : undefined);
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
  useEffect(() => {
    getAnalyticsProvider();
    if (!isPostHogActive()) return;

    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        identifyUser(session.user);
      } else if (event === "SIGNED_OUT") {
        posthog.reset();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign-in completes in a server action, which sets the session cookie and
  // redirects without telling this tab. Re-read the session on every page.
  useEffect(() => {
    if (!isPostHogActive()) return;
    void createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) identifyUser(session.user);
      })
      .catch(() => {
        // Analytics must never interrupt the page.
      });
  }, [pathname]);

  // PostHog records its own $pageview; page_view carries the canonical route key.
  useEffect(() => {
    if (!pathname) return;
    syncSessionRecording(pathname);

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
