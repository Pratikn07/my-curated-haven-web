"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Result } from "@/lib/admin/contracts";
import type { OperationStatus, ProposalListItem, RepairKind } from "@/lib/admin/support/contracts";
import {
  approveRepairAction, executeRepairAction, operationStatusAction, postcheckAction, prepareRepairAction,
} from "@/lib/admin/support/actions";
import { isReceipt } from "@/lib/admin/support/execution";
import { REPAIR_KIND_LABELS } from "@/lib/admin/support/labels";
import RepairPreview from "./RepairPreview";
import RepairResult from "./RepairResult";

const subscribeHydration = () => () => {};

function failure(code: string): string {
  if (code === "STALE") return "Something changed since this repair was prepared. Check provider status and prepare it again.";
  if (code === "BLOCKED") return "This repair is blocked and cannot go ahead.";
  if (code === "CONFLICT") return "This repair was already approved or is already running. Check the operation result.";
  if (code === "DENIED") return "You don't have permission for this step.";
  if (code === "DISABLED") return "Repairs are switched off.";
  if (code === "RATE_LIMITED") return "Too many checks in the last minute. Wait a minute and try again.";
  return `That did not go through (${code}). Nothing was changed.`;
}

/**
 * Prepare, review, approve and apply one repair of this order. Every step is a server command that checks authority
 * again; this component only passes the proposal id, its digest and a stable operation id.
 */
export default function RepairWorkflow({ orderId, supportReference, observationId, proposals, can }: {
  orderId: string; supportReference: string; observationId: string | null; proposals: Result<ProposalListItem[]>;
  can: { prepare: boolean; approve: boolean; execute: boolean };
}) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const router = useRouter();
  const latest = proposals.ok ? proposals.value[0] ?? null : null;
  const [item, setItem] = useState<ProposalListItem | null>(latest);
  const [operation, setOperation] = useState<OperationStatus | null>(latest?.operation ?? null);
  const [kind, setKind] = useState<RepairKind>("reconcile_order");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // One operation id per proposal, kept across retries so a repeat can never start a second repair.
  const operationId = useRef<string | null>(latest?.operation?.operationId ?? null);

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

  const prepare = () => run(async () => {
    if (!observationId) return;
    const result = await prepareRepairAction({ orderId, observationId, kind, reason, operationId: crypto.randomUUID() });
    if (!result.ok) { setMessage(failure(result.code)); return; }
    setItem({ proposal: result.value, state: result.value.blockers.length > 0 ? "blocked" : "awaiting_approval", approval: null,
      operation: null, preparedAt: new Date().toISOString() });
    setOperation(null);
    operationId.current = null;
    setReason("");
  });

  async function approve(): Promise<boolean> {
    if (!item) return false;
    if (item.approval) return true;
    const result = await approveRepairAction(item.proposal.id, item.proposal.digest, crypto.randomUUID());
    if (!result.ok) { setMessage(failure(result.code)); return false; }
    setItem({ ...item, state: "approved", approval: result.value });
    return true;
  }

  async function apply() {
    if (!item) return;
    operationId.current ??= crypto.randomUUID();
    const result = await executeRepairAction({ operationId: operationId.current, proposalId: item.proposal.id,
      expectedDigest: item.proposal.digest, caseId: null });
    if (!result.ok) { setMessage(failure(result.code)); return; }
    setOperation(result.value);
    if (isReceipt(result.value) && result.value.state === "applied") {
      const checked = await postcheckAction(result.value.operationId);
      setOperation(checked.ok ? checked.value : { ...result.value, verification: "unavailable" });
    }
  }

  const check = () => run(async () => {
    if (!operationId.current) return;
    const result = await operationStatusAction(operationId.current);
    if (result.ok) setOperation(result.value); else setMessage(failure(result.code));
  });
  const confirm = () => run(async () => {
    if (!operationId.current) return;
    const result = await postcheckAction(operationId.current);
    if (result.ok) setOperation(result.value); else setMessage(failure(result.code));
  });

  const live = item !== null && item.proposal.blockers.length === 0 && item.state !== "expired"
    && Date.parse(item.proposal.expiresAt) > Date.now();
  const disabled = !hydrated || busy;
  return (
    <section aria-labelledby="support-repair" className="admin-collection__section">
      <h2 id="support-repair">Repair</h2>
      {!proposals.ok ? <p role="status">Earlier repairs are unavailable ({proposals.code}).</p> : null}
      {can.prepare ? (observationId ? (
        <form className="admin-support__prepare" onSubmit={(e) => { e.preventDefault(); void prepare(); }}>
          <label htmlFor="support-repair-kind">Repair</label>
          <select id="support-repair-kind" value={kind} disabled={disabled} onChange={(e) => setKind(e.target.value as RepairKind)}>
            {Object.entries(REPAIR_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label htmlFor="support-repair-reason">Reason</label>
          <textarea id="support-repair-reason" value={reason} maxLength={500} required disabled={disabled}
            onChange={(e) => setReason(e.target.value)} />
          <button type="submit" disabled={disabled || reason.trim().length === 0}>Prepare repair</button>
        </form>
      ) : <p>Check provider status first; a repair is prepared from a complete Stripe check.</p>) : null}

      {item ? <RepairPreview item={item} supportReference={supportReference} /> : null}

      {item && operation === null && live ? (
        <div className="admin-support__actions">
          {can.approve && can.execute && !item.approval
            ? <button type="button" disabled={disabled} onClick={() => run(async () => { if (await approve()) await apply(); })}>
                Approve and apply repair</button> : null}
          {can.approve && !can.execute && !item.approval
            ? <button type="button" disabled={disabled} onClick={() => run(async () => { await approve(); })}>Approve repair</button> : null}
          {can.execute && item.approval
            ? <button type="button" disabled={disabled} onClick={() => run(apply)}>Apply approved repair</button> : null}
          {!can.approve && !item.approval ? <p>Waiting for the owner&rsquo;s approval.</p> : null}
        </div>
      ) : null}

      {operation ? <RepairResult status={operation} busy={disabled} onCheck={() => void check()} onConfirm={() => void confirm()} /> : null}
      <p role="status" aria-label="Repair status">{message ?? ""}</p>
    </section>
  );
}
