/** The buyer's PostHog ids, sent with checkout so the server purchase event lands on the same visitor and session. */
export interface AnalyticsIdentity {
  distinctId: string | null;
  sessionId: string | null;
}

// PostHog's anonymous and session ids are UUIDv7; a signed-in visitor's distinct id is their account UUID.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuidOrNull(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

/** Keeps only well-formed ids. Anything else becomes null instead of blocking a purchase. */
export function acceptAnalyticsIdentity(raw: unknown): AnalyticsIdentity | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const identity = {
    distinctId: uuidOrNull(record.distinctId),
    sessionId: uuidOrNull(record.sessionId),
  };
  return identity.distinctId || identity.sessionId ? identity : null;
}
