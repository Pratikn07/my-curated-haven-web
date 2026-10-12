import test from "node:test";
import assert from "node:assert/strict";
import { summariseSupportAccess } from "../../src/lib/admin/support/access.ts";
import { decodeAccessRead } from "../../src/lib/admin/support/decode.ts";
import { COLLECTION, DIGEST, ORDER, RELEASE } from "../fixtures/support.mjs";

const r = (n) => `f3000000-0000-4000-8000-000000000${100 + n}`;
function explanation(overrides = {}) {
  return { collectionId: COLLECTION, publicationId: null, resolverVersion: "phase2-additions-v1", dependencyToken: DIGEST,
    effective: "active", originalRecipeIds: [r(1), r(2)], additionRecipeIds: [r(3)], contentHoldRecipeIds: [r(2)],
    sources: [{ id: ORDER, kind: "stripe_purchase", originReleaseId: RELEASE, eligible: true, reason: null,
      validFrom: "2026-10-01T10:00:00+00:00", expiresAt: null, policyVersion: "additions-v1" }], ...overrides };
}

test("unavailable access is never shown as denied or as zero recipes", () => {
  for (const value of [null, explanation({ effective: "unavailable" })]) {
    assert.deepEqual(summariseSupportAccess(value),
      { effective: "unavailable", sourceCount: null, originalCount: null, additionCount: null, heldCount: null });
  }
});

test("counts do not double a recipe that is both original and added", () => {
  assert.deepEqual(summariseSupportAccess(explanation({ additionRecipeIds: [r(1), r(3)] })),
    { effective: "active", sourceCount: 1, originalCount: 2, additionCount: 1, heldCount: 1 });
});

test("an access read decodes strictly", () => {
  const read = { value: explanation(), checkedAt: "2026-10-09T12:00:00+00:00", complete: true, resolverVersion: "phase2-additions-v1" };
  assert.equal(decodeAccessRead(read).value.sources[0].policyVersion, "additions-v1");
  assert.throws(() => decodeAccessRead({ ...read, value: explanation({ effective: "maybe" }) }));
  assert.throws(() => decodeAccessRead({ ...read, value: explanation({ sources: [{ ...explanation().sources[0], kind: "gift" }] }) }));
  assert.throws(() => decodeAccessRead({ ...read, value: explanation({ dependencyToken: "dep-1" }) }));
});
