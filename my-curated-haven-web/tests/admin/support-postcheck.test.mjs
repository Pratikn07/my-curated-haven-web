import test from "node:test";
import assert from "node:assert/strict";
import { settleSupportPostcheck } from "../../src/lib/admin/support/postcheck.ts";
import { proposal as fixtureProposal, ORDER } from "../fixtures/support.mjs";

export function fixtureReceipt(){const proposal=fixtureProposal();return {
  operationId:"f3000000-0000-4000-8000-000000000040",orderId:ORDER,proposalId:proposal.id,
  state:"applied",effects:proposal.effects,auditId:"f3000000-0000-4000-8000-000000000042",
  committedAt:"2026-10-07T10:01:00Z",verification:"pending"};}

test("post-check failure preserves the committed receipt",async()=>{
  const receipt=fixtureReceipt();
  const result=await settleSupportPostcheck(receipt,async()=>{throw new Error("read outage");});
  assert.equal(result.state,"applied"); assert.equal(result.verification,"unavailable");
  assert.equal(result.operationId,receipt.operationId);
});

test("a matching check verifies; a mismatch stays pending without changing the receipt", async () => {
  const receipt = fixtureReceipt();
  assert.deepEqual(await settleSupportPostcheck(receipt, async () => true), { ...receipt, verification: "verified" });
  assert.deepEqual(await settleSupportPostcheck(receipt, async () => false), { ...receipt, verification: "pending" });
  assert.equal(receipt.verification, "pending");
});
