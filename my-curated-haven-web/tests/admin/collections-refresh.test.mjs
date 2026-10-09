import test from "node:test";
import assert from "node:assert/strict";
import { settleCollectionRefresh } from "../../src/lib/admin/collections/refresh-result.ts";

test("cache failure does not relabel a committed publication as failed", async () => {
  assert.deepEqual(await settleCollectionRefresh("operation-1", async () => { throw new Error("cache offline"); }),
    { operationId: "operation-1", state: "pending" });
});

test("a refresh that runs reports complete for the same operation", async () => {
  let ran = 0;
  assert.deepEqual(await settleCollectionRefresh("operation-2", async () => { ran += 1; }),
    { operationId: "operation-2", state: "complete" });
  assert.equal(ran, 1);
});
