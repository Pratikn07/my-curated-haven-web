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
