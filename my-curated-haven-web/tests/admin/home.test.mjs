import assert from "node:assert/strict";
import test from "node:test";
import { collectionFeed, decodeHomeResults, decodeSupportResults, recipeFeed, supportFeed } from "../../src/lib/admin/home/contracts.ts";
import { ACCESS_CONSEQUENCE_LABELS, QUEUE_REASONS } from "../../src/lib/admin/support/labels.ts";

const checkedAt = "2026-10-08T10:00:00.000Z";
const summary = { all: 40, attention: 2, awaiting_review: 1, ready: 3, published: 30, withdrawn: 1 };
const blocker = { code: "IMAGE", scope: "image", state: "fail", severity: "blocker", explanation: "The image is missing.", origin: "validation" };
function recipe(id, checks = []) {
  return { id, slug: id, title: `Recipe ${id}`, imagePath: "", publication: "draft", collections: [], changedAt: checkedAt,
    readiness: { targetDigest: "d", review: "unreviewed", checks, needsAttention: checks.length > 0, awaitingReview: false,
      readyToPublish: false, needsVerification: false, evaluatedAt: checkedAt } };
}
function library(rows) {
  return { rows, filteredTotal: rows.length, summary, query: {}, sourceRevision: "s", checkedAt, dependencyChecks: [] };
}

test("recipe lane puts blockers before review before publication, without repeating a recipe", () => {
  const feed = recipeFeed(library([recipe("a", [blocker]), recipe("b", [blocker])]), library([recipe("c"), recipe("a")]),
    library([recipe("d"), recipe("e"), recipe("f")]));
  assert.equal(feed.state, "ready");
  assert.deepEqual(feed.rows.map((r) => r.key), ["recipe:a", "recipe:b", "recipe:c", "recipe:d", "recipe:e"]);
  assert.equal(feed.rows[0].reason, "The image is missing.");
  assert.equal(feed.rows[2].reason, "Submitted for review");
  assert.equal(feed.rows[3].reason, "Approved and ready to publish");
  assert.deepEqual(feed.counts.map((c) => c.count), [2, 1, 3], "counts come from the same inventory summary");
  assert.equal(feed.total, 6);
});

test("collection lane puts requested changes before review before publication", () => {
  const row = (id, workingState) => ({ collectionId: `00000000-0000-4000-8000-00000000000${id}`, slug: id, title: `C${id}`,
    shelf: "mornings", stage: { min: null, max: null }, series: null, listingState: "listed", availability: "open",
    publicationId: null, publishedCount: 0, draftCount: 1, workingState, needsAttention: true, commerceState: "no_offer",
    changedAt: checkedAt });
  const feed = collectionFeed({ rows: [row(1, "approved"), row(2, "submitted"), row(3, "changes_requested")], filteredTotal: 3,
    page: 1, pageSize: 25, checkedAt });
  assert.deepEqual(feed.rows.map((r) => r.title), ["C3", "C2", "C1"]);
  assert.deepEqual(feed.counts, [{ label: "Need a decision", count: 3 }]);
});

test("results must name an action that belongs to their domain", () => {
  const valid = { operationId: "00000000-0000-4000-8000-000000000001", domain: "collection",
    objectId: "00000000-0000-4000-8000-000000000002", title: "C", action: "collection.publish", noChange: false,
    refreshState: "pending", committedAt: checkedAt };
  assert.equal(decodeHomeResults([valid]).length, 1);
  assert.throws(() => decodeHomeResults([{ ...valid, domain: "recipe" }]));
  assert.throws(() => decodeHomeResults([{ ...valid, refreshState: "failed" }]));
  assert.throws(() => decodeHomeResults(Array(11).fill(valid)));
});

const ORDER_A = "f3000000-0000-4000-8000-000000000001";
const ORDER_B = "f3000000-0000-4000-8000-000000000002";
const ORDER_C = "f3000000-0000-4000-8000-000000000003";
const queueItem = (over) => ({ orderId: ORDER_A, caseId: null, supportReference: "MCH-1A2B3C", mode: "live", reasonCode: "CASE_OPEN",
  observedAt: "2026-10-08T09:00:00.000Z", deadlineAt: null, accessConsequence: "none", ...over });
const labels = { reasons: QUEUE_REASONS, access: ACCESS_CONSEQUENCE_LABELS };

test("support attention puts verified dispute deadlines first, then blocked and at-risk access, then the longest waiting", () => {
  const live = { items: [
    queueItem({ orderId: ORDER_A, supportReference: "MCH-AAAA", observedAt: "2026-10-08T08:00:00.000Z" }),
    queueItem({ orderId: ORDER_B, supportReference: "MCH-BBBB", reasonCode: "DISPUTE_OPEN", deadlineAt: "2026-10-20T23:59:59.000Z",
      accessConsequence: "at_risk" }),
  ], nextCursor: null };
  const test_ = { items: [queueItem({ orderId: ORDER_C, supportReference: "MCH-CCCC", mode: "test", accessConsequence: "blocked" })],
    nextCursor: null };
  const feed = supportFeed(live, test_, checkedAt, labels);
  assert.equal(feed.state, "ready");
  assert.deepEqual(feed.rows.map((r) => r.title), ["MCH-BBBB", "MCH-CCCC", "MCH-AAAA"]);
  assert.equal(feed.rows[0].reason, "Dispute open; respond in Stripe by 2026-10-20");
  assert.equal(feed.rows[1].state, "Test · Paid, without access");
  assert.deepEqual(feed.counts, [{ label: "Live items shown", count: 2 }, { label: "Test items shown", count: 1 }]);
  assert.equal(feed.rows[0].href, `/admin/support/orders/${ORDER_B}`);
  assert.ok(!JSON.stringify(feed).includes("@"), "no email reaches Home");
});

test("support results decode only safe facts", () => {
  const result = { operationId: ORDER_A, kind: "refund", orderId: ORDER_B, supportReference: "MCH-1A2B3C", state: "outcome_unknown",
    at: "2026-10-08T10:00:00Z" };
  assert.deepEqual(decodeSupportResults([result]), [result]);
  assert.throws(() => decodeSupportResults([{ ...result, amountMinor: 400 }]));
  assert.throws(() => decodeSupportResults([{ ...result, kind: "payout" }]));
  assert.throws(() => decodeSupportResults([{ ...result, supportReference: "buyer@example.com" }]));
  assert.throws(() => decodeSupportResults(Array.from({ length: 11 }, () => result)));
});

