import "server-only";
import type { Result } from "../../contracts";
import { adminRpc } from "../../rpc";
import { createClient } from "../../../supabase/server";
import { decodeNoticeApproval, decodeNoticeDraft, decodeNoticeList, decodeNoticeReceipt } from "../decode";
import type { DisputeNoticeDraft, NoticeApproval, NoticeList, NoticeReceipt } from "./contracts";

/**
 * Owner notice commands through the signed-in owner's own session. The database checks owner status, the exact notice
 * right, MFA, the support stage and the notice switch on every call; nothing here carries a recipient, text or approver.
 */

export async function prepareDisputeNotice(orderId: string, disputeId: string, observationId: string): Promise<Result<DisputeNoticeDraft>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_notice_prepare", { p_order_id: orderId, p_dispute_id: disputeId,
    p_observation_id: observationId }), decodeNoticeDraft, true);
}

export async function approveDisputeNotice(draftId: string, digest: string): Promise<Result<NoticeApproval>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_notice_approve", { p_draft_id: draftId, p_digest: digest }), decodeNoticeApproval, true);
}

export async function loadDisputeNotice(operationId: string): Promise<Result<NoticeReceipt>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_notice_operation", { p_operation_id: operationId }), decodeNoticeReceipt);
}

export async function loadDisputeNotices(orderId: string): Promise<Result<NoticeList>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_notices", { p_order_id: orderId }), decodeNoticeList);
}
