import test from "node:test";
import assert from "node:assert/strict";
import { parseLookup } from "../../src/lib/admin/support/query.ts";
import { decodeCustomerRead, decodeLookupRead, decodeOrderRead } from "../../src/lib/admin/support/decode.ts";
import { COLLECTION, DIGEST, ORDER, RELEASE, USER } from "../fixtures/support.mjs";

const AT = "2026-10-09T12:00:00.000+00:00";
const read = (value, complete = true) => ({ value, checkedAt: AT, complete, resolverVersion: null });

test("lookup keeps plus and dot identity semantics", () => {
  assert.equal(parseLookup({ kind: "email", value: "  first.last+buyer@example.com  " }).value,
    "first.last+buyer@example.com");
  assert.throws(() => parseLookup({ kind: "email", value: "buyer@example.com", approved_by: "attacker" }));
});

test("lookup reads decode found, not found and ambiguous, and nothing else", () => {
  assert.deepEqual(decodeLookupRead(read({ status: "found", target: { userId: null, orderId: ORDER, ownerPrincipal: USER } })).value,
    { status: "found", target: { userId: null, orderId: ORDER, ownerPrincipal: USER } });
  assert.equal(decodeLookupRead(read({ status: "ambiguous" })).value.status, "ambiguous");
  assert.throws(() => decodeLookupRead(read({ status: "found" })));
  assert.throws(() => decodeLookupRead(read({ status: "not_found", target: { userId: USER } })));
  assert.throws(() => decodeLookupRead({ value: { status: "not_found" } }));
});

function order(overrides = {}) {
  return {
    orderId: ORDER, userId: USER, ownerPrincipal: USER, collectionId: COLLECTION, binding: null,
    supportReference: "MCH-1A2B3C", historicalComplete: false,
    historical: { releaseId: RELEASE, manifestHash: DIGEST, refundPolicyVersion: null, accessPolicyVersion: null,
      expectedCapturedMinor: 1500, currency: "usd" },
    historicalTitle: null, currentTitle: "Synthetic support shelf", attemptState: "open", accountState: "active",
    paymentState: "unpaid", capturedMinor: null, currency: "usd", successfulRefundMinor: null,
    refunds: [{ amountMinor: 100, currency: "usd", status: "succeeded", occurredAt: AT, providerRefundId: null }],
    disputes: [{ amountMinor: 1500, currency: "usd", status: "warning_needs_response", classification: "inquiry",
      deadline: null, providerDisputeId: null }],
    providerVerifiedAt: null, access: null, history: { events: [], nextCursor: null },
    ...overrides,
  };
}

test("an order read keeps unknown original terms unknown", () => {
  const decoded = decodeOrderRead(read(order(), false));
  assert.equal(decoded.complete, false);
  assert.equal(decoded.value.historical.refundPolicyVersion, null);
  assert.equal(decoded.value.binding, null);
});

test("an order read with a wrong state, a fractional amount or an unexpected field is refused", () => {
  assert.throws(() => decodeOrderRead(read(order({ paymentState: "settled" }))));
  assert.throws(() => decodeOrderRead(read(order({ capturedMinor: 15.5 }))));
  assert.throws(() => decodeOrderRead(read(order({ email: "buyer@synthetic.test" }))));
  assert.throws(() => decodeOrderRead(read(order({ refunds: [{ ...order().refunds[0], status: "done" }] }))));
});

test("a customer read allows a closed account with no email and at most 25 orders", () => {
  const customer = { userId: USER, email: null, confirmed: false, available: false,
    orders: [{ orderId: ORDER, supportReference: "MCH-K9", mode: "test", collectionId: COLLECTION, historicalTitle: null }],
    cases: [], nextCursor: null };
  assert.equal(decodeCustomerRead(read(customer)).value.email, null);
  const many = Array.from({ length: 26 }, () => customer.orders[0]);
  assert.throws(() => decodeCustomerRead(read({ ...customer, orders: many })));
  assert.throws(() => decodeCustomerRead(read({ ...customer, orders: [{ ...customer.orders[0], mode: "prod" }] })));
});
