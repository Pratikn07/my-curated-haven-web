import test from "node:test";
import assert from "node:assert/strict";
import { diffSnapshots, mergePaths, patchSnapshot } from "../../src/lib/admin/snapshot.ts";

const SNAPSHOT = {
  recipeId: "91000000-0000-0000-0000-000000000001",
  slug: "snapshot-fixture",
  catalog: { title: "Before", publicSummary: "Summary", totalMinutes: 15, mealLabels: [], dietLabels: [] },
  body: {
    ingredients: [{ item: "Oats", amount: "1", unit: "cup", preparation: { soak: true } }],
    instructions: [{ step: 1, text: "Cook", legacyHint: "gentle heat" }],
    yield: "2 portions",
    yieldStructured: { portions: 2, legacy: { texture: "soft" } },
    reviewedNotes: null,
    allergenReviewState: "reviewed_listed",
    allergens: ["oats"],
    storageNotes: null,
  },
  image: { path: "", alt: null, description: null, objectId: null, objectVersion: null },
};

test("title edit preserves unsupported ingredient and yield properties", () => {
  const changed = patchSnapshot(SNAPSHOT, { catalog: { ...SNAPSHOT.catalog, title: "After" } });
  assert.deepEqual(changed.body, SNAPSHOT.body);
  assert.equal(changed.catalog.title, "After");
  assert.equal(SNAPSHOT.catalog.title, "Before");
});

test("recipeId and slug changes are rejected", () => {
  assert.throws(() => patchSnapshot(SNAPSHOT, { recipeId: "other" }), /read-only/);
  assert.throws(() => patchSnapshot(SNAPSHOT, { slug: "other" }), /read-only/);
});

test("diff reports only changed leaves", () => {
  const changed = patchSnapshot(SNAPSHOT, { catalog: { ...SNAPSHOT.catalog, title: "After" } });
  const diff = diffSnapshots(SNAPSHOT, changed);
  assert.deepEqual(diff, [{ field: "catalog.title", before: "Before", after: "After" }]);
  assert.deepEqual(diffSnapshots(SNAPSHOT, SNAPSHOT), []);
});

test("merge applies per-field choices without touching the rest", () => {
  const candidate = patchSnapshot(SNAPSHOT, { catalog: { ...SNAPSHOT.catalog, title: "After" } });
  const merged = mergePaths(SNAPSHOT, candidate, { "catalog.title": "candidate" });
  assert.equal(merged.catalog.title, "After");
  assert.deepEqual(merged.body, SNAPSHOT.body);
  const kept = mergePaths(SNAPSHOT, candidate, { "catalog.title": "stored" });
  assert.equal(kept.catalog.title, "Before");
});
