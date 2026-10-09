import "server-only";
import type { AdminCode, Result } from "../contracts";
import { adminRpc, classifyAdminError } from "../rpc";
import { createClient } from "../../supabase/server";
import { STRIPE_API_VERSION } from "../../payments/stripe";
import type { Binding, ProviderObservation } from "../../payments/reconciliation/contracts";
import { readProviderFacts, unknownFinancialFacts } from "../../payments/reconciliation/provider-read";
import {
  claimVerification, createLocalLedgerReader, recordObservation, verifierConfigured,
} from "../../payments/reconciliation/repository";
import { createStripeReader } from "../../payments/reconciliation/stripe-provider";
import { localLedgerReaderAllowed } from "../../payments/reconciliation/verifier-config";
import { runVerification, type SourcedRead } from "../../payments/reconciliation/verifier";
import type { SupportRead } from "./contracts";
import { decodeDiagnosisJob, decodeLatestObservationRead, decodeObservationRead } from "./decode";

/**
 * Provider diagnosis for one order. The staff member's own session asks for a check (the database checks authority,
 * stage and the rate budget); the verifier connection claims it, reads the provider and records what it found. The
 * result is read back through the staff session, so what is shown is exactly what was recorded.
 */

async function sourcedRead(binding: Binding): Promise<SourcedRead> {
  if (localLedgerReaderAllowed(binding)) {
    return { ...(await readProviderFacts(binding, createLocalLedgerReader())), apiVersion: "local-ledger" };
  }
  try {
    return { ...(await readProviderFacts(binding, createStripeReader(binding))), apiVersion: STRIPE_API_VERSION };
  } catch {
    // No usable Stripe client (for example, no key on this server): record that nothing could be read.
    return { facts: unknownFinancialFacts(binding), complete: false, blockers: ["provider_unavailable"], apiVersion: STRIPE_API_VERSION };
  }
}

// ADM_DENIED here comes from the verifier connection (not registered or revoked), not from the staff member.
const RUN_CODES: Record<string, AdminCode> = { ORDER_CHANGED: "STALE", REQUESTER_REVOKED: "DENIED", ADM_DENIED: "UNAVAILABLE" };

function failure(code: string): { ok: false; code: AdminCode; reference: string } {
  const mapped = RUN_CODES[code] ?? classifyAdminError({ message: code });
  return { ok: false, code: mapped, reference: `support-diagnosis-${code.toLowerCase().replace(/_/g, "-")}` };
}

export async function diagnoseSupportOrder(orderId: string, operationId: string): Promise<Result<SupportRead<ProviderObservation>>> {
  if (!verifierConfigured()) return { ok: false, code: "UNAVAILABLE", reference: "support-diagnosis-verifier" };
  const supabase = await createClient();
  const begun = await adminRpc(() => supabase.rpc("admin_support_diagnose_begin", { p_order_id: orderId, p_operation_id: operationId }),
    decodeDiagnosisJob, true);
  if (!begun.ok) return begun;
  const run = await runVerification(begun.value.jobId, { claim: claimVerification, read: sourcedRead, record: recordObservation });
  if (!run.ok) return failure(run.code);
  return adminRpc(() => supabase.rpc("admin_support_observation", { p_id: run.observationId }), decodeObservationRead);
}

export async function loadLatestObservation(orderId: string): Promise<Result<SupportRead<ProviderObservation | null>>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_latest_observation", { p_order_id: orderId }), decodeLatestObservationRead);
}
