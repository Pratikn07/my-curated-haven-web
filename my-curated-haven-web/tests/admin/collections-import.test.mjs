import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { register } from "node:module";

register("../../scripts/ts-alias-hooks.mjs", import.meta.url);
const { mapCollectionImport, reconcileMemberIds } = await import("../../src/lib/collections/catalog-import.ts");
const { SHOWROOM_COLLECTIONS } = await import("../../src/config/collections.ts");
const TAGS = JSON.parse(readFileSync(new URL("../../../docs/implementation/recipe-collections/recipe-tags.json", import.meta.url), "utf8"));

const uuid = (seed) => {
  const h = createHash("sha256").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const DIGEST = "e".repeat(64);
const allSlugs = [...new Set(SHOWROOM_COLLECTIONS.flatMap((c) => c.recipes.map((r) => r.slug)))];
const coverDigests = Object.fromEntries(SHOWROOM_COLLECTIONS.filter((c) => c.cover)
  .map((c) => [`public${c.cover.src}`, DIGEST]));

function input(overrides = {}) {
  const inventory = {
    collections: [], recipes: allSlugs.map((slug) => ({ id: uuid(slug), slug, contentVersion: 1,
      reviewDigest: DIGEST, tagsDigest: null })),
    releases: [], offers: [], orders: [], sources: [], policies: [],
    ...overrides.inventory,
  };
  return { sourceSha: "abc123", sourceDigests: coverDigests, config: SHOWROOM_COLLECTIONS, tags: TAGS,
    ...overrides, inventory };
}

const codes = (report, slug) => report.discrepancies.filter((d) => d.collectionSlug === slug).map((d) => d.code);

test("membership mismatch requires review, never automatic union", () => {
  assert.deepEqual(reconcileMemberIds(["a", "b"], ["a", "c"]), { matches: false, configOnly: ["b"], databaseOnly: ["c"] });
  assert.deepEqual(reconcileMemberIds(["b", "a"], ["a", "b"]), { matches: true, configOnly: [], databaseOnly: [] });
});

test("all 20 configured collections become candidates with stable identities", () => {
  const report = mapCollectionImport(input());
  assert.equal(report.candidates.length, 20);
  assert.equal(new Set(report.candidates.map((c) => c.collectionId)).size, 20);
  assert.deepEqual(report.blockedCollectionIds, []);
  const again = mapCollectionImport(input());
  assert.deepEqual(again.candidates.map((c) => c.collectionId), report.candidates.map((c) => c.collectionId));
  assert.equal(again.sourceDigest, report.sourceDigest);
  const first = report.candidates.find((c) => c.slug === "first-breakfasts");
  assert.deepEqual(first.series, { key: "breakfast", volume: 1 });
  assert.equal(first.listingState, "listed");
  assert.equal(first.members.length, 3);
  assert.ok(first.members.every((m) => m.fit === "unverified"), "imported placement is evidence, not approval");
});

test("existing database identities are reused", () => {
  const id = "93000000-0000-0000-0000-000000000077";
  const report = mapCollectionImport(input({ inventory: { collections: [{ id, slug: "first-tastes" }] } }));
  assert.equal(report.candidates.find((c) => c.slug === "first-tastes").collectionId, id);
  assert.ok(codes(report, "first-breakfasts").includes("COLLECTION_IDENTITY_NEW"));
  assert.ok(!codes(report, "first-tastes").includes("COLLECTION_IDENTITY_NEW"));
});

test("an empty collection is a valid candidate with no count warning", () => {
  const report = mapCollectionImport(input());
  const empty = report.candidates.find((c) => c.slug === "fruit-gummies");
  assert.equal(empty.members.length, 0);
  assert.deepEqual(codes(report, "fruit-gummies").filter((c) => c !== "COLLECTION_IDENTITY_NEW"), []);
});

test("missing or unreviewed recipes block that collection only", () => {
  const recipes = allSlugs.filter((s) => s !== "spinach-and-feta-egg-muffins")
    .map((slug) => ({ id: uuid(slug), slug, contentVersion: 1,
      reviewDigest: slug === "asian-pear-rice-congee-pure" ? null : DIGEST, tagsDigest: null }));
  const report = mapCollectionImport(input({ inventory: { recipes } }));
  assert.ok(codes(report, "first-breakfasts").includes("RECIPE_MISSING"));
  assert.ok(codes(report, "first-breakfasts").includes("RECIPE_UNREVIEWED"));
  const blocked = report.candidates.filter((c) => report.blockedCollectionIds.includes(c.collectionId)).map((c) => c.slug);
  assert.ok(blocked.includes("first-breakfasts"));
  assert.ok(!blocked.includes("fruit-gummies"));
});

test("duplicate configured slugs block both entries", () => {
  const dup = { ...SHOWROOM_COLLECTIONS[1], slug: SHOWROOM_COLLECTIONS[0].slug };
  const report = mapCollectionImport(input({ config: [SHOWROOM_COLLECTIONS[0], dup] }));
  assert.ok(codes(report, SHOWROOM_COLLECTIONS[0].slug).includes("COLLECTION_DUPLICATE_SLUG"));
  assert.equal(report.blockedCollectionIds.length, 1);
});

test("a changed source produces a distinct report digest", () => {
  const before = mapCollectionImport(input());
  const changed = mapCollectionImport(input({ sourceSha: "def456" }));
  const edited = mapCollectionImport(input({ config: SHOWROOM_COLLECTIONS.map((c, i) =>
    i === 0 ? { ...c, tagline: `${c.tagline}!` } : c) }));
  assert.notEqual(before.sourceDigest, changed.sourceDigest);
  assert.notEqual(before.sourceDigest, edited.sourceDigest);
});

test("all tag categories, including ones the site does not filter on, are kept with placement evidence", () => {
  const report = mapCollectionImport(input());
  const tastes = report.candidates.find((c) => c.slug === "first-tastes");
  const member = tastes.members.find((m) => m.recipeSlug === "apple-prune-fiber-friendly-pure");
  assert.equal(member.placementNote, "Two-fruit smooth purée, from 6 m");
  const record = TAGS.recipes.find((r) => r.slug === "apple-prune-fiber-friendly-pure");
  const evidence = report.tagEvidence["apple-prune-fiber-friendly-pure"];
  assert.deepEqual(evidence.tags, record.tags, "texture and occasion survive");
  assert.equal(member.tagsDigest, evidence.digest);
});

test("purchased releases that differ from config block, and are never unioned", () => {
  const collectionId = "93000000-0000-0000-0000-000000000078";
  const releaseId = "93000000-0000-0000-0000-000000000088";
  const sold = [uuid("apple-prune-fiber-friendly-pure"), uuid("not-in-config")];
  const report = mapCollectionImport(input({ inventory: {
    collections: [{ id: collectionId, slug: "first-tastes" }],
    releases: [{ id: releaseId, collectionId, state: "published", members: sold, manifestChecksum: "x" }],
    orders: [{ id: "o1", releaseId, live: true, state: "closed", purchased: true, snapshotComplete: true }],
    sources: [{ releaseId, sourceKind: "stripe_purchase" }],
  } }));
  const mismatch = report.discrepancies.find((d) => d.code === "MEMBERSHIP_MISMATCH");
  assert.ok(mismatch);
  assert.deepEqual(mismatch.details.databaseOnly, [uuid("not-in-config")]);
  assert.ok(codes(report, "first-tastes").includes("ACCESS_POLICY_UNKNOWN"));
  assert.ok(report.blockedCollectionIds.includes(collectionId));
  const candidate = report.candidates.find((c) => c.slug === "first-tastes");
  assert.ok(!candidate.members.some((m) => m.recipeId === uuid("not-in-config")), "no union of sold and configured members");
});

test("incomplete order snapshots and malformed covers block", () => {
  const collectionId = "93000000-0000-0000-0000-000000000079";
  const releaseId = "93000000-0000-0000-0000-000000000089";
  const report = mapCollectionImport(input({
    sourceDigests: {},
    inventory: {
      collections: [{ id: collectionId, slug: "halloween" }],
      releases: [{ id: releaseId, collectionId, state: "published", members: [], manifestChecksum: null }],
      orders: [{ id: "o2", releaseId, live: true, state: "open", purchased: false, snapshotComplete: false }],
    },
  }));
  assert.ok(codes(report, "halloween").includes("ORDER_SNAPSHOT_INCOMPLETE"));
  assert.ok(codes(report, "halloween").includes("COVER_UNVERIFIED"));
});

test("the report carries no customer or order identifiers", () => {
  const report = mapCollectionImport(input({ inventory: {
    orders: [{ id: "order-secret-1", releaseId: "r", live: true, state: "closed", purchased: true, snapshotComplete: true }],
  } }));
  assert.ok(!JSON.stringify(report).includes("order-secret-1"));
});

test("display-only placeholder prices stay out of the snapshot and offers", () => {
  const report = mapCollectionImport(input());
  const hint = report.hints.find((h) => h.collectionSlug === "first-breakfasts");
  assert.equal(hint.placeholderPrice, "$7.99");
  assert.ok(!JSON.stringify(report.candidates).includes("$7.99"));
});
