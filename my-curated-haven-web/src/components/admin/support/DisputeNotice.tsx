"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Result } from "@/lib/admin/contracts";
import type { ProviderObservation } from "@/lib/payments/reconciliation/contracts";
import type { NoticeList, NoticeListItem, NoticeReceipt } from "@/lib/admin/support/notices/contracts";
import {
  approveNoticeAction, noticeStatusAction, prepareNoticeAction, recoverNoticeAction, sendNoticeAction,
} from "@/lib/admin/support/notices/actions";
import { noticeStatusMessage } from "@/lib/admin/support/notices/template";
import { formatUtc } from "@/lib/admin/collections/labels";
import { NOTICE_ACCESS_LABELS, NOTICE_BLOCKER_LABELS } from "@/lib/admin/support/labels";

const subscribeHydration = () => () => {};

function failure(code: string): string {
  if (code === "STALE") return "Something changed since this notice was prepared. Check provider status and prepare it again.";
  if (code === "BLOCKED") return "This notice is blocked and cannot be approved.";
  if (code === "CONFLICT") return "A notice for this dispute was already sent, or may have been. Check its status.";
  if (code === "DENIED") return "Only the owner can send a dispute notice.";
  if (code === "DISABLED") return "Sending dispute notices is switched off.";
  if (code === "MFA_REQUIRED") return "Verify your second factor again first.";
  if (code === "RATE_LIMITED") return "Too many notice steps in the last minute. Wait a minute and try again.";
  return `That did not go through (${code}).`;
}

const TITLES: Record<NoticeReceipt["state"], string> = {
  not_sent: "Not sent", dispatching: "Sending", accepted: "Accepted", failed_before_acceptance: "Not sent", outcome_unknown: "Outcome unknown",
};

/**
 * The owner's neutral email to a customer who formally disputed a payment: prepared from the latest complete Stripe
 * check, shown exactly as it will be sent, approved and sent once. A send whose answer was lost is never repeated.
 */
export default function DisputeNotice({ orderId, observation, notices, canSend }: {
  orderId: string; observation: ProviderObservation | null; notices: Result<NoticeList>;
  /** False below the repair stage: notices can be prepared and reviewed but not sent. */
  canSend: boolean;
}) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const router = useRouter();
  const latest = notices.ok ? notices.value.items[0] ?? null : null;
  const enabled = notices.ok && notices.value.sendingEnabled && canSend;
  const [item, setItem] = useState<NoticeListItem | null>(latest);
  const [receipt, setReceipt] = useState<NoticeReceipt | null>(latest?.receipt ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const operationId = useRef<string | null>(latest?.receipt?.operationId ?? null);

  async function run(step: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await step();
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  const open = observation?.complete ? observation.facts.disputes.filter((d) => d.classification === "formal"
    && (d.status === "needs_response" || d.status === "under_review")) : [];
  const prepare = (disputeId: string) => run(async () => {
    if (!observation) return;
    const result = await prepareNoticeAction(orderId, disputeId, observation.id);
    if (!result.ok) { setMessage(`${failure(result.code)} Nothing was sent.`); return; }
    setItem({ draft: result.value, state: result.value.blockers.length > 0 ? "blocked" : "awaiting_approval", approval: null, receipt: null,
      preparedAt: new Date().toISOString() });
    setReceipt(null);
    operationId.current = null;
  });

  const approveAndSend = () => run(async () => {
    if (!item) return;
    let current = item;
    if (!current.approval) {
      const approved = await approveNoticeAction(current.draft.id, current.draft.digest);
      if (!approved.ok) { setMessage(`${failure(approved.code)} Nothing was sent.`); return; }
      current = { ...current, state: "approved", approval: approved.value };
      setItem(current);
    }
    operationId.current ??= crypto.randomUUID();
    const command = { operationId: operationId.current, draftId: current.draft.id, expectedDigest: current.draft.digest };
    const result = await sendNoticeAction(command);
    if (result.ok) { setReceipt(result.value); return; }
    // The step may have stopped after the email left: show what is stored instead of guessing.
    const stored = await noticeStatusAction(command.operationId);
    if (stored.ok) setReceipt(stored.value);
    setMessage(`${failure(result.code)} ${stored.ok ? "Its stored status is shown below."
      : stored.code === "NOT_FOUND" ? "Nothing was sent." : "Check the notice status before trying again."}`);
  });
  const status = () => run(async () => {
    if (!receipt) return;
    const result = await noticeStatusAction(receipt.operationId);
    if (result.ok) setReceipt(result.value); else setMessage(failure(result.code));
  });
  const settle = () => run(async () => {
    if (!receipt) return;
    const result = await recoverNoticeAction(receipt.operationId);
    if (result.ok) setReceipt(result.value); else setMessage(failure(result.code));
  });

  const draft = item?.draft ?? null;
  const live = item !== null && draft !== null && draft.blockers.length === 0 && item.state !== "expired" && item.state !== "blocked"
    && Date.parse(draft.expiresAt) > Date.now();
  const unsettled = receipt !== null && (receipt.state === "dispatching" || receipt.state === "outcome_unknown");
  const disabled = !hydrated || busy;
  return (
    <section aria-labelledby="support-notice" className="admin-collection__section">
      <h2 id="support-notice">Dispute notice</h2>
      <p className="admin-collection__note">Answer the bank in the Stripe Dashboard before the deadline; this email does not respond to the dispute.</p>
      {!notices.ok ? <p role="status">Earlier notices are unavailable ({notices.code}).</p> : null}
      {notices.ok && !enabled ? (
        <p role="status">{canSend ? "Sending dispute notices is switched off." : "Notices can be sent only while support repairs are switched on."}
          {" "}You can prepare and review one, but not send it.</p>
      ) : null}

      {unsettled ? <p>Find out what happened to the notice below before preparing another.</p>
        : !observation?.complete ? <p>Check provider status first; a notice is prepared from a complete Stripe check.</p>
        : open.length === 0 ? <p>Stripe shows no formal dispute open on this payment.</p>
        : (
          <div className="admin-support__actions">
            {open.map((d) => (
              <button key={d.id} type="button" disabled={disabled} onClick={() => void prepare(d.id)}>Prepare notice for dispute {d.id}</button>
            ))}
          </div>
        )}

      {draft ? (
        <div className="admin-support__repair" role="group" aria-label="Notice preview">
          <p><strong>Email to the customer</strong>{item?.approval ? ` · approved at ${formatUtc(item.approval.approvedAt)}` : ""}</p>
          {draft.redacted ? <p>The recipient and text were removed under the notice retention period.</p> : (
            <dl className="admin-collection__facts">
              <div><dt>To</dt><dd>{draft.recipient}</dd></div>
              <div><dt>Subject</dt><dd>{draft.subject}</dd></div>
              <div><dt>Text</dt><dd className="admin-support__notice-text">{draft.text}</dd></div>
            </dl>
          )}
          <dl className="admin-collection__facts">
            <div><dt>Dispute</dt><dd>{draft.disputeId} ({draft.disputeStatus.replaceAll("_", " ")})</dd></div>
            <div><dt>Respond in Stripe by</dt><dd>{draft.respondBy ? formatUtc(draft.respondBy) : "Not given"}</dd></div>
            <div><dt>Customer access</dt><dd>{NOTICE_ACCESS_LABELS[draft.effectiveAccess]}</dd></div>
            <div><dt>Prepared</dt><dd>{item ? formatUtc(item.preparedAt) : ""}; expires {formatUtc(draft.expiresAt)}</dd></div>
          </dl>
          {draft.blockers.length > 0 ? (
            <div role="status" aria-label="Why this notice is blocked">
              <p>This notice cannot be sent:</p>
              <ul>{draft.blockers.map((b) => <li key={b}>{NOTICE_BLOCKER_LABELS[b] ?? b}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {item && receipt === null && live ? (
        <div className="admin-support__actions">
          <button type="button" disabled={disabled || !enabled} onClick={() => void approveAndSend()}>Approve and send notice</button>
        </div>
      ) : null}

      {receipt ? (
        <div className="admin-support__repair" role="group" aria-label="Notice result">
          <p role="status" aria-label="Notice outcome"><strong>{TITLES[receipt.state]}.</strong> {noticeStatusMessage(receipt.state, receipt.delivery)}</p>
          <p className="admin-collection__note">Operation {receipt.operationId.slice(0, 8)}</p>
          <div className="admin-support__actions">
            <button type="button" disabled={disabled} onClick={() => void status()}>Check notice status</button>
            {receipt.state === "dispatching" ? <button type="button" disabled={disabled} onClick={() => void settle()}>Settle a stalled send</button> : null}
          </div>
        </div>
      ) : null}
      <p role="status" aria-label="Notice status">{message ?? ""}</p>
    </section>
  );
}
