import type { RefundCommand, RefundDispatchClaim, RefundReceipt, RefundSubmissionResult } from "./contracts";

/**
 * One owner refund submission. Reserve (or find the existing reservation), get fresh evidence, claim the single
 * dispatch, send once, record the answer. A lost or ambiguous provider answer is recorded as unknown; an ordinary
 * retry of a refund that may already have been sent only reads its status and never sends again. No runtime imports.
 */

export type RefundPorts = {
  reserve(command: RefundCommand): Promise<RefundReceipt>;
  verify(operationId: string): Promise<{ observationId: string }>;
  claim(command: RefundCommand, observationId: string): Promise<RefundDispatchClaim>;
  submit(claim: RefundDispatchClaim): Promise<RefundSubmissionResult>;
  record(claim: RefundDispatchClaim, result: RefundSubmissionResult): Promise<RefundReceipt>;
  read(operationId: string): Promise<RefundReceipt>;
};

export async function coordinateRefund(command: RefundCommand, ports: RefundPorts): Promise<RefundReceipt> {
  const reserved = await ports.reserve(command);
  if (reserved.state !== "reserved") return reserved.state === "dispatching" || reserved.state === "outcome_unknown"
    ? ports.read(command.operationId) : reserved;
  const { observationId } = await ports.verify(command.operationId);
  const claim = await ports.claim(command, observationId);
  let result: RefundSubmissionResult;
  try {
    result = await ports.submit(claim);
  } catch {
    // The request may have reached the provider: never assume it did not.
    result = { kind: "unknown", code: "PROVIDER_OUTCOME_UNKNOWN" };
  }
  return ports.record(claim, result);
}

/** One sentence per refund state; an unknown money outcome never invites another refund. */
export function refundOutcomeMessage(receipt: RefundReceipt): string {
  switch (receipt.state) {
    case "reserved":
      return "Refund approved and reserved. Nothing has been sent to Stripe yet.";
    case "dispatching":
      return "Refund is being sent to Stripe. Check this operation's status before taking further action.";
    case "outcome_unknown":
      return "Refund outcome unknown. Check this operation's status before taking further action.";
    case "rejected":
      return `Stripe did not make this refund (${receipt.reasonCode ?? "rejected"}). No money moved and the amount is no longer reserved.`;
    case "submitted": {
      const stripe = receipt.providerStatus === "succeeded" ? "Stripe reports the refund succeeded."
        : receipt.providerStatus === "failed" || receipt.providerStatus === "canceled" ? `Stripe reports the refund ${receipt.providerStatus}.`
        : "Stripe has the refund and reports it pending.";
      const local = receipt.reconciliation === "applied" ? "Access has been updated."
        : receipt.reconciliation === "unavailable" ? "Local access reconciliation could not run; support will follow up."
        : "Local access reconciliation is pending.";
      return `${stripe} ${local}`;
    }
  }
}
