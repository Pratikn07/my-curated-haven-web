import type { CheckoutError, CheckoutSurface } from "./events";

/**
 * What the Buy button sends to /api/checkout so the order remembers the visit that started it: the PostHog
 * visitor and session (so the server's purchase event lands on the same visitor), which button was tapped, and
 * the Instagram landing page the session began on. Safe to import on the server.
 */
export interface CheckoutAnalyticsInput {
  distinct_id?: string;
  session_id?: string;
  surface?: CheckoutSurface;
  entry_story?: string;
}

export interface CheckoutAnalytics {
  distinctId: string | null;
  sessionId: string | null;
  surface: CheckoutSurface | null;
  entryStory: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SURFACES: readonly CheckoutSurface[] = ["lock_card", "buy_box"];

function pick(value: unknown, pattern: RegExp): string | null {
  return typeof value === "string" && pattern.test(value) ? value : null;
}

/**
 * Keeps the well-formed values and drops the rest. Never rejects the request: analytics must not block a
 * purchase. Returns null when nothing usable was sent.
 */
export function acceptCheckoutAnalytics(raw: unknown): CheckoutAnalytics | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const surface = SURFACES.find((value) => value === input.surface) ?? null;
  const accepted: CheckoutAnalytics = {
    distinctId: pick(input.distinct_id, UUID),
    sessionId: pick(input.session_id, UUID),
    surface,
    entryStory: pick(input.entry_story, SLUG),
  };
  return Object.values(accepted).some((value) => value !== null) ? accepted : null;
}

// Tracking PR 3

/**
 * checkout_failed's reason, from /api/checkout's answer: its two 409 codes as they are, a switched-off checkout as
 * unavailable, anything else as server. A request that never got an answer is "network", decided by the caller.
 */
export function checkoutErrorFor(status: number, code: unknown): CheckoutError {
  if (status === 409 && code === "already_owned") return "already_owned";
  if (status === 409 && code === "refresh_required") return "refresh_required";
  if (code === "CHECKOUT_DISABLED") return "unavailable";
  return "server";
}
