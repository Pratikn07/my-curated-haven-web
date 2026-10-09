import test from "node:test";
import assert from "node:assert/strict";
import { decodeOperation, decodeProposal } from "../../src/lib/admin/support/decode.ts";
import { parseLookup } from "../../src/lib/admin/support/query.ts";
import { OPERATION, USER, proposal, receipt } from "../fixtures/support.mjs";

test("malformed success is rejected rather than decoded as empty", () => {
  assert.throws(() => decodeProposal({ id: "x", effects: [] }));
  assert.throws(() => decodeProposal(null));
});

test("a complete proposal decodes exactly", () => {
  assert.deepEqual(decodeProposal(proposal()), proposal());
});

test("a proposal with an extra key, a wrong enum or a fractional amount is refused", () => {
  assert.throws(() => decodeProposal({ ...proposal(), humanAuthoriser: USER }));
  assert.throws(() => decodeProposal({ ...proposal(), kind: "grant_access" }));
  assert.throws(() => decodeProposal({ ...proposal(), binding: { ...proposal().binding, expectedCapturedMinor: 15.5 } }));
  assert.throws(() => decodeProposal({ ...proposal(), binding: { ...proposal().binding, mode: "prod" } }));
  assert.throws(() => decodeProposal({ ...proposal(), effects: [{ ...proposal().effects[0], afterEffective: "maybe" }] }));
});

test("operation status decodes a receipt or a pending state, and nothing in between", () => {
  assert.deepEqual(decodeOperation(receipt()), receipt());
  const unknown = { operationId: OPERATION, state: "outcome_unknown", reasonCode: "TRANSPORT_LOST" };
  assert.deepEqual(decodeOperation(unknown), unknown);
  assert.throws(() => decodeOperation({ operationId: OPERATION, state: "applied", reasonCode: null }));
  assert.throws(() => decodeOperation({ ...receipt(), verification: "assumed" }));
});

test("lookup accepts exact supported shapes and normalises safe ones", () => {
  assert.deepEqual(parseLookup({ kind: "email", value: "  Buyer@Synthetic.Test " }), { kind: "email", value: "buyer@synthetic.test" });
  assert.deepEqual(parseLookup({ kind: "user_id", value: USER }), { kind: "user_id", value: USER });
  assert.deepEqual(parseLookup({ kind: "support_reference", value: "mch-1a2b3c" }), { kind: "support_reference", value: "MCH-1A2B3C" });
  assert.deepEqual(parseLookup({ kind: "support_reference", value: "MCH-K9" }), { kind: "support_reference", value: "MCH-K9" });
  assert.deepEqual(parseLookup({ kind: "provider_id", value: "pi_123", accountId: "acct_1", mode: "test" }),
    { kind: "provider_id", value: "pi_123", accountId: "acct_1", mode: "test" });
});

test("lookup refuses partial, smuggled or unsupported input", () => {
  for (const input of [
    { kind: "email", value: "buyer" },
    { kind: "email", value: "%@synthetic.test" },
    { kind: "user_id", value: "not-a-uuid" },
    { kind: "support_reference", value: "MCH-TOOLONG1" },
    { kind: "support_reference", value: "1A2B3C" },
    { kind: "provider_id", value: "pi_123" },
    { kind: "provider_id", value: "sk_live_123", accountId: "acct_1", mode: "live" },
    { kind: "provider_id", value: "pi_123", accountId: "acct_1", mode: "prod" },
    { kind: "email", value: "buyer@synthetic.test", actor: USER },
    { kind: "name", value: "Buyer" },
    "buyer@synthetic.test",
  ]) assert.throws(() => parseLookup(input), undefined, JSON.stringify(input));
});
