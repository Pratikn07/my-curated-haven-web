import test from "node:test";
import assert from "node:assert/strict";
import { parseMinorAmount, refundOutcomeMessage } from "../../src/lib/admin/support/refunds/messages.ts";
import { refundReceipt } from "../fixtures/support.mjs";

test("unknown money outcome does not instruct the owner to issue another refund",()=>{
  assert.equal(refundOutcomeMessage(refundReceipt({state:"outcome_unknown"})),
    "Refund outcome unknown. Check this operation's status before taking further action.");
});

test("a successful provider refund and incomplete local reconciliation remain distinct",()=>{
  assert.equal(refundOutcomeMessage(refundReceipt({state:"submitted",providerRefundId:"re_support",
    providerStatus:"succeeded",reconciliation:"pending"})),
    "Stripe reports the refund succeeded. Local access reconciliation is pending.");
  assert.match(refundOutcomeMessage(refundReceipt({ state: "rejected", reasonCode: "AMOUNT_TOO_LARGE" })), /No money moved/);
  assert.match(refundOutcomeMessage(refundReceipt({ state: "reserved" })), /Nothing has been sent/);
});

test("typed amounts become exact minor units in the currency's own decimals", () => {
  assert.equal(parseMinorAmount("4.00", "usd"), 400);
  assert.equal(parseMinorAmount(" 4.5 ", "usd"), 450);
  assert.equal(parseMinorAmount("14", "usd"), 1400);
  assert.equal(parseMinorAmount("500", "jpy"), 500);
  for (const [text, currency] of [["4.005", "usd"], ["-4", "usd"], ["4,00", "usd"], ["0", "usd"], ["0.00", "usd"], ["", "usd"],
    ["1e3", "usd"], ["4.5", "jpy"], ["9999999999", "usd"]]) {
    assert.equal(parseMinorAmount(text, currency), null, `${text} ${currency}`);
  }
});
