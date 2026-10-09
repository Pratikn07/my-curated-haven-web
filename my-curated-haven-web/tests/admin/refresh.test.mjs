import test from "node:test";
import assert from "node:assert/strict";
import { settleCommittedRefresh } from "../../src/lib/admin/refresh-result.ts";

test("committed write remains saved when refresh fails", async () => {
  const result = await settleCommittedRefresh("operation-fixture", async () => {
    throw new Error("refresh unavailable");
  });
  assert.deepEqual(result, { operationId: "operation-fixture", state: "pending" });
});

test("successful refresh completes the receipt", async () => {
  let called = 0;
  const result = await settleCommittedRefresh("operation-fixture", async () => {
    called += 1;
  });
  assert.deepEqual(result, { operationId: "operation-fixture", state: "complete" });
  assert.equal(called, 1);
});
