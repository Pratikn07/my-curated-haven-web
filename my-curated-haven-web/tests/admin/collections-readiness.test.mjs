import test from "node:test";
import assert from "node:assert/strict";
import { collectionReadiness } from "../../src/lib/admin/collections/readiness.ts";

const DIGEST = "d".repeat(64);
const cover = { src: "/images/collections/cover-a-1040.webp", width: 1040, height: 1400, alt: "A cover", assetDigest: DIGEST };
const revision = (state, snapshotCover) => ({ id: "r", collectionId: "c", version: 2, digest: "e".repeat(64),
  base: { publicationId: null, digest: DIGEST }, state, submissionId: null, savedAt: "", savedBy: "",
  snapshot: { cover: snapshotCover, members: [] } });
const pass = { code: "PROTECTED_KEPT", scope: "members", state: "pass", severity: "blocker", explanation: "", origin: "validation" };
const impact = (checks) => ({ ok: true, value: { checks } });

test("unavailable impact is an unknown blocker, never ready", () => {
  const r = collectionReadiness(revision("approved", null), { ok: false, code: "UNAVAILABLE", reference: "x" }, [cover]);
  assert.equal(r.readyForApproval, false);
  assert.equal(r.readyToPublish, false);
  assert.equal(r.needsVerification, true);
  assert.equal(r.checks[0].code, "SOURCE_UNAVAILABLE");
});

test("a passing approved revision is ready to publish; a draft only for approval", () => {
  assert.equal(collectionReadiness(revision("approved", null), impact([pass]), [cover]).readyToPublish, true);
  const draft = collectionReadiness(revision("draft", null), impact([pass]), [cover]);
  assert.deepEqual([draft.readyForApproval, draft.readyToPublish], [true, false]);
});

test("a cover must match a shipped file exactly", () => {
  assert.equal(collectionReadiness(revision("draft", cover), impact([pass]), [cover]).readyForApproval, true);
  const changed = collectionReadiness(revision("draft", { ...cover, assetDigest: "f".repeat(64) }), impact([pass]), [cover]);
  assert.equal(changed.readyForApproval, false);
  assert.equal(changed.checks.find((c) => c.code === "COVER_APPROVED").state, "fail");
});

test("suggestions never block", () => {
  const suggestion = { ...pass, code: "TEST_ACTIVITY", severity: "suggestion", state: "pass" };
  const unknownSuggestion = { ...pass, code: "NOTE", severity: "suggestion", state: "unknown" };
  const r = collectionReadiness(revision("draft", null), impact([pass, suggestion, unknownSuggestion]), [cover]);
  assert.equal(r.readyForApproval, true);
  assert.equal(r.needsVerification, true);
});
