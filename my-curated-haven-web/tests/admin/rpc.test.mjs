import test from "node:test";
import assert from "node:assert/strict";
import { adminRpc, classifyAdminError } from "../../src/lib/admin/rpc.ts";

test("known ADM messages map to typed codes", () => {
  assert.equal(classifyAdminError({ code: "42501", message: "ADM_MFA_REQUIRED" }), "MFA_REQUIRED");
  assert.equal(classifyAdminError({ code: "42501", message: "ADM_DENIED" }), "DENIED");
  assert.equal(classifyAdminError({ code: "42501", message: "ADM_DISABLED" }), "DISABLED");
  assert.equal(classifyAdminError({ code: "42501", message: "something else" }), "DENIED");
  assert.equal(classifyAdminError({ code: "08006" }), "UNAVAILABLE");
  assert.equal(classifyAdminError(null), "UNAVAILABLE");
});

test("malformed successful payload is unavailable, not empty success", async () => {
  const result = await adminRpc(async () => ({ data: null, error: null }), () => {
    throw new Error("bad shape");
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "UNAVAILABLE");
});

test("transport throw is unavailable", async () => {
  const result = await adminRpc(
    async () => {
      throw new Error("network down");
    },
    (x) => x,
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "UNAVAILABLE");
});

test("transport throw retries then succeeds with the flag", async () => {
  let calls = 0;
  const result = await adminRpc(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error("truncated stream");
      return { data: { ok: true }, error: null };
    },
    (x) => x,
    true
  );
  assert.equal(result.ok, true);
  assert.equal(calls, 3);
});

test("persistent transport failure gives up as unavailable", async () => {
  let calls = 0;
  const result = await adminRpc(
    async () => {
      calls += 1;
      throw new Error("network down");
    },
    (x) => x,
    true
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "UNAVAILABLE");
  assert.equal(calls, 3);
});
