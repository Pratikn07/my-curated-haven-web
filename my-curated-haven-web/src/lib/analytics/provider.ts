import { type AnalyticsEnvelope } from "./events";
import { remoteAnalyticsAllowed } from "./environment";

export interface AnalyticsProviderAdapter {
  send(envelope: AnalyticsEnvelope): Promise<void>;
  reset(): void;
  getRecordedEvents?(): AnalyticsEnvelope[];
}

const QUEUE_LIMIT = 20;
const QUEUE_TTL_MS = 5 * 60 * 1000;

class MockAnalyticsProvider implements AnalyticsProviderAdapter {
  private events: AnalyticsEnvelope[] = [];

  async send(envelope: AnalyticsEnvelope): Promise<void> {
    this.events.push(envelope);
    if (this.events.length > QUEUE_LIMIT) {
      this.events.shift();
    }
  }

  reset(): void {
    this.events = [];
  }

  getRecordedEvents(): AnalyticsEnvelope[] {
    return [...this.events];
  }
}

class PostHogAnalyticsProvider implements AnalyticsProviderAdapter {
  private apiKey: string;
  private apiHost: string;
  private queue: { envelope: AnalyticsEnvelope; queuedAt: number }[] = [];

  constructor(apiKey: string, apiHost: string) {
    this.apiKey = apiKey;
    this.apiHost = apiHost;
  }

  async send(envelope: AnalyticsEnvelope): Promise<void> {
    const now = Date.now();
    this.queue = this.queue.filter((item) => now - item.queuedAt < QUEUE_TTL_MS);
    this.queue.push({ envelope, queuedAt: now });
    if (this.queue.length > QUEUE_LIMIT) {
      this.queue.shift();
    }

    const pending = [...this.queue];
    for (const item of pending) {
      const delivered = await this.deliver(item.envelope);
      if (!delivered) return;
      this.queue = this.queue.filter(
        (queued) => queued.envelope.event_id !== item.envelope.event_id
      );
    }
  }

  private async deliver(envelope: AnalyticsEnvelope): Promise<boolean> {
    try {
      const properties: Record<string, unknown> = {
        ...envelope.properties,
        route_key: envelope.route_key,
        schema_version: envelope.schema_version,
        environment: envelope.environment,
        session_id: envelope.session_id,
        $process_person_profile: false,
      };
      if (envelope.campaign_code) {
        properties.campaign_code = envelope.campaign_code;
      }

      const payload = {
        api_key: this.apiKey,
        event: envelope.event_name,
        distinct_id: envelope.browser_id || "anonymous",
        properties,
        timestamp: envelope.occurred_at,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${this.apiHost.replace(/\/$/, "")}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
        keepalive: true,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  reset(): void {
    this.queue = [];
  }
}

let activeProvider: AnalyticsProviderAdapter | null = null;

export function getAnalyticsProvider(): AnalyticsProviderAdapter {
  if (activeProvider) return activeProvider;

  const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const postHogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (remoteAnalyticsAllowed() && postHogKey && postHogHost && typeof window !== "undefined") {
    activeProvider = new PostHogAnalyticsProvider(postHogKey, postHogHost);
  } else {
    activeProvider = new MockAnalyticsProvider();
  }

  if (typeof window !== "undefined") {
    (window as unknown as { __mch_analytics_provider?: AnalyticsProviderAdapter }).__mch_analytics_provider =
      activeProvider;
  }

  return activeProvider;
}
