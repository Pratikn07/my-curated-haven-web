import type { OperationStatus } from "@/lib/admin/support/contracts";
import { isReceipt, repairMessage } from "@/lib/admin/support/execution";

/**
 * Where an applied repair stands. Applied with an unconfirmed access check is labelled as such; an unknown outcome is
 * never shown as applied. The only follow-ups are reading the stored result and confirming access, never a second apply.
 */
export default function RepairResult({ status, busy, onCheck, onConfirm }: {
  status: OperationStatus; busy: boolean; onCheck: () => void; onConfirm: () => void;
}) {
  const message = repairMessage(status);
  const title = isReceipt(status)
    ? status.state === "already_satisfied" ? "Already in place"
      : status.verification === "verified" ? "Applied and confirmed"
      : status.verification === "unavailable" ? "Applied; access check unavailable" : "Applied; verification pending"
    : status.state === "outcome_unknown" ? "Result not known yet" : status.state === "checking" ? "Checking" : "Not applied";
  return (
    <div className="admin-support__repair" role="group" aria-label="Repair result" data-tone={message.tone}>
      <p role="status" aria-label="Repair outcome"><strong>{title}.</strong> {message.text}</p>
      <p className="admin-collection__note">Operation {status.operationId.slice(0, 8)}</p>
      <div className="admin-support__actions">
        <button type="button" onClick={onCheck} disabled={busy}>Check operation result</button>
        {isReceipt(status) && status.state === "applied" && status.verification !== "verified"
          ? <button type="button" onClick={onConfirm} disabled={busy}>Confirm customer access</button> : null}
      </div>
    </div>
  );
}
