import test from "node:test";
import assert from "node:assert/strict";
import { safeSupportLog } from "../../src/lib/admin/support/redaction.ts";
import { OPERATION } from "../fixtures/support.mjs";

test("only the allowed, well-formed fields survive", () => {
  assert.deepEqual(safeSupportLog({ operationId: OPERATION, supportReference: "MCH-1A2B3C", code: "ADM_STALE" }),
    { operationId: OPERATION, supportReference: "MCH-1A2B3C", code: "ADM_STALE" });
});

test("emails, provider errors, URLs, notes and secrets never survive", () => {
  const leaked = safeSupportLog({
    operationId: "buyer@synthetic.test",
    supportReference: "https://dashboard.stripe.com/payments/pi_123",
    code: "sk_live_abcdef",
    email: "buyer@synthetic.test",
    note: "Customer says card ending 4242",
    error: { type: "StripeCardError", raw: { message: "Your card was declined" } },
    token: "eyJhbGciOiJIUzI1NiJ9.e30.x",
  });
  assert.deepEqual(leaked, {});
  assert.doesNotMatch(JSON.stringify(leaked), /@|https|sk_|4242|eyJ/);
});

test("non-objects and lowercase or oversized codes are dropped", () => {
  assert.deepEqual(safeSupportLog("buyer@synthetic.test"), {});
  assert.deepEqual(safeSupportLog(null), {});
  assert.deepEqual(safeSupportLog({ code: "not_upper" }), {});
  assert.deepEqual(safeSupportLog({ code: "A".repeat(65) }), {});
});
