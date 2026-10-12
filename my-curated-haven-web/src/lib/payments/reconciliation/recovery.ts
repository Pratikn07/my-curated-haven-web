import type { Mode } from "./contracts";
import { processVerifiedCommerceEvent } from "./events";
import { orderPolicyReady, recoveryCandidates } from "./repository";
import { eventDependencies, verifyAndReconcileOrder } from "./service";

/**
 * Bounded, on-demand recovery for one mode: due webhook events and orders left unresolved for 15 minutes. A dry run
 * (the default) only counts. Applying re-checks each order with the provider under its approved policy; it never
 * scans Stripe, creates checkouts or uses the older processing (which needs the original delivery).
 */

export type RecoveryReport = {
  mode: Mode;
  dryRun: boolean;
  dueEvents: number;
  unboundEvents: number;
  staleOrders: number;
  events: Record<string, number>;
  orders: Record<string, number>;
};

function tally(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

export async function runRecovery(input: { mode: Mode; limit: number; apply: boolean }): Promise<RecoveryReport> {
  if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 100) throw new Error("limit must be 1 to 100");
  const candidates = await recoveryCandidates(input.mode, input.limit);
  const report: RecoveryReport = { mode: input.mode, dryRun: !input.apply, dueEvents: candidates.events.length,
    unboundEvents: candidates.unboundEvents, staleOrders: candidates.orders.length, events: {}, orders: {} };
  if (!input.apply) return report;
  const deps = eventDependencies(null);
  for (const inboxId of candidates.events) {
    tally(report.events, (await processVerifiedCommerceEvent(inboxId, deps)).state);
  }
  for (const orderId of candidates.orders) {
    if (!(await orderPolicyReady(orderId))) {
      tally(report.orders, "policy_missing");
      continue;
    }
    const result = await verifyAndReconcileOrder({ orderId, purpose: "recovery", operationId: crypto.randomUUID(), eventId: null });
    tally(report.orders, result.ok ? result.value.state : result.code.toLowerCase());
  }
  return report;
}
