import "server-only";
import type { AdminCode, Result } from "../../contracts";
import { adminRpc, classifyAdminError } from "../../rpc";
import { createClient } from "../../../supabase/server";
import { createNoticeTransport } from "../../../email/ses-transport";
import {
  claimVerification, noticeExpireClaim, noticePayload, noticeResultRecord, recordObservation, verifierConfigured,
} from "../../../payments/reconciliation/repository";
import { sourcedProviderRead } from "../../../payments/reconciliation/service";
import { runVerification } from "../../../payments/reconciliation/verifier";
import { decodeDiagnosisJob, decodeNoticeClaim, decodeNoticeReceipt } from "../decode";
import type { NoticeCommand, NoticePayload, NoticeReceipt } from "./contracts";
import { coordinateNotice } from "./coordinator";
import { loadDisputeNotice } from "./repository";

/**
 * Sending and settling an owner-approved notice. The fresh check and the claim run under the owner's own session; the
 * verifier login reads the approved email under the claim and records the transport's answer.
 */

class Refused extends Error {}
const unwrap = <T>(result: Result<T>): T => {
  if (!result.ok) throw new Refused(`ADM_${result.code}`);
  return result.value;
};
const fail = (error: unknown, reference: string): { ok: false; code: AdminCode; reference: string } => ({ ok: false,
  code: classifyAdminError({ message: error instanceof Error ? error.message : "" }), reference });

export async function sendDisputeNotice(command: NoticeCommand): Promise<Result<NoticeReceipt>> {
  if (!verifierConfigured()) return { ok: false, code: "UNAVAILABLE", reference: "support-notice-verifier" };
  const supabase = await createClient();
  try {
    const receipt = await coordinateNotice(command, {
      check: async (c) => {
        const { jobId } = unwrap(await adminRpc(() => supabase.rpc("admin_support_notice_send_check", { p_draft_id: c.draftId }),
          decodeDiagnosisJob, true));
        const verified = await runVerification(jobId, { claim: claimVerification, read: sourcedProviderRead, record: recordObservation });
        if (!verified.ok) throw new Refused(verified.code === "ORDER_CHANGED" ? "ADM_STALE" : "ADM_UNAVAILABLE");
        return { observationId: verified.observationId };
      },
      claim: async (c, observationId) => unwrap(await adminRpc(() => supabase.rpc("admin_support_notice_send_claim",
        { p_command: c, p_observation_id: observationId }), decodeNoticeClaim)),
      payload: async (claim) => (await noticePayload(claim.operationId, claim.fence)) as NoticePayload,
      send: (payload) => createNoticeTransport(payload).send(payload),
      record: async (claim, result) => decodeNoticeReceipt(await noticeResultRecord(claim.operationId, claim.fence, result)),
    });
    return { ok: true, value: receipt };
  } catch (error) {
    return fail(error, "support-notice-send");
  }
}

/** Settle a send whose claim ran out without an answer: it becomes unknown. It never sends anything. */
export async function recoverDisputeNotice(operationId: string): Promise<Result<NoticeReceipt>> {
  const current = await loadDisputeNotice(operationId);
  if (!current.ok || current.value.state !== "dispatching" || !verifierConfigured()) return current;
  try {
    return { ok: true, value: decodeNoticeReceipt(await noticeExpireClaim(operationId)) };
  } catch (error) {
    return fail(error, "support-notice-recover");
  }
}
