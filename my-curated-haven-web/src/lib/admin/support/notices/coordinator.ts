import type { NoticeClaim, NoticeCommand, NoticePayload, NoticeReceipt, NoticeSendResult } from "./contracts";

/**
 * One owner-approved notice send: a fresh check, the single claim, the approved email read under that claim, one
 * transport call, the answer recorded. An email that may have left is never sent again: a lost answer is unknown. If
 * the email could not even be read, nothing left, and that is recorded as not sent. No runtime imports.
 */

export type NoticePorts = {
  check(command: NoticeCommand): Promise<{ observationId: string }>;
  claim(command: NoticeCommand, observationId: string): Promise<NoticeClaim>;
  payload(claim: NoticeClaim): Promise<NoticePayload>;
  send(payload: NoticePayload): Promise<NoticeSendResult>;
  record(claim: NoticeClaim, result: NoticeSendResult): Promise<NoticeReceipt>;
};

export async function coordinateNotice(command: NoticeCommand, ports: NoticePorts): Promise<NoticeReceipt> {
  const { observationId } = await ports.check(command);
  const claim = await ports.claim(command, observationId);
  let payload: NoticePayload;
  try {
    payload = await ports.payload(claim);
  } catch {
    return ports.record(claim, { kind: "not_executed", code: "PAYLOAD_UNAVAILABLE" });
  }
  let result: NoticeSendResult;
  try {
    result = await ports.send(payload);
  } catch {
    // The request may have reached the provider: never assume it did not.
    result = { kind: "unknown", code: "TRANSPORT_FAILED" };
  }
  return ports.record(claim, result);
}
