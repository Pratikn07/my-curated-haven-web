import type Stripe from "stripe";
import { getStripeClient } from "../stripe";
import type { Binding, DisputeFact, RefundFact } from "./contracts";
import { classifyDispute, ProviderBindingError, type CheckoutFacts, type ProviderReader } from "./provider-read";

/**
 * Read-only Stripe access for one order. The account is the one the server's key belongs to (retrieved, never taken
 * from the order or the browser); the checkout session must name this order as its client reference; refunds are
 * listed by the session's payment and disputes by its charge. Nothing here creates, changes or refunds anything.
 */

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();
const idOf = (value: string | { id: string } | null | undefined) => (typeof value === "string" ? value : value?.id ?? null);

function paymentState(session: Stripe.Checkout.Session, intent: Stripe.PaymentIntent | null, charge: Stripe.Charge | null):
  CheckoutFacts["paymentState"] {
  if (session.payment_status === "paid" && charge?.status === "succeeded" && charge.captured) return "paid";
  if (intent?.status === "processing") return "processing";
  if (intent?.status === "canceled" || charge?.status === "failed") return "failed";
  if (session.payment_status === "unpaid" && (session.status === "open" || session.status === "expired")) return "unpaid";
  return "unknown";
}

export function createStripeReader(binding: Binding, client: Stripe = getStripeClient()): ProviderReader {
  let paymentIntentId: string | null = null;
  let chargeId: string | null = null;

  return {
    async readCheckout(b) {
      if (b.sessionId === null) throw new ProviderBindingError("session_missing");
      const [account, session] = await Promise.all([
        client.accounts.retrieve(),
        client.checkout.sessions.retrieve(b.sessionId, { expand: ["payment_intent.latest_charge"] }),
      ]);
      if (session.client_reference_id !== b.orderId) throw new ProviderBindingError("session_order_mismatch");
      const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
      const charge = intent && typeof intent.latest_charge === "object" ? intent.latest_charge : null;
      paymentIntentId = idOf(session.payment_intent);
      chargeId = idOf(intent?.latest_charge);
      return {
        accountId: account.id,
        mode: session.livemode ? "live" : "test",
        sessionId: session.id,
        paymentIntentId,
        chargeId,
        capturedMinor: charge ? charge.amount_captured : null,
        currency: charge?.currency ?? session.currency ?? null,
        paymentState: paymentState(session, intent, charge),
        paidAt: charge && charge.status === "succeeded" ? iso(charge.created) : null,
      };
    },

    async readRefundPage(_b, cursor) {
      if (paymentIntentId === null) throw new ProviderBindingError("payment_incomplete");
      const page = await client.refunds.list({ payment_intent: paymentIntentId, limit: 100,
        ...(cursor ? { starting_after: cursor } : {}) });
      const items: RefundFact[] = page.data.map((r) => ({ id: r.id, paymentIntentId: idOf(r.payment_intent) ?? "",
        chargeId: idOf(r.charge) ?? "", amountMinor: r.amount, currency: r.currency,
        status: (r.status ?? "unknown") as RefundFact["status"], occurredAt: iso(r.created) }));
      return { items, next: page.has_more && items.length > 0 ? items[items.length - 1].id : null };
    },

    async readDisputePage(_b, cursor) {
      if (chargeId === null) throw new ProviderBindingError("payment_incomplete");
      const page = await client.disputes.list({ charge: chargeId, limit: 100, ...(cursor ? { starting_after: cursor } : {}) });
      const items: DisputeFact[] = page.data.map((d) => ({ id: d.id, paymentIntentId: idOf(d.payment_intent) ?? "",
        chargeId: idOf(d.charge) ?? "", amountMinor: d.amount, currency: d.currency, status: d.status,
        classification: classifyDispute(d.status),
        deadline: d.evidence_details?.due_by ? iso(d.evidence_details.due_by) : null }));
      return { items, next: page.has_more && items.length > 0 ? items[items.length - 1].id : null };
    },
  };
}
