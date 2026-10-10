"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Result } from "@/lib/admin/contracts";
import type { ProviderObservation } from "@/lib/payments/reconciliation/contracts";
import type {
  RefundExceptionCategory, RefundList, RefundListItem, RefundReason, RefundReceipt,
} from "@/lib/admin/support/refunds/contracts";
import {
  approveRefundAction, prepareRefundAction, recoverRefundAction, refundCheckAction, refundStatusAction, submitRefundAction,
} from "@/lib/admin/support/refunds/actions";
import { parseMinorAmount } from "@/lib/admin/support/refunds/messages";
import { formatUtc } from "@/lib/admin/collections/labels";
import { REFUND_EXCEPTION_LABELS, REFUND_REASON_LABELS, formatMoney } from "@/lib/admin/support/labels";
import RefundPreview from "./RefundPreview";
import RefundResult from "./RefundResult";

const subscribeHydration = () => () => {};

function failure(code: string): string {
  if (code === "STALE") return "Something changed since this refund was prepared. Check Stripe again and prepare a new refund.";
  if (code === "BLOCKED") return "This refund is blocked and cannot be approved.";
  if (code === "CONFLICT") return "This refund is already being sent or was already sent. Check its status.";
  if (code === "DENIED") return "Only the owner can refund.";
  if (code === "DISABLED") return "Sending refunds is switched off.";
  if (code === "MFA_REQUIRED") return "Verify your second factor again first.";
  if (code === "RATE_LIMITED") return "Too many refund steps in the last minute. Wait a minute and try again.";
  if (code === "INVALID") return "That amount or reason was not accepted.";
  return `That did not go through (${code}).`;
}

const unresolved = (receipt: RefundReceipt | null) => receipt !== null
  && (receipt.state === "dispatching" || receipt.state === "outcome_unknown");

/**
 * The owner's refund of this order: a fresh Stripe check, an exact prepared amount, then one "Approve and submit"
 * that records the approval and sends that exact command. Each step is a server command that checks authority again.
 * One operation id is kept per proposal, so a double click or a lost response can never send a second refund.
 */
export default function RefundWorkflow({ orderId, supportReference, currency, refunds, canSend }: {
  orderId: string; supportReference: string; currency: string | null; refunds: Result<RefundList>;
  /** False below the repair stage: refunds can be prepared and reviewed but not sent. */
  canSend: boolean;
}) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const router = useRouter();
  const latest = refunds.ok ? refunds.value.items[0] ?? null : null;
  const enabled = refunds.ok && refunds.value.submissionEnabled && canSend;
  const [item, setItem] = useState<RefundListItem | null>(latest);
  const [receipt, setReceipt] = useState<RefundReceipt | null>(latest?.receipt ?? null);
  const [observation, setObservation] = useState<ProviderObservation | null>(null);
  const [amountKind, setAmountKind] = useState<"full_remaining" | "partial">("full_remaining");
  const [amountText, setAmountText] = useState("");
  const [providerReason, setProviderReason] = useState<RefundReason>("requested_by_customer");
  const [category, setCategory] = useState<RefundExceptionCategory>("billing_error");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Kept across retries: a repeated check joins the same check, a repeated submit returns the same refund.
  const checkId = useRef<string | null>(null);
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

  const check = () => run(async () => {
    checkId.current ??= crypto.randomUUID();
    const result = await refundCheckAction(orderId, checkId.current);
    if (!result.ok) { setMessage(failure(result.code)); return; }
    checkId.current = null;
    setObservation(result.value.value);
  });

  const prepare = () => run(async () => {
    if (!observation) return;
    const amountMinor = amountKind === "partial" && currency ? parseMinorAmount(amountText, currency) : null;
    if (amountKind === "partial" && amountMinor === null) {
      setMessage(`Enter the amount in ${currency?.toUpperCase() ?? "the order's currency"}, for example 4.00.`);
      return;
    }
    const result = await prepareRefundAction({ orderId, caseId: null,
      amount: amountMinor === null ? { kind: "full_remaining" } : { kind: "partial", amountMinor },
      providerReason, exceptionCategory: category, internalReason: reason, operationId: crypto.randomUUID() }, observation.id);
    if (!result.ok) { setMessage(`${failure(result.code)} Nothing was sent.`); return; }
    setItem({ proposal: result.value, state: result.value.blockers.length > 0 ? "blocked" : "awaiting_approval", approval: null,
      receipt: null, preparedAt: new Date().toISOString() });
    setReceipt(null);
    operationId.current = null;
    setReason("");
  });

  async function submit(current: RefundListItem) {
    operationId.current ??= crypto.randomUUID();
    const command = { operationId: operationId.current, proposalId: current.proposal.id, expectedDigest: current.proposal.digest,
      caseId: null };
    const result = await submitRefundAction(command);
    if (result.ok) { setReceipt(result.value); return; }
    // The step may have stopped after the amount was reserved or sent: show what is stored instead of guessing.
    const stored = await refundStatusAction(command.operationId);
    if (stored.ok) setReceipt(stored.value);
    setMessage(`${failure(result.code)} ${stored.ok ? "Its stored status is shown below."
      : stored.code === "NOT_FOUND" ? "Nothing was sent." : "Check the refund status before trying again."}`);
  }

  const approveAndSubmit = () => run(async () => {
    if (!item) return;
    let current = item;
    if (!current.approval) {
      const approved = await approveRefundAction(current.proposal.id, current.proposal.digest);
      if (!approved.ok) { setMessage(`${failure(approved.code)} Nothing was sent.`); return; }
      current = { ...current, state: "approved", approval: approved.value };
      setItem(current);
    }
    await submit(current);
  });

  const resend = () => run(async () => { if (item) await submit(item); });
  const status = () => run(async () => {
    if (!receipt) return;
    const result = await refundStatusAction(receipt.operationId);
    if (result.ok) setReceipt(result.value); else setMessage(failure(result.code));
  });
  const recover = () => run(async () => {
    if (!receipt) return;
    const result = await recoverRefundAction(receipt.operationId);
    if (result.ok) setReceipt(result.value); else setMessage(failure(result.code));
  });

  const live = item !== null && item.proposal.blockers.length === 0 && item.state !== "expired" && item.state !== "blocked"
    && Date.parse(item.proposal.expiresAt) > Date.now();
  const disabled = !hydrated || busy;
  return (
    <section aria-labelledby="support-refund" className="admin-collection__section">
      <h2 id="support-refund">Refund</h2>
      {!refunds.ok ? <p role="status">Earlier refunds are unavailable ({refunds.code}).</p> : null}
      {refunds.ok && !enabled ? (
        <p role="status">{canSend ? "Sending refunds is switched off." : "Refunds can be sent only while support repairs are switched on."}
          {" "}You can prepare and review a refund and check earlier ones, but not send one.</p>
      ) : null}

      {unresolved(receipt) ? <p>Find out what happened to the refund below before preparing another.</p>
        : observation === null ? (
          <div className="admin-support__actions">
            <p>A refund is prepared from a fresh Stripe check.</p>
            <button type="button" disabled={disabled} onClick={() => void check()}>Check Stripe before a refund</button>
          </div>
        ) : !observation.complete ? (
          <div className="admin-support__actions">
            <p role="status">The Stripe check was incomplete, so a refund cannot be prepared from it.</p>
            <button type="button" disabled={disabled} onClick={() => void check()}>Check Stripe again</button>
          </div>
        ) : (
          <form className="admin-support__prepare" onSubmit={(e) => { e.preventDefault(); void prepare(); }}>
            <p className="admin-collection__note">Stripe checked at {formatUtc(observation.verifiedAt)}.</p>
            <fieldset disabled={disabled}>
              <legend>Amount</legend>
              <label><input type="radio" name="support-refund-amount" checked={amountKind === "full_remaining"}
                onChange={() => setAmountKind("full_remaining")} /> Everything still refundable</label>
              <label><input type="radio" name="support-refund-amount" checked={amountKind === "partial"}
                onChange={() => setAmountKind("partial")} /> Part of it</label>
            </fieldset>
            {amountKind === "partial" ? <>
              <label htmlFor="support-refund-partial">Amount in {currency?.toUpperCase() ?? "the order's currency"}</label>
              <input id="support-refund-partial" inputMode="decimal" autoComplete="off" value={amountText} required disabled={disabled}
                onChange={(e) => setAmountText(e.target.value)} />
            </> : null}
            <label htmlFor="support-refund-provider-reason">Reason sent to Stripe</label>
            <select id="support-refund-provider-reason" value={providerReason} disabled={disabled}
              onChange={(e) => setProviderReason(e.target.value as RefundReason)}>
              {Object.entries(REFUND_REASON_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label htmlFor="support-refund-category">Why this is an exception</label>
            <select id="support-refund-category" value={category} disabled={disabled}
              onChange={(e) => setCategory(e.target.value as RefundExceptionCategory)}>
              {Object.entries(REFUND_EXCEPTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label htmlFor="support-refund-reason">Internal reason</label>
            <textarea id="support-refund-reason" value={reason} maxLength={500} required disabled={disabled}
              onChange={(e) => setReason(e.target.value)} />
            <button type="submit" disabled={disabled || reason.trim().length === 0}>Prepare refund</button>
          </form>
        )}

      {item ? <RefundPreview item={item} supportReference={supportReference} /> : null}

      {item && receipt === null && live ? (
        <div className="admin-support__actions">
          <button type="button" disabled={disabled || !enabled} onClick={() => void approveAndSubmit()}>
            Approve and submit refund of {formatMoney(item.proposal.amountMinor, item.proposal.currency)}</button>
        </div>
      ) : null}
      {item && receipt?.state === "reserved" && live && enabled ? (
        <div className="admin-support__actions">
          <button type="button" disabled={disabled} onClick={() => void resend()}>Send approved refund</button>
        </div>
      ) : null}

      {receipt ? <RefundResult receipt={receipt} busy={disabled} onCheck={() => void status()} onRecover={() => void recover()} /> : null}
      <p role="status" aria-label="Refund status">{message ?? ""}</p>
    </section>
  );
}
