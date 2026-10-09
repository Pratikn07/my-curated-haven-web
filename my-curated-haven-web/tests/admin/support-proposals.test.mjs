import test from "node:test";
import assert from "node:assert/strict";
import { proposalDigest, proposalMaterial } from "../../src/lib/admin/support/digest.ts";
import { decodeProposal, decodeProposalList } from "../../src/lib/admin/support/decode.ts";
import { PROPOSAL, proposal } from "../fixtures/support.mjs";

const fixtureProposal = proposal;

test("material effect changes invalidate approval material",()=>{
  const proposal=fixtureProposal();
  assert.notEqual(proposalMaterial(proposal),proposalMaterial({...proposal,
    effects:proposal.effects.map(effect=>({...effect,afterEligible:!effect.afterEligible}))}));
});

test("the proposal digest agrees with the database golden vector", () => {
  // Suite 77 computes the same value with private.support_proposal_material and private.support_digest.
  assert.equal(proposalDigest(fixtureProposal()), "b8aebb3043f0b45314d94405229c016096bbe86399db89101c7b1bead1b03436");
});

test("the id, evidence id, digest and expiry are not approved material; everything else is", () => {
  const base = fixtureProposal();
  const same = { ...base, id: "f3000000-0000-4000-8000-0000000000ff", observationId: "f3000000-0000-4000-8000-0000000000fe",
    digest: "b".repeat(64), expiresAt: "2026-10-01T11:00:00.000Z" };
  assert.equal(proposalMaterial(same), proposalMaterial(base));
  for (const changed of [{ reason: "Another reason" }, { kind: "rebuild_projection" }, { expectedOrderVersion: 4 },
    { dependencyToken: "dep-2" }, { policyVersion: "fixture-v2" }, { blockers: ["no_change"] }, { materialDigest: "c".repeat(64) },
    { binding: { ...base.binding, releaseId: "f3000000-0000-4000-8000-0000000000fd" } }, { userId: "f3000000-0000-4000-8000-0000000000fc" }]) {
    assert.notEqual(proposalMaterial({ ...base, ...changed }), proposalMaterial(base), Object.keys(changed)[0]);
  }
});

test("proposals decode with lowercase blockers and refuse anything else", () => {
  assert.deepEqual(decodeProposal({ ...fixtureProposal(), blockers: ["dispute_open", "no_change"] }).blockers, ["dispute_open", "no_change"]);
  assert.throws(() => decodeProposal({ ...fixtureProposal(), blockers: ["DISPUTE_OPEN"] }));
  assert.throws(() => decodeProposal({ ...fixtureProposal(), kind: "grant_access" }));
  assert.throws(() => decodeProposal({ ...fixtureProposal(), effects: [{ ...fixtureProposal().effects[0], afterEffective: "maybe" }] }));
});

test("an order's proposal list keeps expired and blocked proposals readable", () => {
  const items = [
    { proposal: fixtureProposal(), state: "expired", approval: null, preparedAt: "2026-10-01T10:00:00.000Z" },
    { proposal: { ...fixtureProposal(), blockers: ["policy_missing"] }, state: "blocked", approval: null, preparedAt: "2026-10-01T09:00:00.000Z" },
  ];
  assert.deepEqual(decodeProposalList(items).map((item) => item.state), ["expired", "blocked"]);
  assert.equal(decodeProposalList(items)[0].proposal.id, PROPOSAL);
  assert.throws(() => decodeProposalList([{ ...items[0], state: "executing" }]));
});
