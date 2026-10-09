import type { Binding, RepairEffect } from "../../payments/reconciliation/contracts";
import type { OperationPending, OperationStatus, RepairProposal, RepairReceipt } from "./contracts";

/**
 * Runtime decoding of support RPC responses. Every nested identifier, enum and amount is checked and unknown keys
 * are refused. A mismatch throws, and the caller reports the whole response as UNAVAILABLE instead of rendering a
 * guessed or partial record.
 */

class Invalid extends Error {}
type Decoder<T> = (value: unknown, path: string) => T;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const CODE = /^[A-Z][A-Z0-9_]{1,63}$/;
const CURRENCY = /^[a-z]{3}$/;
const ACCOUNT = /^acct_[A-Za-z0-9_]{1,64}$/;
const SESSION = /^cs_(?:test|live)_[A-Za-z0-9_]{1,255}$/;

function bad(path: string): never {
  throw new Invalid(path);
}

function object<T>(fields: { [K in keyof T]: Decoder<T[K]> }): Decoder<T> {
  return (value, path) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) bad(path);
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) if (!(key in fields)) bad(`${path}.${key}`);
    const out = {} as T;
    for (const key of Object.keys(fields) as (keyof T)[]) {
      out[key] = fields[key](record[key as string], `${path}.${String(key)}`);
    }
    return out;
  };
}

const text = (max: number): Decoder<string> => (v, p) =>
  (typeof v === "string" && v.length > 0 && v.length <= max ? v : bad(p));
const pattern = (re: RegExp): Decoder<string> => (v, p) => (typeof v === "string" && re.test(v) ? v : bad(p));
const uuid = pattern(UUID);
const digest = pattern(DIGEST);
const code = pattern(CODE);
const timestamp: Decoder<string> = (v, p) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : bad(p));
const bool: Decoder<boolean> = (v, p) => (typeof v === "boolean" ? v : bad(p));
const count: Decoder<number> = (v, p) => (Number.isSafeInteger(v) && (v as number) >= 0 ? (v as number) : bad(p));
const minor: Decoder<number> = count;
const nullable = <T>(d: Decoder<T>): Decoder<T | null> => (v, p) => (v === null ? null : d(v, p));
const oneOf = <T extends string>(...values: T[]): Decoder<T> => (v, p) =>
  (typeof v === "string" && (values as string[]).includes(v) ? (v as T) : bad(p));
const array = <T>(d: Decoder<T>, max = 500): Decoder<T[]> => (v, p) =>
  (Array.isArray(v) && v.length <= max ? v.map((item, i) => d(item, `${p}[${i}]`)) : bad(p));

const binding = object<Binding>({
  orderId: uuid,
  userId: nullable(uuid),
  ownerPrincipal: uuid,
  collectionId: uuid,
  releaseId: uuid,
  sessionId: nullable(pattern(SESSION)),
  accountId: pattern(ACCOUNT),
  mode: oneOf("test", "live"),
  expectedCapturedMinor: nullable(minor),
  currency: nullable(pattern(CURRENCY)),
  manifestHash: nullable(digest),
  refundPolicyVersion: nullable(text(100)),
  accessPolicyVersion: nullable(text(100)),
  version: count,
});

const effect = object<RepairEffect>({
  sourceId: uuid,
  beforeEligible: nullable(bool),
  afterEligible: bool,
  beforeEffective: oneOf("active", "denied"),
  afterEffective: oneOf("active", "denied"),
  recipeIds: array(uuid),
  notification: oneOf("none", "purchase_confirmation"),
});

const proposal = object<RepairProposal>({
  id: uuid,
  orderId: uuid,
  userId: uuid,
  ownerPrincipal: uuid,
  binding,
  kind: oneOf("reconcile_order", "rebuild_projection"),
  observationId: uuid,
  materialDigest: digest,
  expectedOrderVersion: count,
  dependencyToken: text(200),
  policyVersion: text(100),
  effects: array(effect, 50),
  blockers: array(code, 50),
  digest,
  expiresAt: timestamp,
  reason: text(1000),
});

const receipt = object<RepairReceipt>({
  operationId: uuid,
  orderId: uuid,
  state: oneOf("applied", "already_satisfied"),
  effects: array(effect, 50),
  auditId: uuid,
  committedAt: timestamp,
  proposalId: uuid,
  verification: oneOf("pending", "verified", "unavailable"),
});

const pending = object<OperationPending>({
  operationId: uuid,
  state: oneOf("checking", "blocked", "failed_no_commit", "outcome_unknown"),
  reasonCode: nullable(code),
});

export function decodeProposal(input: unknown): RepairProposal {
  return proposal(input, "proposal");
}

/** A committed receipt or a not-yet-committed state; a state name never stands in for a receipt. */
export function decodeOperation(input: unknown): OperationStatus {
  const state = (input as { state?: unknown } | null)?.state;
  return state === "applied" || state === "already_satisfied" ? receipt(input, "operation") : pending(input, "operation");
}
