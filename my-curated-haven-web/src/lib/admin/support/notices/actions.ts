"use server";

import type { Result } from "../../contracts";
import type { DisputeNoticeDraft, NoticeApproval, NoticeCommand, NoticeReceipt } from "./contracts";
import { approveDisputeNotice, loadDisputeNotice, prepareDisputeNotice } from "./repository";
import { recoverDisputeNotice, sendDisputeNotice } from "./service";

/**
 * Owner notice commands. Each is checked again by the database (owner, notice right, MFA, stage, switch, budgets);
 * these only refuse malformed input early. No recipient, text, sender or approver is accepted from the browser.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const DISPUTE = /^du_[A-Za-z0-9_]{1,255}$/;
const invalid = (reference: string) => ({ ok: false as const, code: "INVALID" as const, reference });

export async function prepareNoticeAction(orderId: string, disputeId: string, observationId: string): Promise<Result<DisputeNoticeDraft>> {
  if (!UUID.test(orderId) || typeof disputeId !== "string" || !DISPUTE.test(disputeId) || !UUID.test(observationId)) {
    return invalid("support-notice-prepare");
  }
  return prepareDisputeNotice(orderId, disputeId, observationId);
}

export async function approveNoticeAction(draftId: string, digest: string): Promise<Result<NoticeApproval>> {
  if (!UUID.test(draftId) || !DIGEST.test(digest)) return invalid("support-notice-approve");
  return approveDisputeNotice(draftId, digest);
}

/** Send an approved notice once. A repeated operation never sends again; read its status instead. */
export async function sendNoticeAction(command: NoticeCommand): Promise<Result<NoticeReceipt>> {
  if (typeof command !== "object" || command === null || Object.keys(command).sort().join(",") !== "draftId,expectedDigest,operationId"
    || !UUID.test(command.operationId) || !UUID.test(command.draftId) || !DIGEST.test(command.expectedDigest)) {
    return invalid("support-notice-send");
  }
  return sendDisputeNotice(command);
}

export async function noticeStatusAction(operationId: string): Promise<Result<NoticeReceipt>> {
  if (!UUID.test(operationId)) return invalid("support-notice-operation");
  return loadDisputeNotice(operationId);
}

/** Settle a send that is still marked as sending after its claim ran out. Never sends. */
export async function recoverNoticeAction(operationId: string): Promise<Result<NoticeReceipt>> {
  if (!UUID.test(operationId)) return invalid("support-notice-recover");
  return recoverDisputeNotice(operationId);
}
