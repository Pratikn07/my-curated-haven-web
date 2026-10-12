import test from "node:test";
import assert from "node:assert/strict";
import { decodeHistoryPage, decodeQueuePage, decodeSupportCase } from "../../src/lib/admin/support/decode.ts";
import { OPERATION, ORDER, USER } from "../fixtures/support.mjs";

const AT = "2026-10-09T12:00:00.123+00:00";

test("a case decodes with its five states and positive versions only", () => {
  const value = { id: OPERATION, orderId: ORDER, userId: USER, state: "waiting_on_provider", version: 3 };
  assert.deepEqual(decodeSupportCase(value), value);
  assert.throws(() => decodeSupportCase({ ...value, state: "closed" }));
  assert.throws(() => decodeSupportCase({ ...value, version: 0 }));
  assert.throws(() => decodeSupportCase({ ...value, note: "text" }));
});

test("queue items need a reason code, a mode and a time, and a page holds at most 25", () => {
  const item = { orderId: ORDER, caseId: null, supportReference: "MCH-1A2B3C", mode: "live", reasonCode: "DISPUTE_INQUIRY", observedAt: AT,
    deadlineAt: null, accessConsequence: "none" };
  assert.equal(decodeQueuePage({ items: [item], nextCursor: null }).items[0].reasonCode, "DISPUTE_INQUIRY");
  assert.throws(() => decodeQueuePage({ items: [{ ...item, reasonCode: "dispute" }], nextCursor: null }));
  assert.throws(() => decodeQueuePage({ items: [{ ...item, mode: "both" }], nextCursor: null }));
  assert.throws(() => decodeQueuePage({ items: Array.from({ length: 26 }, () => item), nextCursor: null }));
  assert.equal(decodeQueuePage({ items: [{ ...item, reasonCode: "DISPUTE_OPEN", deadlineAt: AT, accessConsequence: "at_risk" }],
    nextCursor: null }).items[0].deadlineAt, AT);
  assert.throws(() => decodeQueuePage({ items: [{ ...item, accessConsequence: "fine" }], nextCursor: null }));
  assert.throws(() => decodeQueuePage({ items: [{ ...item, deadlineAt: "next week" }], nextCursor: null }));
});

test("timeline events keep a redacted note as null rather than inventing text", () => {
  const event = { id: OPERATION, kind: "case", at: AT, code: "CASE_APPEND_NOTE", actorLabel: "support-operator@synthetic.test",
    operationId: OPERATION, note: null };
  assert.equal(decodeHistoryPage({ events: [event], nextCursor: null }).events[0].note, null);
  assert.throws(() => decodeHistoryPage({ events: [{ ...event, kind: "email" }], nextCursor: null }));
});
