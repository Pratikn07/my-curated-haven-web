import test from "node:test";
import assert from "node:assert/strict";
import { decodeApproval, decodeProposalList } from "../../src/lib/admin/support/decode.ts";
import { DIGEST, PROPOSAL, USER, proposal } from "../fixtures/support.mjs";

const APPROVAL = "f3000000-0000-4000-8000-00000000000a";
const approval = (over = {}) => ({ id: APPROVAL, proposalId: PROPOSAL, digest: DIGEST, humanAuthoriser: USER,
  approvedAt: "2026-10-01T10:01:00.000Z", expiresAt: "2026-10-01T10:05:00.000Z", channel: "web", ...over });

test("an approval decodes exactly", () => {
  assert.deepEqual(decodeApproval(approval()), approval());
  assert.equal(decodeApproval(approval({ channel: "operator" })).channel, "operator");
});

test("an approval names no extra approver detail, no other channel and a real digest", () => {
  assert.throws(() => decodeApproval(approval({ approverEmail: "owner@synthetic.test" })));
  assert.throws(() => decodeApproval(approval({ channel: "email" })));
  assert.throws(() => decodeApproval(approval({ digest: "changed-digest" })));
  assert.throws(() => decodeApproval(approval({ humanAuthoriser: null })));
});

test("an approved proposal in the list carries its approval", () => {
  const [item] = decodeProposalList([{ proposal: proposal(), state: "approved", approval: approval(), preparedAt: "2026-10-01T10:00:00.000Z" }]);
  assert.equal(item.approval?.proposalId, item.proposal.id);
  assert.throws(() => decodeProposalList([{ proposal: proposal(), state: "approved", approval: approval({ id: "x" }),
    preparedAt: "2026-10-01T10:00:00.000Z" }]));
});
