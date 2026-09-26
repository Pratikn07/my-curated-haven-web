/**
 * Browser storage keys and the analytics on/off switch.
 * Consent collection was removed on 2026-09-26; a consent platform comes later.
 */

export const BROWSER_ID_STORAGE_KEY = "mch_browser_id";
export const SESSION_ID_STORAGE_KEY = "mch_session_id";
export const CAMPAIGN_STORAGE_KEY = "mch_campaign_attribution";
export const ATTEMPT_REFS_STORAGE_KEY = "mch_analytics_attempt_refs";

export function readAttemptRefs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(ATTEMPT_REFS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string").slice(0, 20);
  } catch {
    return [];
  }
}

export function rememberAttemptRef(ref: string): void {
  if (typeof window === "undefined") return;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) {
    return;
  }
  try {
    const current = readAttemptRefs();
    if (current.includes(ref)) return;
    sessionStorage.setItem(
      ATTEMPT_REFS_STORAGE_KEY,
      JSON.stringify([...current, ref].slice(-20))
    );
  } catch {
    // Storage might be restricted
  }
}

/**
 * Analytics runs without a consent step (owner decision, 2026-09-26). The only
 * switch is NEXT_PUBLIC_ANALYTICS_ENABLED=false, which turns everything off.
 */
export function isAnalyticsPermitted(): boolean {
  if (typeof window === "undefined") return false;
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";
}
