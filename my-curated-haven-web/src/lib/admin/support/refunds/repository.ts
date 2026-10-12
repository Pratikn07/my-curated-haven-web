import "server-only";
import type { Result } from "../../contracts";
import { adminRpc } from "../../rpc";
import { createClient } from "../../../supabase/server";
import { decodeDiagnosisJob, decodeRefundApproval, decodeRefundList, decodeRefundProposal, decodeRefundReceipt } from "../decode";
import type { RefundApproval, RefundCommand, RefundList, RefundPrepareInput, RefundProposal, RefundReceipt } from "./contracts";

/**
 * Owner refund commands through the signed-in owner's own session. The database checks owner status, the exact
 * refund right, MFA and the support stage on every call; nothing here carries an approver, a provider key or facts.
 */

export async function startRefundCheck(orderId: string, operationId: string): Promise<Result<{ jobId: string }>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_refund_check_begin", { p_order_id: orderId, p_operation_id: operationId }),
    decodeDiagnosisJob, true);
}

export async function prepareSupportRefund(input: RefundPrepareInput & { operationId: string }, observationId: string):
  Promise<Result<RefundProposal>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_refund_prepare", { p_input: input, p_observation_id: observationId }),
    decodeRefundProposal, true);
}

export async function approveSupportRefund(proposalId: string, digest: string): Promise<Result<RefundApproval>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_refund_approve", { p_proposal_id: proposalId, p_digest: digest }),
    decodeRefundApproval, true);
}

export async function reserveSupportRefund(command: RefundCommand): Promise<Result<RefundReceipt>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_refund_reserve", { p_command: command }), decodeRefundReceipt, true);
}

export async function loadSupportRefund(operationId: string): Promise<Result<RefundReceipt>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_refund_operation", { p_operation_id: operationId }), decodeRefundReceipt);
}

export async function loadSupportRefunds(orderId: string): Promise<Result<RefundList>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_refunds", { p_order_id: orderId }), decodeRefundList);
}
