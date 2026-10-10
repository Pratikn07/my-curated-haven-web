import test from "node:test";
import assert from "node:assert/strict";
import { disputeNoticeCopy, noticeStatusMessage } from "../../src/lib/admin/support/notices/template.ts";
import { coordinateNotice } from "../../src/lib/admin/support/notices/coordinator.ts";
import { noticeAccepted, noticeErrorResult } from "../../src/lib/email/notice-outcomes.ts";
import { decodeNoticeDraft, decodeNoticeList, decodeNoticeReceipt } from "../../src/lib/admin/support/decode.ts";
import { DIGEST, ORDER, USER } from "../fixtures/support.mjs";

test("another valid source prevents a misleading collection-lockout notice",()=>{
  const copy=disputeNoticeCopy({supportReference:"MCH-TEST-1",collectionTitle:"Weeknight recipes",
    effectiveAccess:"active",supportEmail:"support@mycuratedhaven.com"});
  assert.match(copy.text,/Your collection remains available through another valid purchase or access source/);
  assert.doesNotMatch(copy.text,/your account (?:is|has been) suspended/i);
});

test("transport acceptance is not claimed as delivery",()=>{
  assert.equal(noticeStatusMessage("accepted","unconfirmed"),
    "Email accepted by the provider. Delivery is not confirmed.");
  assert.equal(noticeStatusMessage("outcome_unknown","unconfirmed"),
    "Email send outcome unknown. Check this operation before sending again.");
});

test("the template is exactly the text its database twin renders and approves", () => {
  // Pinned in supabase/tests/database/85_admin_support_dispute_notices.test.sql as well.
  assert.deepEqual(disputeNoticeCopy({ supportReference: "MCH-TEST-1", collectionTitle: "Weeknight recipes", effectiveAccess: "active",
    supportEmail: "support@mycuratedhaven.com" }), { subject: "About your order MCH-TEST-1", text: "Hello,\n\n"
    + "Your bank or card issuer has told us that you are disputing the payment for your My Curated Haven order MCH-TEST-1 (Weeknight recipes).\n\n"
    + "Your collection remains available through another valid purchase or access source.\n\n"
    + "Your bank decides the dispute, and this email does not change it. If you have a question, or you did not mean to dispute this payment, "
    + "reply to this email or write to support@mycuratedhaven.com and quote MCH-TEST-1.\n\nMy Curated Haven" });
  const denied = disputeNoticeCopy({ supportReference: "MCH-TEST-1", collectionTitle: "Week\r\nBcc: x@example.com", effectiveAccess: "denied",
    supportEmail: "support@mycuratedhaven.com" });
  assert.match(denied.text, /\(Week Bcc: x@example\.com\)/);
  assert.match(denied.text, /the recipes from this purchase are paused\. Nothing else in your account changes\./);
  assert.equal(denied.subject, "About your order MCH-TEST-1");
});

test("only a documented SES refusal proves nothing was sent; everything else is unknown", () => {
  const error = (name, httpStatusCode) => Object.assign(new Error(name), { name, $metadata: { httpStatusCode } });
  assert.deepEqual(noticeErrorResult(error("MessageRejected", 400)), { kind: "not_executed", code: "MESSAGE_REJECTED" });
  assert.deepEqual(noticeErrorResult(error("MailFromDomainNotVerifiedException", 400)), { kind: "not_executed", code: "MAIL_FROM_DOMAIN_NOT_VERIFIED" });
  assert.deepEqual(noticeErrorResult(error("TooManyRequestsException", 429)), { kind: "not_executed", code: "TOO_MANY_REQUESTS" });
  for (const unknown of [error("MessageRejected", 500), error("InternalServiceErrorException", 500), error("TimeoutError", undefined),
    error("AbortError", undefined), null, "socket hang up"]) {
    assert.equal(noticeErrorResult(unknown).kind, "unknown");
  }
  assert.deepEqual(noticeAccepted("0100018f-abc"), { kind: "accepted", providerMessageId: "0100018f-abc" });
  assert.equal(noticeAccepted(undefined).kind, "unknown");
});

function ports(over = {}) {
  const calls = [];
  const claim = { operationId: "f3000000-0000-4000-8000-000000000070", fence: 7, expiresAt: "2026-10-10T10:00:10Z" };
  const receipt = (state) => ({ operationId: claim.operationId, draftId: "f3000000-0000-4000-8000-000000000071", state,
    providerMessageId: state === "accepted" ? "msg-1" : null, delivery: "unconfirmed", auditId: "f3000000-0000-4000-8000-000000000072",
    reasonCode: null, checkedAt: "2026-10-10T10:00:01Z" });
  return { calls, value: {
    check: async () => { calls.push("check"); return { observationId: ORDER }; },
    claim: async () => { calls.push("claim"); return claim; },
    payload: async () => { calls.push("payload"); return { operationId: claim.operationId, mode: "test", recipient: "a@b.test", subject: "s", text: "t" }; },
    send: async () => { calls.push("send"); return { kind: "accepted", providerMessageId: "msg-1" }; },
    record: async (_c, result) => { calls.push(`record:${result.kind}:${result.code ?? ""}`);
      return receipt(result.kind === "accepted" ? "accepted" : result.kind === "unknown" ? "outcome_unknown" : "failed_before_acceptance"); },
    ...over,
  } };
}
const command = { operationId: "f3000000-0000-4000-8000-000000000070", draftId: "f3000000-0000-4000-8000-000000000071", expectedDigest: DIGEST };

test("a notice is checked, claimed, read, sent once and recorded", async () => {
  const p = ports();
  assert.equal((await coordinateNotice(command, p.value)).state, "accepted");
  assert.deepEqual(p.calls, ["check", "claim", "payload", "send", "record:accepted:"]);
});

test("a transport that throws may have sent: recorded as unknown, never retried", async () => {
  const p = ports({ send: async () => { p.calls.push("send"); throw new Error("socket hang up"); } });
  assert.equal((await coordinateNotice(command, p.value)).state, "outcome_unknown");
  assert.deepEqual(p.calls, ["check", "claim", "payload", "send", "record:unknown:TRANSPORT_FAILED"]);
});

test("an email that could not be read was never sent, and nothing reaches the transport", async () => {
  const p = ports({ payload: async () => { p.calls.push("payload"); throw new Error("ADM_STALE"); } });
  assert.equal((await coordinateNotice(command, p.value)).state, "failed_before_acceptance");
  assert.deepEqual(p.calls, ["check", "claim", "payload", "record:not_executed:PAYLOAD_UNAVAILABLE"]);
});

test("a refused claim sends nothing", async () => {
  const p = ports({ claim: async () => { throw new Error("ADM_CONFLICT"); } });
  await assert.rejects(coordinateNotice(command, p.value), /ADM_CONFLICT/);
  assert.deepEqual(p.calls, ["check"]);
});

test("notice drafts, receipts and lists decode strictly", () => {
  const draft = { id: "f3000000-0000-4000-8000-000000000071", noticeId: "f3000000-0000-4000-8000-000000000073", orderId: ORDER,
    disputeId: "du_support_formal", ownerPrincipal: USER, recipient: "first.last+buyer@synthetic.test", recipientReference: USER,
    recipientVersion: DIGEST, subject: "About your order MCH-1A2B3C", text: "Hello,", templateVersion: "dispute-opened-v1", disputeVersion: DIGEST,
    disputeStatus: "needs_response", respondBy: "2026-10-20T23:59:59Z", effectiveAccess: "denied", dependencyToken: DIGEST, digest: DIGEST,
    expiresAt: "2026-10-10T10:05:00Z", blockers: [], redacted: false };
  assert.deepEqual(decodeNoticeDraft(draft), draft);
  assert.deepEqual(decodeNoticeDraft({ ...draft, recipient: "", subject: "", text: "", redacted: true }).redacted, true);
  assert.throws(() => decodeNoticeDraft({ ...draft, cc: "x@example.com" }));
  assert.throws(() => decodeNoticeDraft({ ...draft, disputeId: "dp_x" }));
  assert.throws(() => decodeNoticeDraft({ ...draft, templateVersion: "custom" }));
  const receipt = { operationId: "f3000000-0000-4000-8000-000000000070", draftId: draft.id, state: "accepted", providerMessageId: "msg-1",
    delivery: "unconfirmed", auditId: "f3000000-0000-4000-8000-000000000072", reasonCode: null, checkedAt: "2026-10-10T10:00:01Z" };
  assert.deepEqual(decodeNoticeReceipt(receipt), receipt);
  assert.throws(() => decodeNoticeReceipt({ ...receipt, state: "delivered" }));
  assert.equal(decodeNoticeList({ sendingEnabled: false, items: [{ draft, state: "started", approval: null, receipt,
    preparedAt: "2026-10-10T10:00:00Z" }] }).items.length, 1);
});
