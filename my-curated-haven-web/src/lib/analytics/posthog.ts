import posthog from "posthog-js";
import { remoteAnalyticsAllowed } from "./environment";
import { isPrivatePath } from "./private-paths";

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
    // Recording starts per page in syncSessionRecording, never on private pages.
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
    },
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
  if (isPrivatePath(pathname)) {
    posthog.stopSessionRecording();
  } else {
    posthog.startSessionRecording();
  }
}

export { posthog };
