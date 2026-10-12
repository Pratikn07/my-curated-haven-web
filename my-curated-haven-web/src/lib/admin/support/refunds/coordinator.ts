import type { RefundCommand, RefundDispatchClaim, RefundIntent, RefundReceipt, RefundSubmissionResult } from "./contracts";

/**
 * One owner refund submission. Reserve (or find the existing reservation), get fresh evidence, claim the single
 * dispatch, read the frozen request, send once, record the answer. A lost or ambiguous provider answer is recorded as
 * unknown; an ordinary retry of a refund that may already have been sent only reads its status and never sends again.
 * If the request could not even be read, nothing left, and that is recorded as not sent. No runtime imports.
 */

export type RefundPorts = {
  reserve(command: RefundCommand): Promise<RefundReceipt>;
  verify(operationId: string): Promise<{ observationId: string }>;
  claim(command: RefundCommand, observationId: string): Promise<RefundDispatchClaim>;
  payload(claim: RefundDispatchClaim): Promise<RefundIntent>;
  submit(claim: RefundDispatchClaim, intent: RefundIntent): Promise<RefundSubmissionResult>;
  record(claim: RefundDispatchClaim, result: RefundSubmissionResult): Promise<RefundReceipt>;
  read(operationId: string): Promise<RefundReceipt>;
};

export async function coordinateRefund(command: RefundCommand, ports: RefundPorts): Promise<RefundReceipt> {
  const reserved = await ports.reserve(command);
  if (reserved.state !== "reserved") return reserved.state === "dispatching" || reserved.state === "outcome_unknown"
    ? ports.read(command.operationId) : reserved;
  const { observationId } = await ports.verify(command.operationId);
  const claim = await ports.claim(command, observationId);
  let intent: RefundIntent;
  try {
    intent = await ports.payload(claim);
  } catch {
    return ports.record(claim, { kind: "not_executed", code: "PAYLOAD_UNAVAILABLE" });
  }
  let result: RefundSubmissionResult;
  try {
    result = await ports.submit(claim, intent);
  } catch {
    // The request may have reached the provider: never assume it did not.
    result = { kind: "unknown", code: "PROVIDER_OUTCOME_UNKNOWN" };
  }
  return ports.record(claim, result);
}
