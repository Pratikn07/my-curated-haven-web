import type { CommerceReceipt, RepairEffect } from "./contracts";
import type { VerificationResult } from "./verifier";

/**
 * Automated reconciliation of one order: ask for a check, verify it, then apply the recorded answer through the
 * shared database writer. Every step is injected and the receipt is decoded strictly; with no runtime imports this
 * file is unit-tested directly, without a database. It never changes access itself; the database decides under the order's approved policy.
 */

export type SystemPurpose = "webhook" | "recovery";
export type ReconcileOutcome = { ok: true; receipt: CommerceReceipt } | { ok: false; code: string; reasons: string[] };
export type ReconcileDeps = {
  request(orderId: string, purpose: SystemPurpose): Promise<string>;
  /** Claim, read and record the job (runVerification with its own dependencies). */
  verify(jobId: string): Promise<VerificationResult>;
  apply(observationId: string, operationId: string, eventId: string | null): Promise<unknown>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const REASON = /^[a-z][a-z0-9_]{1,63}$/;

class InvalidReceipt extends Error {}

function fail(path: string): never {
  throw new InvalidReceipt(path);
}

function exactKeys(value: unknown, keys: string[], path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(path);
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort();
  if (actual.length !== keys.length || actual.some((key, i) => key !== [...keys].sort()[i])) fail(path);
  return record;
}

const uuid = (v: unknown, p: string) => (typeof v === "string" && UUID.test(v) ? v : fail(p));
const oneOf = <T extends string>(v: unknown, values: T[], p: string): T => ((values as unknown[]).includes(v) ? (v as T) : fail(p));

function effect(value: unknown, path: string): RepairEffect {
  const e = exactKeys(value, ["sourceId", "beforeEligible", "afterEligible", "beforeEffective", "afterEffective", "recipeIds",
    "notification"], path);
  if (e.beforeEligible !== null && typeof e.beforeEligible !== "boolean") fail(`${path}.beforeEligible`);
  if (typeof e.afterEligible !== "boolean") fail(`${path}.afterEligible`);
  if (!Array.isArray(e.recipeIds) || e.recipeIds.length > 500) fail(`${path}.recipeIds`);
  return {
    sourceId: uuid(e.sourceId, `${path}.sourceId`),
    beforeEligible: e.beforeEligible as boolean | null,
    afterEligible: e.afterEligible,
    beforeEffective: oneOf(e.beforeEffective, ["active", "denied"], `${path}.beforeEffective`),
    afterEffective: oneOf(e.afterEffective, ["active", "denied"], `${path}.afterEffective`),
    recipeIds: (e.recipeIds as unknown[]).map((id, i) => uuid(id, `${path}.recipeIds[${i}]`)),
    notification: oneOf(e.notification, ["none", "purchase_confirmation"], `${path}.notification`),
  };
}

/** A committed receipt, or the reasons the database refused to change anything. Anything else throws. */
export function decodeReconciliation(input: unknown): ReconcileOutcome {
  const blocked = (input as { state?: unknown } | null)?.state === "blocked";
  const keys = ["operationId", "orderId", "state", "effects", "auditId", "committedAt", ...(blocked ? ["reasons"] : [])];
  const r = exactKeys(input, keys, "receipt");
  if (!Array.isArray(r.effects) || r.effects.length > 10) fail("receipt.effects");
  if (typeof r.committedAt !== "string" || Number.isNaN(Date.parse(r.committedAt))) fail("receipt.committedAt");
  const operationId = uuid(r.operationId, "receipt.operationId");
  const orderId = uuid(r.orderId, "receipt.orderId");
  const effects = (r.effects as unknown[]).map((e, i) => effect(e, `receipt.effects[${i}]`));
  const auditId = uuid(r.auditId, "receipt.auditId");
  if (blocked) {
    if (!Array.isArray(r.reasons) || r.reasons.length === 0 || r.reasons.some((x) => typeof x !== "string" || !REASON.test(x))) {
      fail("receipt.reasons");
    }
    return { ok: false, code: "BLOCKED", reasons: r.reasons as string[] };
  }
  const state = oneOf(r.state, ["applied", "already_satisfied"], "receipt.state");
  return { ok: true, receipt: { operationId, orderId, state, effects, auditId, committedAt: r.committedAt } };
}

function errorCode(error: unknown, fallback: string): string {
  const match = (error instanceof Error ? error.message : "").match(/ADM_[A-Z_]+/);
  return match ? match[0] : fallback;
}

/** Apply one recorded observation. Repeating the same operation returns the same receipt. */
export async function applyObservation(observationId: string, operationId: string, eventId: string | null,
  deps: Pick<ReconcileDeps, "apply">): Promise<ReconcileOutcome> {
  let raw: unknown;
  try {
    raw = await deps.apply(observationId, operationId, eventId);
  } catch (error) {
    return { ok: false, code: errorCode(error, "APPLY_FAILED"), reasons: [] };
  }
  try {
    return decodeReconciliation(raw);
  } catch {
    return { ok: false, code: "RECEIPT_INVALID", reasons: [] };
  }
}

/** Ask for a check of one order, verify it and apply the answer. */
export async function verifyAndReconcile(input: { orderId: string; purpose: SystemPurpose; operationId: string; eventId: string | null },
  deps: ReconcileDeps): Promise<ReconcileOutcome> {
  let jobId: string;
  try {
    jobId = await deps.request(input.orderId, input.purpose);
  } catch (error) {
    return { ok: false, code: errorCode(error, "REQUEST_FAILED"), reasons: [] };
  }
  const verified = await deps.verify(jobId);
  if (!verified.ok) return { ok: false, code: verified.code, reasons: [] };
  return applyObservation(verified.observationId, input.operationId, input.eventId, deps);
}
