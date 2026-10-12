import test from "node:test";
import assert from "node:assert/strict";
import { coordinateSupportRepair, repairMessage } from "../../src/lib/admin/support/execution.ts";
import { decodeExecutionStart } from "../../src/lib/admin/support/decode.ts";
import { DIGEST, OBSERVATION, OPERATION, PROPOSAL, receipt } from "../fixtures/support.mjs";

const JOB = "f3000000-0000-4000-8000-00000000000b";
const command = { operationId: OPERATION, proposalId: PROPOSAL, expectedDigest: DIGEST, caseId: null };
const checking = { operationId: OPERATION, state: "checking", reasonCode: null };
const ok = (value) => ({ ok: true, value });
const fail = (code) => ({ ok: false, code, reference: "test" });

function ports(over = {}) {
  const calls = [];
  return {
    calls,
    ports: {
      begin: async (c) => { calls.push(["begin", c.operationId]); return ok({ status: checking, jobId: JOB }); },
      verify: async (job) => { calls.push(["verify", job]); return { ok: true, observationId: OBSERVATION }; },
      commit: async (op, obs) => { calls.push(["commit", op, obs]); return ok(receipt()); },
      read: async (op) => { calls.push(["read", op]); return ok(receipt()); },
      ...over,
    },
  };
}

test("an approved repair is checked again, then committed with that check", async () => {
  const { ports: p, calls } = ports();
  assert.deepEqual(await coordinateSupportRepair(command, p), ok(receipt()));
  assert.deepEqual(calls, [["begin", OPERATION], ["verify", JOB], ["commit", OPERATION, OBSERVATION]]);
});

test("a repeated command returns the stored receipt without another check", async () => {
  const { ports: p, calls } = ports({ begin: async () => ok({ status: receipt(), jobId: JOB }) });
  assert.deepEqual(await coordinateSupportRepair(command, p), ok(receipt()));
  assert.equal(calls.length, 0);
});

test("a lost commit response is recovered by reading the receipt", async () => {
  const { ports: p, calls } = ports({ commit: async () => fail("UNAVAILABLE") });
  assert.deepEqual(await coordinateSupportRepair(command, p), ok(receipt()));
  assert.deepEqual(calls.at(-1), ["read", OPERATION]);
});

test("when the receipt cannot be read either, the outcome is unknown, never 'not committed'", async () => {
  const unreadable = ports({ commit: async () => fail("UNAVAILABLE"), read: async () => fail("UNAVAILABLE") });
  assert.deepEqual(await coordinateSupportRepair(command, unreadable.ports),
    ok({ operationId: OPERATION, state: "outcome_unknown", reasonCode: null }));
  const stillChecking = ports({ commit: async () => fail("UNAVAILABLE"), read: async () => ok(checking) });
  assert.equal((await coordinateSupportRepair(command, stillChecking.ports)).value.state, "outcome_unknown");
});

test("a change since approval blocks without committing", async () => {
  const { ports: p, calls } = ports({ commit: async () => fail("STALE") });
  assert.deepEqual(await coordinateSupportRepair(command, p), ok({ operationId: OPERATION, state: "blocked", reasonCode: "STALE" }));
  assert.equal(calls.some((c) => c[0] === "read"), false);
});

test("a check that fails reports the stored state; refusals to start are returned as they are", async () => {
  const failed = { operationId: OPERATION, state: "failed_no_commit", reasonCode: "ORDER_CHANGED" };
  const changed = ports({ verify: async () => ({ ok: false, code: "ORDER_CHANGED" }), read: async () => ok(failed) });
  assert.deepEqual(await coordinateSupportRepair(command, changed.ports), ok(failed));
  assert.equal(changed.calls.some((c) => c[0] === "commit"), false);
  const denied = ports({ begin: async () => fail("DENIED") });
  assert.deepEqual(await coordinateSupportRepair(command, denied.ports), fail("DENIED"));
});

test("messages never present an unknown or blocked outcome as applied", () => {
  assert.equal(repairMessage(receipt()).tone, "success");
  assert.match(repairMessage({ ...receipt(), verification: "verified" }).text, /access matches what was approved/);
  assert.doesNotMatch(repairMessage({ ...receipt(), verification: "verified" }).text, /Applied/, "the title already says Applied");
  assert.equal(repairMessage({ operationId: OPERATION, state: "outcome_unknown", reasonCode: null }).tone, "pending");
  assert.doesNotMatch(repairMessage({ operationId: OPERATION, state: "outcome_unknown", reasonCode: null }).text, /Applied/);
  assert.equal(repairMessage({ operationId: OPERATION, state: "blocked", reasonCode: "STALE" }).tone, "error");
  assert.match(repairMessage({ operationId: OPERATION, state: "failed_no_commit", reasonCode: "ORDER_CHANGED" }).text, /Not applied/);
});

test("starting an operation decodes exactly", () => {
  assert.deepEqual(decodeExecutionStart({ status: checking, jobId: JOB }), { status: checking, jobId: JOB });
  assert.throws(() => decodeExecutionStart({ status: checking, jobId: JOB, extra: 1 }));
  assert.throws(() => decodeExecutionStart({ status: { ...checking, state: "granted" }, jobId: JOB }));
});
