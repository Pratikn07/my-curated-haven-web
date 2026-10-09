import test from "node:test";
import assert from "node:assert/strict";
import { runVerification } from "../../src/lib/payments/reconciliation/verifier.ts";
import { localLedgerReaderAllowed, verifierConnectionString } from "../../src/lib/payments/reconciliation/verifier-config.ts";
import { matrixBinding } from "../fixtures/eligibility-matrix.mjs";
import { paidFacts } from "../fixtures/support.mjs";

const JOB = "00000000-0000-4000-8000-0000000000a1";
const OBS = "00000000-0000-4000-8000-0000000000b1";
const sourced = () => ({ facts: paidFacts(), complete: true, blockers: [], apiVersion: "2025-02-24.acacia" });

function deps(over = {}) {
  const calls = [];
  return {
    calls,
    deps: {
      claim: async (job) => { calls.push(["claim", job]); return { state: "claimed", jobId: job, fence: 7, binding: matrixBinding() }; },
      read: async (binding) => { calls.push(["read", binding.orderId]); return sourced(); },
      record: async (job, fence, read) => { calls.push(["record", job, fence, read.apiVersion]); return { state: "complete", observationId: OBS }; },
      ...over,
    },
  };
}

test("claims, reads and records under the claimed fence", async () => {
  const { calls, deps: d } = deps();
  assert.deepEqual(await runVerification(JOB, d), { ok: true, observationId: OBS });
  assert.deepEqual(calls.map((c) => c[0]), ["claim", "read", "record"]);
  assert.deepEqual(calls[2], ["record", JOB, 7, "2025-02-24.acacia"]);
});

test("a job already complete returns its observation without reading the provider again", async () => {
  const { calls, deps: d } = deps({ claim: async () => ({ state: "complete", observationId: OBS }) });
  assert.deepEqual(await runVerification(JOB, d), { ok: true, observationId: OBS });
  assert.deepEqual(calls, []);
});

test("a live lease held elsewhere is a conflict, and nothing is read", async () => {
  const { calls, deps: d } = deps({ claim: async () => { throw new Error("ADM_CONFLICT"); } });
  assert.deepEqual(await runVerification(JOB, d), { ok: false, code: "ADM_CONFLICT" });
  assert.deepEqual(calls, []);
});

test("an unregistered verifier is refused at the claim", async () => {
  const { deps: d } = deps({ claim: async () => { throw new Error("permission denied: ADM_DENIED"); } });
  assert.deepEqual(await runVerification(JOB, d), { ok: false, code: "ADM_DENIED" });
});

test("a read that throws records nothing", async () => {
  const { calls, deps: d } = deps({ read: async () => { throw new Error("socket hang up"); } });
  assert.deepEqual(await runVerification(JOB, d), { ok: false, code: "READ_FAILED" });
  assert.equal(calls.some((c) => c[0] === "record"), false);
});

test("a stale fence and a changed order are reported, not retried", async () => {
  const stale = deps({ record: async () => { throw new Error("ADM_STALE"); } });
  assert.deepEqual(await runVerification(JOB, stale.deps), { ok: false, code: "ADM_STALE" });
  const changed = deps({ record: async () => ({ state: "failed", code: "ORDER_CHANGED" }) });
  assert.deepEqual(await runVerification(JOB, changed.deps), { ok: false, code: "ORDER_CHANGED" });
  const odd = deps({ record: async () => { throw new Error("connection terminated"); } });
  assert.deepEqual(await runVerification(JOB, odd.deps), { ok: false, code: "RECORD_FAILED" });
});

test("the verifier connection is required and never loopback when deployed", () => {
  const local = "postgresql://verifier:x@127.0.0.1:54362/postgres";
  const remote = "postgresql://verifier:x@db.example.supabase.co:6543/postgres";
  assert.equal(verifierConnectionString({}), null);
  assert.equal(verifierConnectionString({ SUPPORT_VERIFIER_DATABASE_URL: "  " }), null);
  assert.equal(verifierConnectionString({ SUPPORT_VERIFIER_DATABASE_URL: "https://example.com" }), null);
  assert.equal(verifierConnectionString({ SUPPORT_VERIFIER_DATABASE_URL: "not a url" }), null);
  assert.equal(verifierConnectionString({ SUPPORT_VERIFIER_DATABASE_URL: local }), local);
  assert.equal(verifierConnectionString({ SUPPORT_VERIFIER_DATABASE_URL: local, VERCEL_ENV: "production" }), null);
  assert.equal(verifierConnectionString({ SUPPORT_VERIFIER_DATABASE_URL: "postgresql://v:x@[::1]:5432/p", VERCEL_ENV: "preview" }), null);
  assert.equal(verifierConnectionString({ SUPPORT_VERIFIER_DATABASE_URL: remote, VERCEL_ENV: "production" }), remote);
});

test("the local-ledger fixture runs only when enabled, undeployed and for test-mode orders", () => {
  const on = { SUPPORT_PROVIDER_FIXTURE: "local-ledger" };
  assert.equal(localLedgerReaderAllowed({ mode: "test" }, on), true);
  assert.equal(localLedgerReaderAllowed({ mode: "live" }, on), false);
  assert.equal(localLedgerReaderAllowed({ mode: "test" }, { ...on, VERCEL_ENV: "preview" }), false);
  assert.equal(localLedgerReaderAllowed({ mode: "test" }, {}), false);
  assert.equal(localLedgerReaderAllowed({ mode: "test" }, { SUPPORT_PROVIDER_FIXTURE: "stripe" }), false);
});
