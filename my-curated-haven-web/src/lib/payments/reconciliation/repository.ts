import "server-only";
import { Pool } from "pg";
import type { Binding, FinancialFacts } from "./contracts";
import { classifyDispute, type ProviderReader } from "./provider-read";
import type { SystemPurpose } from "./ledger";
import type { Claim, Recorded, SourcedRead } from "./verifier";
import { verifierConnectionString } from "./verifier-config";

/**
 * The verifier's own database connection (SUPPORT_VERIFIER_DATABASE_URL): a login registered as a verifier that can
 * only claim verification jobs and record observations. Without it provider checks are unavailable; nothing falls
 * back to a broader connection.
 */

let pool: Pool | null = null;

export class VerifierUnavailable extends Error {}

export function verifierConfigured(): boolean {
  return verifierConnectionString() !== null;
}

function verifierPool(): Pool {
  const connectionString = verifierConnectionString();
  if (connectionString === null) throw new VerifierUnavailable("ADM_UNAVAILABLE: verifier not configured");
  pool ??= new Pool({ connectionString, max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
  return pool;
}

export async function claimVerification(jobId: string): Promise<Claim> {
  const { rows } = await verifierPool().query("SELECT private.commerce_verification_claim($1) AS claim", [jobId]);
  const claim = rows[0]?.claim as { state?: string; jobId?: string; fence?: unknown; binding?: Binding; observationId?: string };
  if (claim?.state === "complete" && typeof claim.observationId === "string") return { state: "complete", observationId: claim.observationId };
  if (claim?.state === "claimed" && typeof claim.jobId === "string" && Number.isSafeInteger(claim.fence) && claim.binding) {
    return { state: "claimed", jobId: claim.jobId, fence: claim.fence as number, binding: claim.binding };
  }
  throw new Error("Unexpected verification claim");
}

export async function recordObservation(jobId: string, fence: number, read: SourcedRead): Promise<Recorded> {
  const { rows } = await verifierPool().query(
    "SELECT private.commerce_observation_record($1, $2, $3::jsonb, $4, $5::jsonb, $6) AS recorded",
    [jobId, fence, JSON.stringify(read.facts), read.complete, JSON.stringify(read.blockers), read.apiVersion]);
  const recorded = rows[0]?.recorded as { state?: string; observationId?: string; code?: string };
  if (recorded?.state === "complete" && typeof recorded.observationId === "string") return { state: "complete", observationId: recorded.observationId };
  if (recorded?.state === "failed" && typeof recorded.code === "string") return { state: "failed", code: recorded.code };
  throw new Error("Unexpected observation record");
}

/** Automated processing asks for a check of one order; a live check for the same purpose is joined. */
export async function requestVerification(orderId: string, purpose: SystemPurpose): Promise<string> {
  const { rows } = await verifierPool().query("SELECT private.commerce_verification_request($1, $2) AS job", [orderId, purpose]);
  const job = rows[0]?.job;
  if (typeof job !== "string") throw new Error("Unexpected verification request");
  return job;
}

/** Apply a webhook or recovery observation through the shared writer; returns the raw receipt for strict decoding. */
export async function applySystemObservation(observationId: string, operationId: string, eventId: string | null): Promise<unknown> {
  const { rows } = await verifierPool().query("SELECT private.commerce_reconcile_system($1, $2, $3) AS receipt",
    [observationId, operationId, eventId]);
  return rows[0]?.receipt;
}

const iso = (value: Date | string) => new Date(value).toISOString();

/**
 * Local test fixture: the order's own payment, refund and dispute rows stand in for Stripe. Callers check
 * localLedgerReaderAllowed first; it never runs on a deployed site or for a live-mode order.
 */
export function createLocalLedgerReader(): ProviderReader {
  return {
    async readCheckout(binding) {
      const { rows } = await verifierPool().query(`SELECT payment_intent_id, charge_id, captured_amount, currency, paid_at, status
        FROM private.provider_payments WHERE order_id = $1 ORDER BY (status = 'succeeded') DESC, paid_at DESC LIMIT 1`, [binding.orderId]);
      const payment = rows[0];
      const facts: Omit<FinancialFacts, "refunds" | "disputes"> = { accountId: binding.accountId, mode: binding.mode,
        sessionId: binding.sessionId, paymentIntentId: payment?.payment_intent_id ?? null, chargeId: payment?.charge_id ?? null,
        capturedMinor: payment?.captured_amount ?? null, currency: payment?.currency ?? null,
        paymentState: payment === undefined ? "unpaid" : payment.status === "succeeded" ? "paid" : "unknown",
        paidAt: payment ? iso(payment.paid_at) : null };
      return facts;
    },
    async readRefundPage(binding) {
      const { rows } = await verifierPool().query(`SELECT r.provider_refund_id, p.payment_intent_id, p.charge_id, r.amount, r.currency,
          r.status, r.occurred_at
        FROM private.payment_refunds r JOIN private.provider_payments p ON p.id = r.payment_id WHERE r.order_id = $1`, [binding.orderId]);
      return { items: rows.map((r) => ({ id: r.provider_refund_id, paymentIntentId: r.payment_intent_id, chargeId: r.charge_id,
        amountMinor: r.amount, currency: r.currency, status: r.status, occurredAt: iso(r.occurred_at) })), next: null };
    },
    async readDisputePage(binding) {
      const { rows } = await verifierPool().query(`SELECT d.provider_dispute_id, p.payment_intent_id, p.charge_id, d.amount, d.currency,
          d.status
        FROM private.payment_disputes d JOIN private.provider_payments p ON p.id = d.payment_id WHERE d.order_id = $1`, [binding.orderId]);
      return { items: rows.map((d) => ({ id: d.provider_dispute_id, paymentIntentId: d.payment_intent_id, chargeId: d.charge_id,
        amountMinor: d.amount, currency: d.currency, status: d.status, classification: classifyDispute(d.status), deadline: null })),
      next: null };
    },
  };
}
