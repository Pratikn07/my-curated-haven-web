import posthog, { type CaptureResult } from "posthog-js";
import { remoteAnalyticsAllowed } from "./environment";
import { INTERNAL_BROWSER_STORAGE_KEY } from "./consent";
import { currentNotFoundPath, NOT_FOUND_PATH } from "./not-found";
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
    // The Stripe checkout session (/checkout/return?session_id=…) and search text (/recipes?q=…) never reach
    // PostHog: removed from every address on an event before it is sent.
    before_send: withoutPrivateQueryParams,
    // Ad click ids (fbclid, gclid, igshid, …) are masked wherever PostHog records them (addresses, campaign
    // properties, first-visit person properties); CampaignCapture keeps only whether one was present. The same
    // masking covers the private parameters in places before_send never sees (heatmaps, recordings).
    mask_personal_data_properties: true,
    custom_personal_data_properties: [...PRIVATE_QUERY_PARAMS],
    // Uncaught errors arrive as $exception (PostHog error tracking), so reports can show what breaks.
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

/** Event and person properties that hold a full address. */
const URL_PROPERTIES = [
  "$current_url",
  "$referrer",
  "$initial_current_url",
  "$initial_referrer",
  "$session_entry_url",
  "$session_entry_referrer",
];

/** Query parameters that never reach PostHog: the Stripe checkout session (session_id) and search text (q). */
export const PRIVATE_QUERY_PARAMS = ["session_id", "q"] as const;
const PRIVATE_PARAM = new RegExp(`[?&](?:${PRIVATE_QUERY_PARAMS.join("|")})=`);

/** The address without its private query parameters. Anything else is unchanged. */
export function stripPrivateQueryParams(value: unknown): unknown {
  if (typeof value !== "string" || !PRIVATE_PARAM.test(value)) return value;
  try {
    const url = new URL(value);
    for (const param of PRIVATE_QUERY_PARAMS) url.searchParams.delete(param);
    return url.toString();
  } catch {
    let stripped = value;
    for (const param of PRIVATE_QUERY_PARAMS) {
      stripped = stripped.replace(new RegExp(`([?&])${param}=[^&#]*&?`, "g"), "$1");
    }
    return stripped.replace(/[?&](?=#|$)/, "");
  }
}

/** On a 404, an address of that page says NOT_FOUND_PATH, with no query or fragment. Any other address is unchanged. */
export function withoutNotFoundAddress(value: unknown, notFoundPath: string | null): unknown {
  if (typeof value !== "string" || notFoundPath === null) return value;
  if (value === notFoundPath) return NOT_FOUND_PATH;
  try {
    const url = new URL(value);
    if (url.pathname !== notFoundPath) return value;
    return `${url.origin}${NOT_FOUND_PATH}`;
  } catch {
    return value;
  }
}

/**
 * PostHog before_send hook: removes the private query parameters from every address on the event, and while a 404
 * shows, replaces that page's address (it was typed or forwarded and can hold anything; lib/analytics/not-found).
 */
export function withoutPrivateQueryParams(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  const notFoundPath = currentNotFoundPath();
  for (const bag of [event.properties, event.$set, event.$set_once]) {
    if (!bag) continue;
    for (const key of URL_PROPERTIES) {
      if (key in bag) bag[key] = withoutNotFoundAddress(stripPrivateQueryParams(bag[key]), notFoundPath);
    }
    if ("$pathname" in bag) bag.$pathname = withoutNotFoundAddress(bag.$pathname, notFoundPath);
  }
  return event;
}

export { posthog };
