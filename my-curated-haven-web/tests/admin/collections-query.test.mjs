import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCollectionQuery,
  serializeCollectionQuery,
} from "../../src/lib/admin/collections/query.ts";

test("encoded filters and pagination round-trip through the URL", () => {
  const parsed = parseCollectionQuery(
    new URLSearchParams("q=100%25%20pur%C3%A9e&shelf=mornings,nourish&status=published&draft=true&attention=1&page=3"),
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.value, {
    q: "100% purée",
    shelf: ["mornings", "nourish"],
    stage: [],
    status: ["published"],
    draft: true,
    attention: true,
    page: 3,
    pageSize: 25,
  });
  const again = parseCollectionQuery(serializeCollectionQuery(parsed.value));
  assert.deepEqual(again, parsed);
});

test("defaults are an unfiltered first page", () => {
  const parsed = parseCollectionQuery(new URLSearchParams(""));
  assert.deepEqual(parsed, {
    ok: true,
    value: { q: "", shelf: [], stage: [], status: [], draft: null, attention: false, page: 1, pageSize: 25 },
  });
  assert.equal(serializeCollectionQuery(parsed.value).toString(), "");
});

test("unknown filters and bad pages are rejected, not silently widened", () => {
  for (const raw of ["shelf=attic", "status=live", "draft=maybe", "page=0", "page=1.5", "stage=adult"]) {
    const parsed = parseCollectionQuery(new URLSearchParams(raw));
    assert.equal(parsed.ok, false, raw);
    if (!parsed.ok) assert.equal(parsed.code, "INVALID");
  }
});

test("search text is bounded", () => {
  const parsed = parseCollectionQuery(new URLSearchParams({ q: "x".repeat(500) }));
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.value.q.length, 200);
});

test("empty form fields mean no filter", () => {
  const parsed = parseCollectionQuery(new URLSearchParams("q=&shelf=&stage=&status=&draft="));
  assert.deepEqual(parsed, {
    ok: true,
    value: { q: "", shelf: [], stage: [], status: [], draft: null, attention: false, page: 1, pageSize: 25 },
  });
});

test("back links only return to the collection list", async () => {
  const { safeCollectionReturn } = await import("../../src/lib/admin/collections/query.ts");
  assert.equal(safeCollectionReturn("/admin/collections?shelf=mornings&page=2"), "/admin/collections?shelf=mornings&page=2");
  for (const bad of [null, "", "//evil.test/admin/collections", "https://evil.test/admin/collections",
    "/admin/recipes", "/admin/collectionsx", "/admin/collections/../team", "javascript:alert(1)"]) {
    assert.equal(safeCollectionReturn(bad), "/admin/collections", String(bad));
  }
});
