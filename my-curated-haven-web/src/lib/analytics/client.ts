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
import { parseAndRecordCampaign } from "./campaigns";
import { buildAnalyticsEnvelope } from "./sanitize";
import { getAnalyticsProvider } from "./provider";

const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes inactivity
const VIEW_DEDUP_MS = 50;
const VIEW_EVENTS = new Set([
  "page_view",
  "recipe_list_view",
  "recipe_open",
  "collection_view",
  "purchased_library_open",
]);
const recentViews = new Map<string, number>();

function isDuplicateView(eventName: string, payload: unknown): boolean {
  if (!VIEW_EVENTS.has(eventName)) return false;
  const key = `${eventName}:${JSON.stringify(payload)}`;
  const now = Date.now();
  const prev = recentViews.get(key);
  if (prev !== undefined && now - prev < VIEW_DEDUP_MS) return true;
  recentViews.set(key, now);
  return false;
}

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
  if (!isAnalyticsPermitted() || typeof window === "undefined") {
    return;
  }

  if (isDuplicateView(eventName, payload)) return;

  try {
    const browserId = getOrCreateBrowserId();
    const sessionId = getOrCreateSessionId();
    // Read the URL too, so the very first event of a campaign visit is tagged.
    const campaign = parseAndRecordCampaign(new URLSearchParams(window.location.search));

    const envelope = buildAnalyticsEnvelope({
      eventName,
      payload,
      source: "browser",
      browserId,
      sessionId,
      routeKey,
      campaignCode: campaign?.utm_campaign,
    });

    if (!envelope) return;

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
