import crypto from "crypto";
import type Stripe from "stripe";
import { getStripeConfig, isStripeConfigured } from "./config";
import { getStripeClient, STRIPE_API_VERSION } from "./stripe";
import { processStripeWebhookEvent } from "./fulfilment";
import {
  getPaymentEventState, ingestPaymentEvent, markPaymentEventOutcome, resolveEventOrder, type PaymentEventOutcome,
} from "./repository";
import { processVerifiedCommerceEvent, routingHints, type EventResult } from "./reconciliation/events";
import { verifierConfigured } from "./reconciliation/repository";
import { eventDependencies } from "./reconciliation/service";

/** The Stripe event fields the inbox reads. Webhooks and the catch-up run both produce this shape. */
export interface StripeInboxEvent {
  id: string;
  type: string;
  account?: string;
  api_version?: string | null;
  livemode: boolean;
  data: {
    object: Record<string, unknown>;
  };
}

/** Event types the app acts on. Webhook endpoints should subscribe to exactly these. */
export const HANDLED_STRIPE_EVENT_TYPES = [
  "checkout.session.completed",
  "checkout.session.expired",
  "refund.created",
  "refund.updated",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
] as const;

const FINISHED_STATES = new Set(["completed", "ignored", "dead_letter"]);

/** The event's Stripe account could not be determined: STRIPE_EXPECTED_ACCOUNT_ID is missing on a deployed site. */
export class StripeAccountUnknown extends Error {}

/**
 * Store a verified event once, then process it. With a registered verifier, an order whose policy is approved is
 * re-checked with Stripe and reconciled through the shared writer; otherwise the guarded older processing handles it
 * and its outcome (completed, ignored with a reason, or failed with a retry count) is recorded. "retry" means Stripe,
 * or the next catch-up run, should deliver it again. `skipFinished` leaves an event an earlier delivery finished.
 */
export async function handleStripeEvent(
  event: StripeInboxEvent,
  payloadHash: string,
  { skipFinished = false, fixtureAccount = null }: { skipFinished?: boolean; fixtureAccount?: string | null } = {}
): Promise<"processed" | "skipped" | "retry"> {
  const config = getStripeConfig();
  const mode = event.livemode ? "live" : "test";
  // The event body only identifies the order; the facts are re-read from Stripe on the verified path.
  const target = await resolveEventOrder(mode, routingHints(event.type, event.data?.object ?? {}));
  // Direct-account events omit `account`; the endpoint's signing secret belongs to the expected account.
  const providerAccountId = event.account || config.expectedAccountId || fixtureAccount;
  if (!providerAccountId) throw new StripeAccountUnknown("STRIPE_EXPECTED_ACCOUNT_ID is not set");

  const inboxId = await ingestPaymentEvent({
    eventId: event.id,
    providerAccountId,
    providerMode: mode,
    // The version Stripe rendered this event with, which follows the endpoint setting, not the SDK pin.
    apiVersion: event.api_version || STRIPE_API_VERSION,
    eventType: event.type,
    objectId: (event.data?.object?.id as string) || event.id,
    payloadHash,
    orderId: target?.orderId ?? null,
  });
  if (skipFinished && FINISHED_STATES.has((await getPaymentEventState(inboxId)) ?? "")) return "skipped";

  let legacyOutcome: PaymentEventOutcome = { state: "completed" };
  const legacy = async () => { legacyOutcome = await processStripeWebhookEvent(event); };
  const result: EventResult = verifierConfigured()
    ? await processVerifiedCommerceEvent(inboxId, eventDependencies(legacy))
    : { state: "unavailable" };
  if (result.state === "unavailable") {
    try {
      await legacy();
    } catch (err: unknown) {
      await markPaymentEventOutcome(inboxId, { state: "failed", reason: err instanceof Error ? err.message : String(err) })
        .catch(() => {});
      throw err;
    }
    await markPaymentEventOutcome(inboxId, legacyOutcome);
    return "processed";
  }
  return result.state === "retry" ? "retry" : "processed";
}

export interface ReconciliationResult {
  status: "ok" | "skipped";
  reason?: string;
  scanned: number;
  processed: number;
  failed: number;
}

/**
 * Re-read recent events from Stripe and apply any the inbox has not finished: webhooks that never arrived, and ones
 * that failed. Stripe keeps events for 30 days; the window overlaps each run so a late or slow delivery is still seen.
 * Bounded so one run never holds the function open for long.
 */
export async function reconcileRecentStripeEvents({
  lookbackHours = 72,
  maxEvents = 500,
}: { lookbackHours?: number; maxEvents?: number } = {}): Promise<ReconciliationResult> {
  const config = getStripeConfig();
  if (!isStripeConfigured()) {
    return { status: "skipped", reason: "stripe_not_configured", scanned: 0, processed: 0, failed: 0 };
  }
  if (!config.expectedAccountId) {
    return { status: "skipped", reason: "expected_account_not_set", scanned: 0, processed: 0, failed: 0 };
  }

  const result: ReconciliationResult = { status: "ok", scanned: 0, processed: 0, failed: 0 };
  const since = Math.floor(Date.now() / 1000) - lookbackHours * 3600;
  const events = getStripeClient().events.list({
    types: [...HANDLED_STRIPE_EVENT_TYPES],
    created: { gte: since },
    limit: 100,
  });

  for await (const stripeEvent of events as AsyncIterable<Stripe.Event>) {
    if (result.scanned >= maxEvents) break;
    result.scanned++;
    const event = stripeEvent as unknown as StripeInboxEvent;
    const payloadHash = crypto.createHash("sha256").update(JSON.stringify(stripeEvent)).digest("hex");
    try {
      const outcome = await handleStripeEvent(event, payloadHash, { skipFinished: true });
      if (outcome === "processed") result.processed++;
      else if (outcome === "retry") result.failed++;
    } catch (err: unknown) {
      result.failed++;
      console.error("[payments-reconcile] event failed", event.id, err instanceof Error ? err.message : err);
    }
  }
  return result;
}
