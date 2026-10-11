import "server-only";
import type { AdminCode, Result } from "../../contracts";
import { adminRpc, classifyAdminError } from "../../rpc";
import { createClient } from "../../../supabase/server";
import { createRefundWriter } from "../../../payments/refund-submission";
import {
  claimVerification, recordObservation, refundDispatchPayload, refundExpireClaim, refundReconciled, refundRecoveryTarget,
  refundResultRecord, verifierConfigured,
} from "../../../payments/reconciliation/repository";
import { sourcedProviderRead, verifyAndReconcileOrder } from "../../../payments/reconciliation/service";
import { runVerification } from "../../../payments/reconciliation/verifier";
import type { ProviderObservation } from "../../../payments/reconciliation/contracts";
import type { SupportRead } from "../contracts";
import { decodeDiagnosisJob, decodeObservationRead, decodeRefundReceipt } from "../decode";
import type { RefundCommand, RefundDispatchClaim, RefundIntent, RefundReceipt } from "./contracts";
import { coordinateRefund } from "./coordinator";
import { loadSupportRefund, reserveSupportRefund, startRefundCheck } from "./repository";

/**
 * Submitting and recovering an owner-approved refund. Reservation, the fresh check and the dispatch claim run under the
 * owner's own session; the verifier login reads the frozen request and records Stripe's answer; the provider refund
 * is then applied to access through the shared reconciliation writer.
 */

class Refused extends Error {}
const unwrap = <T>(result: Result<T>): T => {
  if (!result.ok) throw new Refused(`ADM_${result.code}`);
  return result.value;
};
const fail = (error: unknown, reference: string): { ok: false; code: AdminCode; reference: string } => ({ ok: false,
  code: classifyAdminError({ message: error instanceof Error ? error.message : "" }), reference });

async function reconcile(receipt: RefundReceipt): Promise<RefundReceipt> {
  if (receipt.state !== "submitted" || receipt.reconciliation === "applied") return receipt;
  const applied = await verifyAndReconcileOrder({ orderId: receipt.orderId, purpose: "recovery", operationId: crypto.randomUUID(), eventId: null });
  return decodeRefundReceipt(await refundReconciled(receipt.operationId, applied.ok));
}

/** The owner's fresh Stripe check that a refund is prepared from. Repeating the operation joins the same check. */
export async function checkSupportRefund(orderId: string, operationId: string): Promise<Result<SupportRead<ProviderObservation>>> {
  if (!verifierConfigured()) return { ok: false, code: "UNAVAILABLE", reference: "support-refund-verifier" };
  const begun = await startRefundCheck(orderId, operationId);
  if (!begun.ok) return begun;
  const run = await runVerification(begun.value.jobId, { claim: claimVerification, read: sourcedProviderRead, record: recordObservation });
  if (!run.ok) return { ok: false, code: run.code === "ORDER_CHANGED" ? "STALE" : "UNAVAILABLE", reference: "support-refund-check" };
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_observation", { p_id: run.observationId }), decodeObservationRead);
}

export async function submitSupportRefund(command: RefundCommand): Promise<Result<RefundReceipt>> {
  if (!verifierConfigured()) return { ok: false, code: "UNAVAILABLE", reference: "support-refund-verifier" };
  const supabase = await createClient();
  try {
    const receipt = await coordinateRefund(command, {
      reserve: async (c) => unwrap(await reserveSupportRefund(c)),
      verify: async (operationId) => {
        const { jobId } = unwrap(await adminRpc(() => supabase.rpc("admin_support_refund_dispatch_check", { p_operation_id: operationId }),
          decodeDiagnosisJob, true));
        const verified = await runVerification(jobId, { claim: claimVerification, read: sourcedProviderRead, record: recordObservation });
        if (!verified.ok) throw new Refused(verified.code.startsWith("ADM_") ? verified.code : "ADM_UNAVAILABLE");
        return { observationId: verified.observationId };
      },
      claim: async (c, observationId) => unwrap(await adminRpc(() => supabase.rpc("admin_support_refund_dispatch_claim",
        { p_command: c, p_observation_id: observationId }), (v) => v as RefundDispatchClaim)),
      payload: (claim): Promise<RefundIntent> => refundDispatchPayload(claim.operationId, claim.fence),
      submit: (claim, intent) => createRefundWriter({ mode: intent.mode }).submit(intent, Date.parse(claim.expiresAt)),
      record: async (claim, result) => reconcile(decodeRefundReceipt(await refundResultRecord(claim.operationId, claim.fence, result))),
      read: async (operationId) => unwrap(await loadSupportRefund(operationId)),
    });
    return { ok: true, value: receipt };
  } catch (error) {
    return fail(error, "support-refund-submit");
  }
}

/** Read-only recovery of a refund whose outcome is not known, or whose access reconciliation did not finish. */
export async function recoverSupportRefund(operationId: string): Promise<Result<RefundReceipt>> {
  const current = await loadSupportRefund(operationId);
  if (!current.ok || !verifierConfigured()) return current;
  try {
    let receipt = current.value;
    if (receipt.state === "dispatching" || receipt.state === "outcome_unknown") {
      const target = await refundRecoveryTarget(operationId);
      if (target.claimExpired) receipt = decodeRefundReceipt(await refundExpireClaim(operationId));
      const intentLike = { accountId: target.accountId, mode: target.mode, chargeId: target.chargeId, paymentIntentId: target.paymentIntentId,
        amountMinor: target.amountMinor, currency: target.currency, command: { operationId } } as unknown as RefundIntent;
      const result = await createRefundWriter({ mode: target.mode }).recover(intentLike);
      if (result.kind === "known") receipt = decodeRefundReceipt(await refundResultRecord(operationId, target.fence, result));
    }
    receipt = await reconcile(receipt);
    return { ok: true, value: receipt };
  } catch (error) {
    return fail(error, "support-refund-recover");
  }
}
