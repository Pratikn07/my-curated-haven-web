import { type AnalyticsEnvelope } from "./events";

export interface AnalyticsProviderAdapter {
  send(envelope: AnalyticsEnvelope): Promise<void>;
  reset(): void;
  getRecordedEvents?(): AnalyticsEnvelope[];
}

class MockAnalyticsProvider implements AnalyticsProviderAdapter {
  private events: AnalyticsEnvelope[] = [];
  private maxQueue = 20;

  async send(envelope: AnalyticsEnvelope): Promise<void> {
    this.events.push(envelope);
    if (this.events.length > this.maxQueue) {
      this.events.shift(); // drop oldest
    }
    if (process.env.NODE_ENV === "development") {
      // Clean, unobtrusive debug log
      // console.debug("[Analytics Mock]", envelope.event_name, envelope.properties);
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

  constructor(apiKey: string, apiHost = "https://us.i.posthog.com") {
    this.apiKey = apiKey;
    this.apiHost = apiHost;
  }

  async send(envelope: AnalyticsEnvelope): Promise<void> {
    try {
      const payload = {
        api_key: this.apiKey,
        event: envelope.event_name,
        distinct_id: envelope.browser_id || "anonymous",
        properties: {
          ...envelope.properties,
          $current_url: undefined, // Disallow full URLs
          $ip: false, // Disallow IP recording
          route_key: envelope.route_key,
          schema_version: envelope.schema_version,
          environment: envelope.environment,
          campaign_code: envelope.campaign_code,
          session_id: envelope.session_id,
        },
        timestamp: envelope.occurred_at,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      await fetch(`${this.apiHost}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
        keepalive: true,
      });

      clearTimeout(timeoutId);
    } catch {
      // Fail closed: analytics failures must never block the user or throw uncaught errors
    }
  }

  reset(): void {
    // Reset any provider-specific memory if needed
  }
}

let activeProvider: AnalyticsProviderAdapter | null = null;

export function getAnalyticsProvider(): AnalyticsProviderAdapter {
  if (activeProvider) return activeProvider;

  const isEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";
  const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (isEnabled && postHogKey && typeof window !== "undefined") {
    activeProvider = new PostHogAnalyticsProvider(
      postHogKey,
      process.env.NEXT_PUBLIC_POSTHOG_HOST
    );
  } else {
    activeProvider = new MockAnalyticsProvider();
  }

  // Expose on window for Playwright E2E validation in test/dev
  if (typeof window !== "undefined") {
    (window as unknown as { __mch_analytics_provider?: AnalyticsProviderAdapter }).__mch_analytics_provider =
      activeProvider;
  }

  return activeProvider;
}
