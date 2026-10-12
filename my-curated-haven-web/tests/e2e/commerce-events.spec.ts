import { expect, test, type APIRequestContext } from "@playwright/test";
import crypto from "node:crypto";
import { createSupportFixture, type SupportFixture } from "./support-admin-fixtures";

// Webhook deliveries as unsigned local fixtures (Stripe is not configured locally). Provider checks read the local
// payment records (SUPPORT_PROVIDER_FIXTURE=local-ledger), so a row inserted here stands in for Stripe's current state.
test.describe.configure({ mode: "serial" });

async function deliver(request: APIRequestContext, event: Record<string, unknown>) {
  return request.post("/api/stripe/webhook", { data: event });
}

function refundEvent(fixture: SupportFixture, id: string, refundId: string, amount: number) {
  return { id, type: "refund.updated", livemode: false, data: { object: { id: refundId, object: "refund",
    payment_intent: fixture.paymentIntentId, amount, currency: "usd", status: "succeeded" } } };
}

async function sourceState(fixture: SupportFixture) {
  const { rows } = await fixture.query(`SELECT s.is_eligible, s.ineligibility_reason,
      private.collection_has_access($2, $3) AS has_access
    FROM private.access_sources s WHERE s.source_kind = 'stripe_purchase' AND s.source_id = $1`,
  [fixture.orderId, fixture.customerId, fixture.collectionId]);
  return rows[0];
}

async function inbox(fixture: SupportFixture, eventId: string) {
  const { rows } = await fixture.query(`SELECT processing_state, failure_code, receipt->'reconciliation'->>'state' AS state
    FROM private.payment_events WHERE event_id = $1`, [eventId]);
  return rows;
}

test("a refund delivered by webhook is applied from a fresh check, once, and an old success cannot undo it", async ({ request }) => {
  const fixture = await createSupportFixture("support_operator", "inspection", { verifier: true, policyVersion: "e2e-events" });
  const rand = crypto.randomBytes(4).toString("hex");
  try {
    // Stripe now reports the rest of the payment refunded.
    await fixture.query(`INSERT INTO private.payment_refunds(provider_refund_id, order_id, payment_id, amount, currency, status, occurred_at)
      VALUES ($1, $2, $3, 1400, 'usd', 'succeeded', now())`, [`re_e2e_${rand}`, fixture.orderId, fixture.paymentId]);
    const event = refundEvent(fixture, `evt_e2e_refund_${rand}`, `re_e2e_${rand}`, 1400);
    expect((await deliver(request, event)).status()).toBe(200);
    expect(await inbox(fixture, event.id)).toEqual([{ processing_state: "completed", failure_code: null, state: "applied" }]);
    expect(await sourceState(fixture)).toEqual({ is_eligible: false, ineligibility_reason: "fully_refunded", has_access: false });

    // The same delivery again is answered from the inbox; no new provider check runs.
    const checks = async () => (await fixture.query("SELECT count(*)::int AS n FROM private.commerce_verification_jobs WHERE order_id = $1",
      [fixture.orderId])).rows[0].n;
    const before = await checks();
    expect((await deliver(request, event)).status()).toBe(200);
    expect(await checks()).toBe(before);
    expect(await inbox(fixture, event.id)).toHaveLength(1);

    // An old "checkout completed" arriving now is judged from Stripe's current state, not from its own body.
    const { rows } = await fixture.query("SELECT session_id FROM private.purchase_orders WHERE id = $1", [fixture.orderId]);
    const replay = { id: `evt_e2e_paid_${rand}`, type: "checkout.session.completed", livemode: false, data: { object: {
      id: rows[0].session_id, object: "checkout.session", client_reference_id: fixture.orderId, payment_status: "paid",
      payment_intent: fixture.paymentIntentId, amount_total: 1500, currency: "usd" } } };
    expect((await deliver(request, replay)).status()).toBe(200);
    expect(await inbox(fixture, replay.id)).toEqual([{ processing_state: "completed", failure_code: null, state: "already_satisfied" }]);
    expect(await sourceState(fixture)).toEqual({ is_eligible: false, ineligibility_reason: "fully_refunded", has_access: false });
  } finally {
    await fixture.query("DELETE FROM private.payment_refunds WHERE provider_refund_id = $1", [`re_e2e_${rand}`]);
    await fixture.dispose();
  }
});

test("without an approved policy the guarded older path still handles the delivery", async ({ request }) => {
  const fixture = await createSupportFixture("support_operator", "inspection", { verifier: true });
  const rand = crypto.randomBytes(4).toString("hex");
  try {
    const event = refundEvent(fixture, `evt_e2e_legacy_${rand}`, `re_e2e_legacy_${rand}`, 1400);
    expect((await deliver(request, event)).status()).toBe(200);
    expect(await inbox(fixture, event.id)).toEqual([{ processing_state: "completed", failure_code: "LEGACY", state: null }]);
    expect(await sourceState(fixture)).toEqual({ is_eligible: false, ineligibility_reason: "fully_refunded", has_access: false });
  } finally {
    await fixture.query("DELETE FROM private.payment_refunds WHERE provider_refund_id = $1", [`re_e2e_legacy_${rand}`]);
    await fixture.dispose();
  }
});

test("an event for a payment we do not know is kept for retry, not dropped", async ({ request }) => {
  const fixture = await createSupportFixture("support_operator", "inspection", { verifier: true });
  const rand = crypto.randomBytes(4).toString("hex");
  const eventId = `evt_e2e_unknown_${rand}`;
  try {
    const response = await deliver(request, { id: eventId, type: "refund.updated", livemode: false, data: { object: {
      id: `re_unknown_${rand}`, payment_intent: `pi_unknown_${rand}`, amount: 100, currency: "usd", status: "succeeded" } } });
    expect(response.status()).toBe(500);
    expect(await inbox(fixture, eventId)).toEqual([{ processing_state: "failed", failure_code: "ORDER_UNKNOWN", state: null }]);
  } finally {
    await fixture.query("DELETE FROM private.payment_events WHERE event_id = $1", [eventId]);
    await fixture.dispose();
  }
});
