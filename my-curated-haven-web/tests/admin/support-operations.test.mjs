import test from "node:test";
import assert from "node:assert/strict";
import { decodeSupportMetrics } from "../../src/lib/admin/support/decode.ts";

const metrics = (over = {}) => ({ mode: "test", pendingChecks: 1, oldestPendingCheckSeconds: 600,
  webhookEvents: { pending: 0, failed: 2, setAside: 1 }, unresolvedMismatches: 1, blockedRepairReasons: { no_change: 3, policy_missing: 1 },
  repairs: { applied: 4, alreadySatisfied: 1, failedWithoutCommit: 0 }, postchecks: { verified: 4, pending: 1 }, ...over });

test("support metrics decode as counts only", () => {
  assert.deepEqual(decodeSupportMetrics(metrics()), metrics());
});

test("metrics carrying anything but counts are refused", () => {
  assert.throws(() => decodeSupportMetrics(metrics({ lastEmail: "buyer@example.com" })));
  assert.throws(() => decodeSupportMetrics(metrics({ blockedRepairReasons: { "buyer@example.com": 1 } })));
  assert.throws(() => decodeSupportMetrics(metrics({ pendingChecks: -1 })));
  assert.throws(() => decodeSupportMetrics(metrics({ mode: "all" })));
  assert.throws(() => decodeSupportMetrics(metrics({ repairs: { applied: 1, alreadySatisfied: 0, failedWithoutCommit: 0, orderIds: [] } })));
});
