import "server-only";
import type { AdminCode, Result } from "../../admin/contracts";
import { classifyAdminError } from "../../admin/rpc";
import { STRIPE_API_VERSION } from "../stripe";
import type { Binding, CommerceReceipt } from "./contracts";
import { applyObservation, verifyAndReconcile, type ReconcileOutcome, type SystemPurpose } from "./ledger";
import { readProviderFacts, unknownFinancialFacts } from "./provider-read";
import {
  applySystemObservation, claimVerification, createLocalLedgerReader, recordObservation, requestVerification,
} from "./repository";
import { createStripeReader } from "./stripe-provider";
import { localLedgerReaderAllowed } from "./verifier-config";
import { runVerification, type SourcedRead } from "./verifier";

/**
 * Server-only system reconciliation (webhooks and recovery). It holds no human approval and never applies a staff
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

/** Check one order with the provider and apply the answer. */
export async function verifyAndReconcileOrder(input: { orderId: string; purpose: SystemPurpose; operationId: string;
  eventId: string | null }): Promise<Result<CommerceReceipt>> {
  return toResult(await verifyAndReconcile(input, DEPS));
}
