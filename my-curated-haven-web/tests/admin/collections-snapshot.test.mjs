import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalCollection,
  diffCollection,
  validateCollection,
} from "../../src/lib/admin/collections/snapshot.ts";

const ID = "93000000-0000-0000-0000-000000000001";
const recipe = (n) => `93000000-0000-0000-0000-0000000001${String(n).padStart(2, "0")}`;
const member = (n) => ({
  recipeId: recipe(n),
  recipeSlug: `recipe-${n}`,
  contentVersion: 1,
  reviewDigest: "a".repeat(64),
  tagsDigest: "b".repeat(64),
  placementNote: "",
  fit: "accepted",
});
const snapshot = (members = [member(1), member(2)]) => ({
  collectionId: ID,
  slug: "first-foods",
  title: "Purée & café",
  tagline: "Soft starts",
  story: "Gentle first tastes.",
  forWhen: "Starting solids",
  refresh: "New recipes each season",
  shelf: "mornings",
  sortOrder: 1,
  stage: { min: 6, max: 12 },
  series: null,
  listingState: "unlisted",
  availability: "coming-soon",
  cloth: "sage",
  cover: null,
  members,
});

test("JSON keys are unordered but collection members are ordered", () => {
  const left = { title: "Purée & café", cover: null, members: [{ recipeId: "a" }, { recipeId: "b" }] };
  const same = { members: left.members, cover: null, title: left.title };
  assert.equal(canonicalCollection(left), canonicalCollection(same));
  assert.notEqual(
    canonicalCollection(left),
    canonicalCollection({ ...left, members: [...left.members].reverse() }),
  );
});

test("explicit null and Unicode text survive canonical form", () => {
  const value = snapshot();
  const text = canonicalCollection(value);
  assert.match(text, /"cover":null/);
  assert.match(text, /Purée & café/);
  assert.deepEqual(JSON.parse(text), JSON.parse(canonicalCollection(JSON.parse(text))));
});

test("diff reports changed fields and member order, nothing for reordered keys", () => {
  const before = snapshot();
  const reordered = Object.fromEntries(Object.entries(before).reverse());
  assert.deepEqual(diffCollection(before, reordered), []);
  const after = { ...before, title: "First foods", members: [member(2), member(1)] };
  const fields = diffCollection(before, after).map((d) => d.field);
  assert.ok(fields.includes("title"));
  assert.ok(fields.includes("members"));
});

test("empty and 25-member collections are valid; there is no recipe-count limit", () => {
  assert.deepEqual(blockers(snapshot([])), []);
  const many = Array.from({ length: 25 }, (_, i) => member(i + 1));
  assert.deepEqual(blockers(snapshot(many)), []);
});

test("duplicate recipes, bad slug, unknown shelf and bad cover are blockers", () => {
  const codes = (value) => blockers(value).map((c) => c.code);
  assert.ok(codes(snapshot([member(1), member(1)])).includes("COLLECTION_DUPLICATE_MEMBER"));
  assert.ok(codes({ ...snapshot(), slug: "Bad Slug" }).includes("COLLECTION_SLUG_INVALID"));
  assert.ok(codes({ ...snapshot(), shelf: "attic" }).includes("COLLECTION_SHELF_UNKNOWN"));
  assert.ok(codes({ ...snapshot(), cloth: "gold" }).includes("COLLECTION_CLOTH_UNKNOWN"));
  assert.ok(codes({ ...snapshot(), stage: { min: 12, max: 6 } }).includes("COLLECTION_STAGE_INVALID"));
  assert.ok(codes({ ...snapshot(), sortOrder: Number.NaN }).includes("COLLECTION_SORT_INVALID"));
  assert.ok(
    codes({
      ...snapshot(),
      cover: { src: "/c.png", width: 0, height: 10, alt: "", assetDigest: "c".repeat(64) },
    }).includes("COLLECTION_COVER_INVALID"),
  );
  assert.ok(
    codes({ ...snapshot(), series: { key: "lunch", volume: 1 } }).includes("COLLECTION_SERIES_INVALID"),
  );
});

test("unresolved recipe fit is allowed in a draft but flagged for publication", () => {
  const checks = validateCollection(snapshot([{ ...member(1), fit: "unverified" }]));
  const fit = checks.find((c) => c.code === "COLLECTION_MEMBER_FIT");
  assert.ok(fit);
  assert.equal(fit.severity, "suggestion");
  assert.equal(fit.state, "unknown");
});

function blockers(value) {
  return validateCollection(value).filter((c) => c.severity === "blocker" && c.state === "fail");
}
