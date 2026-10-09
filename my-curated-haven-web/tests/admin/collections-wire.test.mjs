import test from "node:test";
import assert from "node:assert/strict";
import { controlWire, createWire, reviewWire, saveWire, startWire } from "../../src/lib/admin/collections/wire.ts";
import { decodeDraftResult } from "../../src/lib/admin/collections/decode.ts";

const ID = "93000000-0000-0000-0000-000000000001";
const OP = "93000000-0000-0000-0000-000000000999";
const snapshot = { collectionId: ID, slug: "first-foods", title: "First foods", tagline: "", story: "", forWhen: "",
  refresh: "", shelf: "mornings", sortOrder: 1, stage: { min: null, max: null }, series: null, listingState: "unlisted",
  availability: "coming-soon", cloth: "sage", cover: null, members: [] };

test("commands use the database's snake_case keys and keep the snapshot camelCase", () => {
  assert.deepEqual(saveWire({ collectionId: ID, operationId: OP, reason: "Edit", expectedVersion: 2,
    expectedDigest: "d".repeat(64), base: { publicationId: null, digest: "e".repeat(64) }, snapshot, reopenReviewed: false }), {
    collection_id: ID, operation_id: OP, reason: "Edit", expected_version: 2, expected_digest: "d".repeat(64),
    base: { publication_id: null, digest: "e".repeat(64) }, snapshot, reopen_reviewed: false,
  });
  assert.deepEqual(startWire({ collectionId: ID, operationId: OP, reason: "Start" }),
    { collection_id: ID, operation_id: OP, reason: "Start" });
  assert.deepEqual(createWire({ collectionId: ID, operationId: OP, reason: "New", snapshot }),
    { collection_id: ID, operation_id: OP, reason: "New", snapshot });
  assert.deepEqual(controlWire({ collectionId: ID, operationId: OP, reason: "Drop", action: "discard",
    expectedDigest: "d".repeat(64), referenceId: null }),
    { collection_id: ID, operation_id: OP, reason: "Drop", action: "discard", expected_digest: "d".repeat(64), reference_id: null });
});

test("a discard result has no revision; anything malformed is unavailable", () => {
  assert.equal(decodeDraftResult({ operationId: OP, noChange: false, revision: null, committedAt: "2026-10-08T00:00:00Z" }).ok, true);
  assert.equal(decodeDraftResult({ operationId: OP, noChange: "no", revision: null, committedAt: "2026-10-08T00:00:00Z" }).ok, false);
  assert.equal(decodeDraftResult(null).ok, false);
});

test("review commands name the exact revision, submission and evidence token", () => {
  assert.deepEqual(reviewWire({ collectionId: ID, operationId: OP, reason: "Looks right", revisionId: ID, expectedVersion: 3,
    expectedDigest: "d".repeat(64), impactToken: "t", submissionId: OP, decision: "approve", resolvedIssueIds: [OP] }), {
    collection_id: ID, operation_id: OP, reason: "Looks right", revision_id: ID, expected_version: 3,
    expected_digest: "d".repeat(64), impact_token: "t", submission_id: OP, decision: "approve", resolved_issue_ids: [OP],
  });
});
