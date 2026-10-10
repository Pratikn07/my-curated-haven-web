import "server-only";
import type { Result } from "../contracts";
import { adminRpc } from "../rpc";
import { createClient } from "../../supabase/server";
import { claimVerification, recordObservation, verifierConfigured } from "../../payments/reconciliation/repository";
import { sourcedProviderRead } from "../../payments/reconciliation/service";
import { runVerification } from "../../payments/reconciliation/verifier";
import type { OperationStatus, RepairCommand } from "./contracts";
import { decodeExecutionStart, decodeOperation } from "./decode";
import { coordinateSupportRepair } from "./execution";

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
  if (!verifierConfigured()) return { ok: false, code: "UNAVAILABLE", reference: "support-repair-verifier" };
  const supabase = await createClient();
  return coordinateSupportRepair(command, {
    begin: (c) => adminRpc(() => supabase.rpc("admin_support_execute_begin", { p_command: c }), decodeExecutionStart, true),
    verify: (jobId) => runVerification(jobId, { claim: claimVerification, read: sourcedProviderRead, record: recordObservation }),
    commit: (operationId, observationId) => adminRpc(() => supabase.rpc("admin_support_execute",
      { p_operation_id: operationId, p_observation_id: observationId }), decodeOperation),
    read: loadSupportOperation,
  });
}
