import test from "node:test";
import assert from "node:assert/strict";
import { notificationEffect } from "../../src/lib/payments/reconciliation/side-effects.ts";

test("projection repair never sends a purchase confirmation",()=>{
  assert.equal(notificationEffect({kind:"projection",alreadyQueued:false,deliveryApproved:true}),"none");
});

test("the notification rule matches its SQL twin's truth table", () => {
  // Suite 79 checks private.commerce_notification_effect with the same five cases.
  const cases = [["diagnosis", false, true, "none"], ["projection", false, true, "none"], ["fulfilment", false, true, "purchase_confirmation"],
    ["fulfilment", true, true, "none"], ["fulfilment", false, false, "none"]];
  for (const [kind, alreadyQueued, deliveryApproved, expected] of cases) {
    assert.equal(notificationEffect({ kind, alreadyQueued, deliveryApproved }), expected, `${kind} ${alreadyQueued} ${deliveryApproved}`);
  }
});
