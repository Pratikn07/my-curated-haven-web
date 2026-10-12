import "server-only";
import type { Result } from "../contracts";
import { adminRpc } from "../rpc";
import { createClient } from "../../supabase/server";
import { claimVerification, recordObservation, verifierConfigured } from "../../payments/reconciliation/repository";
import { sourcedProviderRead } from "../../payments/reconciliation/service";
import { runVerification } from "../../payments/reconciliation/verifier";
import type { OperationStatus, RepairCommand, RepairReceipt } from "./contracts";
import { decodeExecutionStart, decodeOperation } from "./decode";
import { coordinateSupportRepair, isReceipt } from "./execution";
import { settleSupportPostcheck } from "./postcheck";
import { safeSupportLog } from "./logging";
import { consumeLocalFault } from "./test-faults";

/**
 * Server wiring for applying an approved repair. Starting and committing run through the staff member's own session,
 * so the database checks their identity, assurance and authority at the commit itself; the verifier connection only
 * reads the provider and records evidence.
 */

export async function loadSupportOperation(operationId: string): Promise<Result<OperationStatus>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_operation", { p_operation_id: operationId }), decodeOperation);
}

export async function executeSupportRepair(command: RepairCommand): Promise<Result<OperationStatus>> {
  const result = await runSupportRepair(command);
  if (result.ok && result.value.state === "outcome_unknown") {
    console.warn("[support] repair outcome unknown", safeSupportLog({ operationId: command.operationId, code: "OUTCOME_UNKNOWN" }));
  }
  return result;
}

async function runSupportRepair(command: RepairCommand): Promise<Result<OperationStatus>> {
  if (!verifierConfigured()) return { ok: false, code: "UNAVAILABLE", reference: "support-repair-verifier" };
  const supabase = await createClient();
  // Local browser tests can drop the commit's response and the read that follows it (see test-faults.ts).
  let dropRead = false;
  const lost = { ok: false as const, code: "UNAVAILABLE" as const, reference: "support-test-fault" };
  return coordinateSupportRepair(command, {
    begin: (c) => adminRpc(() => supabase.rpc("admin_support_execute_begin", { p_command: c }), decodeExecutionStart, true),
    verify: (jobId) => runVerification(jobId, { claim: claimVerification, read: sourcedProviderRead, record: recordObservation }),
    commit: async (operationId, observationId) => {
      const result = await adminRpc(() => supabase.rpc("admin_support_execute",
        { p_operation_id: operationId, p_observation_id: observationId }), decodeOperation);
      if (result.ok && consumeLocalFault("lose-next-commit")) {
        dropRead = true;
        return lost;
      }
      return result;
    },
    read: async (operationId) => {
      if (dropRead) {
        dropRead = false;
        return lost;
      }
      return loadSupportOperation(operationId);
    },
  });
}

/**
 * Confirm a committed repair against the customer's current access. The database does the comparison; a call that
 * fails leaves the receipt applied with verification `unavailable`.
 */
export async function postcheckSupportRepair(operationId: string): Promise<Result<OperationStatus>> {
  const current = await loadSupportOperation(operationId);
  if (!current.ok || !isReceipt(current.value)) return current;
  const supabase = await createClient();
  let checked: RepairReceipt | null = null;
  const settled = await settleSupportPostcheck(current.value, async () => {
    if (consumeLocalFault("fail-next-postcheck")) throw new Error("local test fault");
    const result = await adminRpc(() => supabase.rpc("admin_support_postcheck", { p_operation_id: operationId }), decodeOperation);
    if (!result.ok || !isReceipt(result.value)) throw new Error("post-check unavailable");
    checked = result.value;
    return result.value.verification === "verified";
  });
  return { ok: true, value: checked ?? settled };
}
