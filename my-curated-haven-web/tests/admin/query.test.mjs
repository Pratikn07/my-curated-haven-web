import test from "node:test";
import assert from "node:assert/strict";
import { parseLibraryQuery, safeAdminReturn } from "../../src/lib/admin/query.ts";
import { adminRpc } from "../../src/lib/admin/rpc.ts";

test("invalid page and unsafe return destination cannot reach a query or redirect", () => {
  assert.equal(parseLibraryQuery(new URLSearchParams("page=-1")).ok, false);
  assert.equal(safeAdminReturn("//attacker.test/admin"), "/admin/recipes");
  assert.equal(safeAdminReturn("/admin/recipes?page=2"), "/admin/recipes?page=2");
});

test("backend failure is unavailable, never an empty successful library", async () => {
  const result = await adminRpc(async () => ({ data: null, error: { code: "08006" } }), (x) => x);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "UNAVAILABLE");
});

test("valid query keeps literal search and bounded filters", () => {
  const parsed = parseLibraryQuery(
    new URLSearchParams("q=100%25%20soup&view=published&page=2&publication=published&review=approved"),
  );
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.q, "100% soup");
    assert.equal(parsed.value.page, 2);
    assert.equal(parsed.value.pageSize, 25);
    assert.deepEqual(parsed.value.publication, ["published"]);
  }
});

test("unknown view and collection shapes are invalid", () => {
  assert.equal(parseLibraryQuery(new URLSearchParams("view=nope")).ok, false);
  assert.equal(parseLibraryQuery(new URLSearchParams("collections=../etc")).ok, false);
  assert.equal(safeAdminReturn("/administrator"), "/admin/recipes");
  assert.equal(safeAdminReturn("https://evil.test/admin/recipes"), "/admin/recipes");
});
