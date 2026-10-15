import posthog from "posthog-js";
import { remoteAnalyticsAllowed } from "./environment";
import { INTERNAL_BROWSER_STORAGE_KEY } from "./consent";
import { isAdminPath, isPrivatePath } from "./private-paths";

let initialized = false;

/**
 * Start PostHog once in the browser. It stays off (and the in-memory recorder
 * is used instead) unless the deployment sets NEXT_PUBLIC_ANALYTICS_ENABLED,
 * NEXT_PUBLIC_APP_ENV and NEXT_PUBLIC_POSTHOG_KEY, so previews and local
 * development never send data.
 */
export function initPostHog(): boolean {
  if (typeof window === "undefined") return false;
  if (initialized) return true;
  if (!remoteAnalyticsAllowed()) return false;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return false;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    capture_pageleave: true,
    autocapture: true,
    // Page speed as visitors feel it (LCP, INP, CLS, FCP), split by device and browser
    // in PostHog's web vitals view. Decides whether heavier book effects are affordable.
    capture_performance: { web_vitals: true },
    // Recording starts per page in syncSessionRecording, never on private pages.
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
    },
    // Tracking PR 3: uncaught errors arrive as $exception (PostHog error tracking), so reports can show what breaks.
    capture_exceptions: true,
  });
  initialized = true;
  syncSessionRecording(window.location.pathname);
  return true;
}

export function isPostHogActive(): boolean {
  return initialized;
}

export function syncSessionRecording(pathname: string): void {
  if (!initialized) return;
  if (isPrivatePath(pathname) || isAdminPath(pathname)) {
    posthog.stopSessionRecording();
  } else {
    posthog.startSessionRecording();
  }
}

/**
 * Nothing is captured while an admin page is open. The browser is also marked internal, so when it goes back to
 * public pages syncInternalBrowser turns capture on again with is_internal set, instead of the browser going
 * silent for good.
 */
export function syncAdminPrivacy(pathname: string): void {
  if (typeof window === "undefined") return;
  if (!isAdminPath(pathname)) return;
  try {
    localStorage.setItem(INTERNAL_BROWSER_STORAGE_KEY, "1");
  } catch {
    // Storage can be blocked; the opt-out below still protects admin.
  }
  try {
    if (initialized) {
      posthog.stopSessionRecording();
      posthog.opt_out_capturing();
    }
  } catch {
    // Privacy must never break admin.
  }
}

/**
 * On public pages: an admin's browser keeps being measured, tagged is_internal so PostHog's internal-user filter
 * leaves it out of reports. Only admin pages ever opt a browser out, so an opted-out browser is an admin's
 * (including those opted out before 2026-10-15, when admin pages switched capture off for good).
 */
export function syncInternalBrowser(): void {
  if (!initialized || typeof window === "undefined") return;
  try {
    let internal = localStorage.getItem(INTERNAL_BROWSER_STORAGE_KEY) === "1";
    if (posthog.has_opted_out_capturing()) {
      internal = true;
      localStorage.setItem(INTERNAL_BROWSER_STORAGE_KEY, "1");
      posthog.opt_in_capturing({ captureEventName: null });
    }
    if (internal) posthog.register({ is_internal: true });
  } catch {
    // Analytics must never interrupt the page.
  }
}

export { posthog };
