import { createHash } from "node:crypto";
import type { DisputeFact, FinancialFacts, RefundFact } from "../../payments/reconciliation/contracts";

/**
 * Canonical JSON for support material: object keys sorted by UTF-16 code unit, no whitespace, arrays kept in
 * order. Only plain objects, arrays, strings, finite numbers, booleans and null are accepted. The database computes
 * its own authoritative digest; this one previews and compares the same contract.
 */
export function canonicalSupport(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite number in support material");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalSupport).join(",")}]`;
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalSupport(record[key])}`).join(",")}}`;
  }
  throw new Error("Unsupported value in support material");
}

/** Provider sets have no meaningful order: sort by identity, collapse exact repeats, refuse conflicting repeats. */
function bySortedIdentity<T extends RefundFact | DisputeFact>(items: T[], kind: string): T[] {
  const seen = new Map<string, string>();
  const out: T[] = [];
  for (const item of items) {
    const canonical = canonicalSupport(item);
    const previous = seen.get(item.id);
    if (previous === undefined) {
      seen.set(item.id, canonical);
      out.push(item);
    } else if (previous !== canonical) {
      throw new Error(`Conflicting ${kind} identity ${item.id}`);
    }
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * SHA-256 over the canonical material facts. Occurrence times, amounts and statuses are material; observation ids,
 * job fences and verification times are not part of FinancialFacts and so never change the digest.
 */
export function materialFactsDigest(facts: FinancialFacts): string {
  const material = { ...facts, refunds: bySortedIdentity(facts.refunds, "refund"),
    disputes: bySortedIdentity(facts.disputes, "dispute") };
  return createHash("sha256").update(canonicalSupport(material)).digest("hex");
}
