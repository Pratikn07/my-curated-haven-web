import { type AnalyticsEnvelope } from "./events";
import { initPostHog, posthog } from "./posthog";

export interface AnalyticsProviderAdapter {
  send(envelope: AnalyticsEnvelope): Promise<void>;
  reset(): void;
  getRecordedEvents?(): AnalyticsEnvelope[];
}

const QUEUE_LIMIT = 20;

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

/** Sends events through the PostHog browser library (identified users, replays, autocapture). */
class PostHogAnalyticsProvider implements AnalyticsProviderAdapter {
  async send(envelope: AnalyticsEnvelope): Promise<void> {
    const properties: Record<string, unknown> = {
      ...envelope.properties,
      route_key: envelope.route_key,
      schema_version: envelope.schema_version,
      environment: envelope.environment,
    };
    if (envelope.campaign_code) {
      properties.campaign_code = envelope.campaign_code;
    }
    posthog.capture(envelope.event_name, properties);
  }

  reset(): void {
    posthog.reset();
  }
}

let activeProvider: AnalyticsProviderAdapter | null = null;

export function getAnalyticsProvider(): AnalyticsProviderAdapter {
  if (activeProvider) return activeProvider;

  if (initPostHog()) {
    activeProvider = new PostHogAnalyticsProvider();
  } else {
    activeProvider = new MockAnalyticsProvider();
  }

  if (typeof window !== "undefined") {
    (window as unknown as { __mch_analytics_provider?: AnalyticsProviderAdapter }).__mch_analytics_provider =
      activeProvider;
  }

  return activeProvider;
}
