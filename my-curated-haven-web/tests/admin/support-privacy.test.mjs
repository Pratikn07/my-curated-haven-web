import test from "node:test";
import assert from "node:assert/strict";
import { safeSupportLog } from "../../src/lib/admin/support/logging.ts";
import { ORDER } from "../fixtures/support.mjs";

test("operational logs retain no customer/provider bodies",()=>{
  assert.deepEqual(safeSupportLog({operationId:ORDER,code:"PROVIDER_UNAVAILABLE",
    email:"buyer@example.com",note:"private",raw:{secret:"hidden"},url:"https://checkout.stripe.com/x"}),
    {operationId:ORDER,code:"PROVIDER_UNAVAILABLE"});
});

test("even allowed fields are dropped when they could carry free text", () => {
  assert.deepEqual(safeSupportLog({ operationId: ORDER, code: "buyer@example.com", reference: "a b", state: "applied" }),
    { operationId: ORDER, state: "applied" });
  assert.deepEqual(safeSupportLog({ code: "x".repeat(121) }), {});
  assert.deepEqual(safeSupportLog({ code: 42 }), {});
});
