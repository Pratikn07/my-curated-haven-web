import {
  type AnalyticsEventMap,
  type AnalyticsEventName,
  type CanonicalRouteKey,
} from "./events";
import {
  isAnalyticsPermitted,
  BROWSER_ID_STORAGE_KEY,
  SESSION_ID_STORAGE_KEY,
} from "./consent";
import { getSessionCampaign } from "./campaigns";
import { buildAnalyticsEnvelope } from "./sanitize";
import { getAnalyticsProvider } from "./provider";

const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes inactivity

function getOrCreateBrowserId(): string {
  try {
    let id = localStorage.getItem(BROWSER_ID_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(BROWSER_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "ephemeral-" + crypto.randomUUID();
  }
}

function getOrCreateSessionId(): string {
  try {
    const raw = sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
    const now = Date.now();
    if (raw) {
      const parsed = JSON.parse(raw);
      if (now - parsed.lastActive < SESSION_EXPIRY_MS) {
        parsed.lastActive = now;
        sessionStorage.setItem(SESSION_ID_STORAGE_KEY, JSON.stringify(parsed));
        return parsed.sessionId;
      }
    }

    const newSession = {
      sessionId: crypto.randomUUID(),
      lastActive: now,
    };
    sessionStorage.setItem(SESSION_ID_STORAGE_KEY, JSON.stringify(newSession));
    return newSession.sessionId;
  } catch {
    return "session-" + crypto.randomUUID();
  }
}

export async function trackAnalyticsEvent<T extends AnalyticsEventName>(
  eventName: T,
  payload: AnalyticsEventMap[T],
  routeKey?: CanonicalRouteKey
): Promise<void> {
  // 1. Strict privacy check: zero tracking unless explicitly consented
  if (!isAnalyticsPermitted() || typeof window === "undefined") {
    return;
  }

  try {
    const browserId = getOrCreateBrowserId();
    const sessionId = getOrCreateSessionId();
    const campaign = getSessionCampaign();

    const envelope = buildAnalyticsEnvelope({
      eventName,
      payload,
      browserId,
      sessionId,
      routeKey,
      campaignCode: campaign?.utm_campaign,
    });

    const provider = getAnalyticsProvider();
    await provider.send(envelope);
  } catch {
    // Fail silently: user interactions must never be interrupted by analytics
  }
}

export function resetAnalyticsClient(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(BROWSER_ID_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_ID_STORAGE_KEY);
    getAnalyticsProvider().reset();
  } catch {
    // ignore
  }
}
