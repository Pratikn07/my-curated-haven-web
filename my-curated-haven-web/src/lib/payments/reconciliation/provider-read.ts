import type { Binding, DisputeFact, FinancialFacts, RefundFact } from "./contracts";

/**
 * Reads one order's provider facts through an injected reader, with hard limits: 100 items a page, at most 20 pages
 * per list, a 20-second total budget, each call bounded by the time left, and a few retries for transient errors.
 * Anything short of a complete, bound read is reported as incomplete with named blockers; a failed or partial read
 * never looks like "paid with no refunds". This file has no runtime imports so Node tests can load it directly.
 */

export type CheckoutFacts = Omit<FinancialFacts, "refunds" | "disputes">;
export type Page<T> = { items: T[]; next: string | null };
export interface ProviderReader {
  readCheckout(binding: Binding): Promise<CheckoutFacts>;
  readRefundPage(binding: Binding, cursor: string | null): Promise<Page<RefundFact>>;
  readDisputePage(binding: Binding, cursor: string | null): Promise<Page<DisputeFact>>;
}
export type ProviderRead = { facts: FinancialFacts; complete: boolean; blockers: string[] };
export type ReadLimits = { maxPages: number; budgetMs: number; retries: number; now: () => number };

export const DEFAULT_LIMITS: ReadLimits = { maxPages: 20, budgetMs: 20_000, retries: 2, now: () => Date.now() };

const REFUND_STATUSES = new Set(["pending", "requires_action", "succeeded", "failed", "canceled"]);

/** Explicitly unknown facts for a bound order: nothing is assumed paid, captured or adjusted. */
export function unknownFinancialFacts(binding: Binding): FinancialFacts {
  return { accountId: binding.accountId, mode: binding.mode, sessionId: binding.sessionId, paymentIntentId: null, chargeId: null,
    capturedMinor: null, currency: null, paymentState: "unknown", paidAt: null, refunds: [], disputes: [] };
}

export class ProviderTimeout extends Error {}

/** The provider object exists but belongs to something else (another order, account or payment). */
export class ProviderBindingError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

/** True for errors worth one more try: rate limits, timeouts and provider-side failures. */
export function transient(error: unknown): boolean {
  if (error instanceof ProviderTimeout) return true;
  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  return status === 429 || (typeof status === "number" && status >= 500);
}

async function bounded<T>(call: () => Promise<T>, limits: ReadLimits, deadline: number): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    const remaining = deadline - limits.now();
    if (remaining <= 0) throw new ProviderTimeout("budget exhausted");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([call(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ProviderTimeout("call timed out")), remaining);
      })]);
    } catch (error) {
      if (attempt >= limits.retries || !transient(error)) throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

async function readList<T extends { id: string }>(read: (cursor: string | null) => Promise<Page<T>>, limits: ReadLimits,
  deadline: number): Promise<{ items: T[]; complete: boolean }> {
  const items: T[] = [];
  const cursors = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < limits.maxPages; page += 1) {
    let result: Page<T>;
    try {
      result = await bounded(() => read(cursor), limits, deadline);
    } catch {
      return { items, complete: false };
    }
    items.push(...result.items);
    if (result.next === null) return { items, complete: true };
    if (cursors.has(result.next)) return { items, complete: false };
    cursors.add(result.next);
    cursor = result.next;
  }
  return { items, complete: false };
}

/** Collapse exact repeats, keep the first of each id, and report whether any id appeared with different content. */
function dedupe<T extends { id: string }>(items: T[]): { items: T[]; conflict: boolean } {
  const seen = new Map<string, string>();
  const out: T[] = [];
  let conflict = false;
  for (const item of items) {
    const key = JSON.stringify(Object.entries(item).sort(([a], [b]) => (a < b ? -1 : 1)));
    const previous = seen.get(item.id);
    if (previous === undefined) { seen.set(item.id, key); out.push(item); } else if (previous !== key) conflict = true;
  }
  return { items: out, conflict };
}

export async function readProviderFacts(binding: Binding, reader: ProviderReader,
  limits: ReadLimits = DEFAULT_LIMITS): Promise<ProviderRead> {
  const deadline = limits.now() + limits.budgetMs;
  let checkout: CheckoutFacts;
  try {
    checkout = await bounded(() => reader.readCheckout(binding), limits, deadline);
  } catch (error) {
    const blocker = error instanceof ProviderBindingError ? error.code : "checkout_unavailable";
    return { facts: unknownFinancialFacts(binding), complete: false, blockers: [blocker] };
  }
  const blockers = new Set<string>();
  if (checkout.accountId !== binding.accountId) blockers.add("account_mismatch");
  if (checkout.mode !== binding.mode) blockers.add("mode_mismatch");
  if (binding.sessionId !== null && checkout.sessionId !== binding.sessionId) blockers.add("session_mismatch");
  if (checkout.paymentState === "paid" && (checkout.paymentIntentId === null || checkout.chargeId === null
    || checkout.capturedMinor === null || checkout.currency === null || checkout.paidAt === null)) blockers.add("payment_incomplete");

  // Refunds and disputes can only be listed for a known payment and charge.
  let refunds: RefundFact[] = [];
  let disputes: DisputeFact[] = [];
  if (checkout.paymentIntentId !== null && checkout.chargeId !== null) {
    const refundRead = await readList((cursor) => reader.readRefundPage(binding, cursor), limits, deadline);
    const disputeRead = await readList((cursor) => reader.readDisputePage(binding, cursor), limits, deadline);
    if (!refundRead.complete) blockers.add("refunds_incomplete");
    if (!disputeRead.complete) blockers.add("disputes_incomplete");
    const r = dedupe(refundRead.items);
    const d = dedupe(disputeRead.items);
    if (r.conflict) blockers.add("refund_conflict");
    if (d.conflict) blockers.add("dispute_conflict");
    for (const item of [...r.items, ...d.items]) {
      if (item.paymentIntentId !== checkout.paymentIntentId || item.chargeId !== checkout.chargeId) blockers.add("adjustment_binding_mismatch");
      if (item.currency !== checkout.currency) blockers.add("currency_mismatch");
    }
    if (r.items.some((item) => !REFUND_STATUSES.has(item.status))) blockers.add("refund_status_unknown");
    if (d.items.some((item) => item.classification === "unknown")) blockers.add("dispute_status_unknown");
    refunds = r.items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    disputes = d.items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  } else if (checkout.paymentState === "paid") {
    blockers.add("payment_incomplete");
  }
  const facts: FinancialFacts = { ...checkout, refunds, disputes };
  return { facts, complete: blockers.size === 0, blockers: [...blockers].sort() };
}

/** Stripe dispute statuses: warning_* are inquiries; the rest of the known set are formal disputes. */
export function classifyDispute(status: string): DisputeFact["classification"] {
  if (status.startsWith("warning_")) return "inquiry";
  return ["needs_response", "under_review", "won", "lost", "charge_refunded", "prevented"].includes(status) ? "formal" : "unknown";
}
