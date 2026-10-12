import type { AdminCode, Result } from "../../admin/contracts";
import { classifyAdminError } from "../../admin/rpc";
import { STRIPE_API_VERSION } from "../stripe";
import type { Binding, CommerceReceipt } from "./contracts";
import type { EventDeps } from "./events";
import { applyObservation, verifyAndReconcile, type ReconcileOutcome, type SystemPurpose } from "./ledger";
import { readProviderFacts, unknownFinancialFacts } from "./provider-read";
import {
  applySystemObservation, claimEvent, claimVerification, createLocalLedgerReader, finishEvent, orderLastVerified, orderPolicyReady,
  recordObservation, requestVerification, verifierConfigured,
} from "./repository";
import { createStripeReader } from "./stripe-provider";
import { localLedgerReaderAllowed } from "./verifier-config";
import { runVerification, type SourcedRead } from "./verifier";

/**
 * System reconciliation (webhooks and recovery), server code. Like the other payment modules it is not marked
 * `server-only`: the webhook route reaches it, and the payment browser tests load that route directly. It holds no human approval and never applies a staff
 * diagnosis; approved manual repairs reach the same database writer through their own entry point.
 */

export async function sourcedProviderRead(binding: Binding): Promise<SourcedRead> {
  if (localLedgerReaderAllowed(binding)) {
    return { ...(await readProviderFacts(binding, createLocalLedgerReader())), apiVersion: "local-ledger" };
  }
  try {
    return { ...(await readProviderFacts(binding, createStripeReader(binding))), apiVersion: STRIPE_API_VERSION };
  } catch {
    // No usable Stripe client (for example, no key on this server): record that nothing could be read.
    return { facts: unknownFinancialFacts(binding), complete: false, blockers: ["provider_unavailable"], apiVersion: STRIPE_API_VERSION };
  }
}

const DEPS = {
  request: requestVerification,
  verify: (jobId: string) => runVerification(jobId, { claim: claimVerification, read: sourcedProviderRead, record: recordObservation }),
  apply: applySystemObservation,
};
const CODES: Record<string, AdminCode> = { BLOCKED: "BLOCKED", ORDER_CHANGED: "STALE" };

function toResult(outcome: ReconcileOutcome): Result<CommerceReceipt> {
  if (outcome.ok) return { ok: true, value: outcome.receipt };
  const code = CODES[outcome.code] ?? classifyAdminError({ message: outcome.code });
  const detail = outcome.reasons.length > 0 ? outcome.reasons.join("-") : outcome.code.toLowerCase();
  return { ok: false, code, reference: `commerce-${detail.replace(/_/g, "-")}`.slice(0, 120) };
}

/** Apply an already recorded webhook or recovery observation. */
export async function reconcileVerifiedOrder(input: { observationId: string; operationId: string; eventId: string | null }):
  Promise<Result<CommerceReceipt>> {
  return toResult(await applyObservation(input.observationId, input.operationId, input.eventId, DEPS));
}

/** Webhook processing for one inbox event; `legacy` is the guarded older processing of the same delivery. */
export function eventDependencies(legacy: (() => Promise<void>) | null): EventDeps {
  return {
    claim: claimEvent,
    finish: finishEvent,
    policyReady: orderPolicyReady,
    reconcile: (orderId, eventId) => verifyAndReconcile({ orderId, purpose: "webhook", operationId: crypto.randomUUID(),
      eventId: /^evt_[A-Za-z0-9_-]{1,255}$/.test(eventId) ? eventId : null }, DEPS),
    legacy,
  };
}

/**
 * A customer's own refresh of their order: re-check the provider when the order's policy is approved and the last
 * complete answer is missing or older than five minutes. False when automated reconciliation cannot judge this order,
 * so the caller uses the older path.
 */
export async function refreshOrderFromProvider(orderId: string, paymentRecorded: boolean): Promise<boolean> {
  if (!verifierConfigured()) return false;
  try {
    if (!(await orderPolicyReady(orderId))) return false;
    const last = await orderLastVerified(orderId);
    if (paymentRecorded && last !== null && Date.now() - last.getTime() < 5 * 60_000) return true;
    // A check already running for a webhook is left to finish; the customer sees its result on the next refresh.
    await verifyAndReconcile({ orderId, purpose: "recovery", operationId: crypto.randomUUID(), eventId: null }, DEPS);
    return true;
  } catch {
    return false;
  }
}

/** Check one order with the provider and apply the answer. */
export async function verifyAndReconcileOrder(input: { orderId: string; purpose: SystemPurpose; operationId: string;
  eventId: string | null }): Promise<Result<CommerceReceipt>> {
  return toResult(await verifyAndReconcile(input, DEPS));
}
