import type { Mode, VerifiedEvent } from "./contracts";
import type { ReconcileOutcome } from "./ledger";

/**
 * Webhook inbox processing. A signature-verified event is stored once per account, mode and id; processing claims it
 * under a fence, finds the order it concerns, re-reads the order's current provider facts and applies them through
 * the shared writer. The event body is used only to find the order, never as financial evidence, so an old success
 * delivered after a refund cannot restore access. No runtime imports: unit-tested directly.
 */

/** Events that lead to a fresh provider check. Anything else is recorded and ignored. */
export const VERIFIED_EVENT_TYPES: ReadonlySet<string> = new Set([
  "checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed",
  "refund.created", "refund.updated", "refund.failed", "charge.refunded",
  "charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed", "charge.dispute.funds_withdrawn",
  "charge.dispute.funds_reinstated",
]);

export function eventKey(event: Pick<VerifiedEvent, "accountId" | "mode" | "id">): string {
  return JSON.stringify([event.accountId, event.mode, event.id]);
}

export type RoutingHints = { sessionId: string | null; clientReferenceId: string | null; paymentIntentId: string | null;
  chargeId: string | null };

const idOf = (value: unknown): string | null => typeof value === "string" ? value
  : value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string" ? (value as { id: string }).id : null;

/** Identity fields of a verified event's object, used only to find the order. */
export function routingHints(type: string, object: Record<string, unknown>): RoutingHints {
  const none = { sessionId: null, clientReferenceId: null, paymentIntentId: null, chargeId: null };
  if (type.startsWith("checkout.session.")) {
    return { ...none, sessionId: idOf(object.id), paymentIntentId: idOf(object.payment_intent),
      clientReferenceId: typeof object.client_reference_id === "string" ? object.client_reference_id : null };
  }
  if (type.startsWith("refund.") || type.startsWith("charge.dispute.")) {
    return { ...none, paymentIntentId: idOf(object.payment_intent), chargeId: idOf(object.charge) };
  }
  if (type === "charge.refunded") return { ...none, paymentIntentId: idOf(object.payment_intent), chargeId: idOf(object.id) };
  return none;
}

export type EventClaim = { state: "claimed"; fence: number; eventId: string; type: string; mode: Mode; orderId: string | null }
  | { state: "done"; processingState: string };
export type EventOutcome = { outcome: "completed" | "ignored" | "blocked" | "retry"; code: string | null; orderId: string | null;
  reconciliation: unknown };
export type EventDeps = {
  claim(inboxId: string): Promise<EventClaim>;
  finish(inboxId: string, fence: number, outcome: EventOutcome): Promise<void>;
  policyReady(orderId: string): Promise<boolean>;
  reconcile(orderId: string, eventId: string): Promise<ReconcileOutcome>;
  /** The guarded older processing of this delivery, for orders without an approved policy. Null in recovery. */
  legacy: (() => Promise<void>) | null;
};
/** `unavailable`: no registered verifier could claim the event; the caller falls back to the guarded older path. */
export type EventResult = { state: "completed" | "ignored" | "retry" | "unavailable" };

const RETRYABLE = new Set(["ADM_CONFLICT", "ADM_STALE", "ADM_UNAVAILABLE", "ORDER_CHANGED", "CLAIM_FAILED", "READ_FAILED",
  "RECORD_FAILED", "REQUEST_FAILED", "APPLY_FAILED", "RECEIPT_INVALID"]);

function code(error: unknown): string | null {
  const match = (error instanceof Error ? error.message : "").match(/ADM_[A-Z_]+/);
  return match ? match[0] : null;
}

async function decide(claim: Extract<EventClaim, { state: "claimed" }>, deps: EventDeps): Promise<EventOutcome> {
  const orderId = claim.orderId;
  if (!VERIFIED_EVENT_TYPES.has(claim.type)) return { outcome: "ignored", code: "UNSUPPORTED_EVENT", orderId, reconciliation: null };
  // The order may not be known yet (a refund event before its checkout); a later delivery can bind it.
  if (orderId === null) return { outcome: "retry", code: "ORDER_UNKNOWN", orderId, reconciliation: null };
  let ready: boolean;
  try {
    ready = await deps.policyReady(orderId);
  } catch {
    return { outcome: "retry", code: "POLICY_UNAVAILABLE", orderId, reconciliation: null };
  }
  if (!ready) {
    if (deps.legacy === null) return { outcome: "blocked", code: "POLICY_MISSING", orderId, reconciliation: null };
    try {
      await deps.legacy();
      return { outcome: "completed", code: "LEGACY", orderId, reconciliation: null };
    } catch {
      return { outcome: "retry", code: "LEGACY_FAILED", orderId, reconciliation: null };
    }
  }
  const result = await deps.reconcile(orderId, claim.eventId);
  if (result.ok) return { outcome: "completed", code: null, orderId, reconciliation: result.receipt };
  if (result.code === "BLOCKED") return { outcome: "blocked", code: "RECONCILE_BLOCKED", orderId, reconciliation: { reasons: result.reasons } };
  return { outcome: RETRYABLE.has(result.code) ? "retry" : "blocked", code: /^[A-Za-z][A-Za-z0-9_]{1,63}$/.test(result.code)
    ? result.code : "RECONCILE_FAILED", orderId, reconciliation: null };
}

export async function processVerifiedCommerceEvent(inboxId: string, deps: EventDeps): Promise<EventResult> {
  let claim: EventClaim;
  try {
    claim = await deps.claim(inboxId);
  } catch (error) {
    // No registered verifier: use the older path. Anything else (another delivery holds the claim, a database error)
    // is retried by Stripe, so a passing fault never sends an order down the path that skips the policy.
    return { state: code(error) === "ADM_DENIED" ? "unavailable" : "retry" };
  }
  if (claim.state === "done") return { state: claim.processingState === "completed" ? "completed" : "ignored" };
  const outcome = await decide(claim, deps);
  try {
    await deps.finish(inboxId, claim.fence, outcome);
  } catch {
    // The claim expired or was taken over; whoever holds it now records the outcome.
    return { state: "retry" };
  }
  return { state: outcome.outcome === "completed" ? "completed" : outcome.outcome === "retry" ? "retry" : "ignored" };
}
