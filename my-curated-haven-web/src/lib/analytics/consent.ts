/**
 * Consent management for optional product analytics.
 * Strictly adheres to zero-tracking-until-explicit-consent policy.
 */

export type ConsentStatus = "unknown" | "accepted" | "declined" | "withdrawn";

export const CONSENT_STORAGE_KEY = "mch_analytics_consent";
export const BROWSER_ID_STORAGE_KEY = "mch_browser_id";
export const SESSION_ID_STORAGE_KEY = "mch_session_id";
export const CAMPAIGN_STORAGE_KEY = "mch_campaign_attribution";

export interface ConsentRecord {
  status: ConsentStatus;
  version: string;
  updatedAt: string;
}

export function getStoredConsent(): ConsentRecord {
  if (typeof window === "undefined") {
    return { status: "unknown", version: "2026-09-24", updatedAt: "" };
  }

  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) {
      return { status: "unknown", version: "2026-09-24", updatedAt: "" };
    }
    const parsed = JSON.parse(raw);
    if (["unknown", "accepted", "declined", "withdrawn"].includes(parsed.status)) {
      return parsed;
    }
  } catch {
    // Ignore JSON parse errors
  }

  return { status: "unknown", version: "2026-09-24", updatedAt: "" };
}

export function setStoredConsent(status: ConsentStatus): ConsentRecord {
  const record: ConsentRecord = {
    status,
    version: "2026-09-24",
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
      // Notify other tabs
      window.dispatchEvent(
        new CustomEvent("mch-consent-change", { detail: record })
      );

      // If declined or withdrawn, immediately clear any optional identifiers
      if (status === "declined" || status === "withdrawn") {
        localStorage.removeItem(BROWSER_ID_STORAGE_KEY);
        sessionStorage.removeItem(SESSION_ID_STORAGE_KEY);
        sessionStorage.removeItem(CAMPAIGN_STORAGE_KEY);
      }
    } catch {
      // Storage might be restricted
    }
  }

  return record;
}

export function isAnalyticsPermitted(): boolean {
  if (typeof window === "undefined") return false;
  // Environment master kill switch
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "false") return false;
  return getStoredConsent().status === "accepted";
}
