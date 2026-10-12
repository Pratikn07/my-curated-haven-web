import Stripe from "stripe";
import { consumeLocalFault } from "../admin/support/test-faults";
import type { RefundIntent, RefundSubmissionResult } from "../admin/support/refunds/contracts";
import { boundRefundFact, recoveredRefund, refundErrorResult } from "./refund-outcomes";
import { findLocalLedgerRefund, recordLocalLedgerRefund } from "./reconciliation/repository";
import { localLedgerReaderAllowed } from "./reconciliation/verifier-config";
import { STRIPE_API_VERSION } from "./stripe";

/**
 * Server-side refund writer. It sends exactly the frozen request (charge, amount, reason and the operation as
 * metadata) with the stored idempotency key, through a client built from STRIPE_REFUND_SECRET_KEY with no automatic
 * retries and a ten-second timeout. Checks that fail before the request is sent report "not executed"; anything after
 * it is sent that is not a clear answer is "unknown". Recovery only reads. Local test stacks use the payment records.
 */

export type RefundWriter = {
  /** `notAfterMs` is the end of the dispatch claim: once it has passed, nothing is sent. */
  submit(intent: RefundIntent, notAfterMs: number): Promise<RefundSubmissionResult>;
  recover(intent: RefundIntent): Promise<RefundSubmissionResult>;
};

function keyFor(mode: "test" | "live"): string | null {
  const key = process.env.STRIPE_REFUND_SECRET_KEY?.trim();
  if (!key) return null;
  return new RegExp(`^(rk|sk)_${mode}_`).test(key) ? key : null;
}

function localWriter(): RefundWriter {
  return {
    async submit(intent, notAfterMs) {
      if (Date.now() >= notAfterMs) return { kind: "not_executed", code: "CLAIM_EXPIRED" };
      if (consumeLocalFault("refund-rejected")) return { kind: "not_executed", code: "AMOUNT_TOO_LARGE" };
      const fact = await recordLocalLedgerRefund(intent);
      // A refund the provider made whose answer never came back.
      if (consumeLocalFault("refund-timeout-after-acceptance")) return { kind: "unknown", code: "PROVIDER_OUTCOME_UNKNOWN" };
      return { kind: "known", fact };
    },
    async recover(intent) {
      const fact = await findLocalLedgerRefund(intent);
      return fact ? { kind: "known", fact } : { kind: "unknown", code: "NOT_VISIBLE" };
    },
  };
}

function stripeWriter(mode: "test" | "live"): RefundWriter {
  const key = keyFor(mode);
  const client = key ? new Stripe(key, { apiVersion: STRIPE_API_VERSION, maxNetworkRetries: 0, timeout: 10_000 }) : null;
  return {
    async submit(intent, notAfterMs) {
      if (Date.now() >= notAfterMs) return { kind: "not_executed", code: "CLAIM_EXPIRED" };
      if (!client) return { kind: "not_executed", code: "REFUND_KEY_MISSING" };
      let accountId: string;
      try {
        accountId = (await client.accounts.retrieveCurrent()).id;
      } catch {
        return { kind: "not_executed", code: "ACCOUNT_CHECK_FAILED" };
      }
      if (accountId !== intent.accountId) return { kind: "not_executed", code: "ACCOUNT_MISMATCH" };
      // The account check can take seconds: never start the request after the claim has ended.
      if (Date.now() >= notAfterMs) return { kind: "not_executed", code: "CLAIM_EXPIRED" };
      let refund: Stripe.Refund;
      try {
        refund = await client.refunds.create({ charge: intent.chargeId, amount: intent.amountMinor, reason: intent.providerReason,
          metadata: { support_refund_operation: intent.command.operationId } }, { idempotencyKey: intent.providerKey });
      } catch (error) {
        return refundErrorResult(error);
      }
      const fact = boundRefundFact(intent, refund as unknown as Parameters<typeof boundRefundFact>[1]);
      return fact ? { kind: "known", fact } : { kind: "unknown", code: "RESPONSE_MISMATCH" };
    },
    async recover(intent) {
      if (!client) return { kind: "unknown", code: "REFUND_KEY_MISSING" };
      try {
        const refunds: Parameters<typeof recoveredRefund>[1] = [];
        let startingAfter: string | undefined;
        for (let page = 0; page < 10; page += 1) {
          const list = await client.refunds.list({ charge: intent.chargeId, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
          refunds.push(...(list.data as unknown as Parameters<typeof recoveredRefund>[1]));
          if (!list.has_more || list.data.length === 0) {
            const fact = recoveredRefund(intent, refunds);
            return fact ? { kind: "known", fact } : { kind: "unknown", code: "NOT_VISIBLE" };
          }
          startingAfter = list.data[list.data.length - 1].id;
        }
        return { kind: "unknown", code: "LIST_INCOMPLETE" };
      } catch {
        return { kind: "unknown", code: "PROVIDER_UNAVAILABLE" };
      }
    },
  };
}

export function createRefundWriter(binding: { mode: "test" | "live" }): RefundWriter {
  return localLedgerReaderAllowed(binding) ? localWriter() : stripeWriter(binding.mode);
}
