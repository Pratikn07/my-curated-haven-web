import type { Result } from "../contracts";
import type { VerificationResult } from "../../payments/reconciliation/verifier";
import type { ExecutionStart, OperationStatus, RepairCommand, RepairReceipt } from "./contracts";

/**
 * Applying an approved repair: start the operation, check the order with the provider again, then commit under the
 * staff member's own session. A lost commit response is answered by reading the stored receipt; when that read also
 * fails the outcome is reported as unknown, never as "not committed". Every step is injected; no runtime imports.
 */

export type ExecutionPorts = {
  begin(command: RepairCommand): Promise<Result<ExecutionStart>>;
  verify(jobId: string): Promise<VerificationResult>;
  commit(operationId: string, observationId: string): Promise<Result<OperationStatus>>;
  read(operationId: string): Promise<Result<OperationStatus>>;
};

export function isReceipt(status: OperationStatus): status is RepairReceipt {
  return status.state === "applied" || status.state === "already_satisfied";
}

const pending = (operationId: string, state: "checking" | "blocked" | "outcome_unknown", reasonCode: string | null):
  Result<OperationStatus> => ({ ok: true, value: { operationId, state, reasonCode } });

// Refusals that mean "nothing was committed; prepare or approve again".
const REFUSED = new Set(["STALE", "BLOCKED", "CONFLICT", "INVALID"]);

export async function coordinateSupportRepair(command: RepairCommand, ports: ExecutionPorts): Promise<Result<OperationStatus>> {
  const begun = await ports.begin(command);
  if (!begun.ok) return begun;
  const { status, jobId } = begun.value;
  // A repeated command returns the stored receipt or the state the operation already reached.
  if (isReceipt(status) || status.state !== "checking") return { ok: true, value: status };

  const verified = await ports.verify(jobId);
  if (!verified.ok) {
    const read = await ports.read(command.operationId);
    return read.ok ? read : pending(command.operationId, "checking", null);
  }

  const committed = await ports.commit(command.operationId, verified.observationId);
  if (committed.ok) return committed;
  if (REFUSED.has(committed.code)) return pending(command.operationId, "blocked", committed.code);
  // The commit may or may not have happened: read before saying anything.
  const read = await ports.read(command.operationId);
  if (read.ok && isReceipt(read.value)) return read;
  return pending(command.operationId, "outcome_unknown", null);
}

/** One message per operation state, so the page never shows an unknown or blocked outcome as applied. */
export function repairMessage(status: OperationStatus): { tone: "success" | "pending" | "error"; text: string } {
  switch (status.state) {
    case "applied":
      // The result title already says "Applied"; the message says what the access check found.
      return { tone: "success", text: status.verification === "verified" ? "The customer's access matches what was approved."
        : status.verification === "unavailable" ? "The access check could not run; confirm the customer's access below."
        : "Confirming the customer's access…" };
    case "already_satisfied":
      return { tone: "success", text: "Already in place. Nothing needed changing." };
    case "checking":
      return { tone: "pending", text: "Checking with Stripe before applying…" };
    case "blocked":
      return { tone: "error", text: status.reasonCode === "STALE" || status.reasonCode === "APPROVAL_EXPIRED"
        ? "Not applied. Something changed since approval; prepare and approve the repair again."
        : `Not applied (${status.reasonCode ?? "blocked"}).` };
    case "failed_no_commit":
      return { tone: "error", text: `Not applied. The check did not finish (${status.reasonCode ?? "unknown reason"}).` };
    case "outcome_unknown":
      return { tone: "pending", text: "The result is not known yet. Check the operation result before trying anything else." };
  }
}
