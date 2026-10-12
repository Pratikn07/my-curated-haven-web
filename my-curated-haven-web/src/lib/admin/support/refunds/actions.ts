"use server";

import type { Result } from "../../contracts";
import type { ProviderObservation } from "../../../payments/reconciliation/contracts";
import type { SupportRead } from "../contracts";
import type { RefundApproval, RefundCommand, RefundPrepareInput, RefundProposal, RefundReceipt } from "./contracts";
import { approveSupportRefund, loadSupportRefund, prepareSupportRefund } from "./repository";
import { checkSupportRefund, recoverSupportRefund, submitSupportRefund } from "./service";

/**
 * Owner refund commands. Each one is checked again by the database (owner, refund right, MFA, stage, budgets); these
 * only refuse malformed input early. No provider key, approver, provider facts or provider arguments are accepted.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const invalid = (reference: string) => ({ ok: false as const, code: "INVALID" as const, reference });
const exactKeys = (value: object, keys: string[]) => Object.keys(value).sort().join(",") === [...keys].sort().join(",");

export async function refundCheckAction(orderId: string, operationId: string): Promise<Result<SupportRead<ProviderObservation>>> {
  if (!UUID.test(orderId) || !UUID.test(operationId)) return invalid("support-refund-check");
  return checkSupportRefund(orderId, operationId);
}

export async function prepareRefundAction(input: RefundPrepareInput & { operationId: string }, observationId: string):
  Promise<Result<RefundProposal>> {
  if (typeof input !== "object" || input === null || !UUID.test(observationId)
    || !exactKeys(input, ["orderId", "caseId", "amount", "providerReason", "exceptionCategory", "internalReason", "operationId"])
    || !UUID.test(input.orderId) || !UUID.test(input.operationId) || (input.caseId !== null && !UUID.test(input.caseId))
    || typeof input.amount !== "object" || input.amount === null
    || !(input.amount.kind === "full_remaining" ? exactKeys(input.amount, ["kind"])
      : input.amount.kind === "partial" && exactKeys(input.amount, ["kind", "amountMinor"])
        && Number.isSafeInteger(input.amount.amountMinor) && input.amount.amountMinor > 0)
    || (input.providerReason !== "requested_by_customer" && input.providerReason !== "duplicate")
    || !["duplicate_charge", "billing_error", "unresolved_delivery", "required_remedy"].includes(input.exceptionCategory)
    || typeof input.internalReason !== "string" || input.internalReason.trim().length === 0 || input.internalReason.length > 500) {
    return invalid("support-refund-prepare");
  }
  return prepareSupportRefund(input, observationId);
}

/** The approver is the signed-in session; the approval names this exact proposal and digest. */
export async function approveRefundAction(proposalId: string, digest: string): Promise<Result<RefundApproval>> {
  if (!UUID.test(proposalId) || !DIGEST.test(digest)) return invalid("support-refund-approve");
  return approveSupportRefund(proposalId, digest);
}

/** Send an approved refund. Repeating the same command returns the same operation and never sends twice. */
export async function submitRefundAction(command: RefundCommand): Promise<Result<RefundReceipt>> {
  if (typeof command !== "object" || command === null || !exactKeys(command, ["operationId", "proposalId", "expectedDigest", "caseId"])
    || !UUID.test(command.operationId) || !UUID.test(command.proposalId) || !DIGEST.test(command.expectedDigest)
    || (command.caseId !== null && !UUID.test(command.caseId))) {
    return invalid("support-refund-submit");
  }
  return submitSupportRefund(command);
}

/** The stored receipt of a refund operation; read this after a lost response instead of refunding again. */
export async function refundStatusAction(operationId: string): Promise<Result<RefundReceipt>> {
  if (!UUID.test(operationId)) return invalid("support-refund-operation");
  return loadSupportRefund(operationId);
}

/** Ask Stripe what became of a refund whose outcome is unknown. Read-only: it never sends a refund. */
export async function recoverRefundAction(operationId: string): Promise<Result<RefundReceipt>> {
  if (!UUID.test(operationId)) return invalid("support-refund-recover");
  return recoverSupportRefund(operationId);
}
