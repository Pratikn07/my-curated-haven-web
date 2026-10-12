import test from "node:test";
import assert from "node:assert/strict";
import { canonicalSupport, materialFactsDigest } from "../../src/lib/admin/support/digest.ts";
import { paidFacts } from "../fixtures/support.mjs";

const refund = (id, amountMinor) => ({ id, paymentIntentId: "pi_support", chargeId: "ch_support", amountMinor,
  currency: "usd", status: "succeeded", occurredAt: "2026-10-02T10:00:00Z" });

test("provider page ordering is not a material change", () => {
  const facts = paidFacts();
  const a = refund("re_a", 100);
  const b = refund("re_b", 200);
  assert.equal(materialFactsDigest({ ...facts, refunds: [a, b] }), materialFactsDigest({ ...facts, refunds: [b, a] }));
  assert.notEqual(materialFactsDigest(facts), materialFactsDigest({ ...facts, capturedMinor: 1600 }));
});

test("a changed refund amount, status or time is material", () => {
  const facts = { ...paidFacts(), refunds: [refund("re_a", 100)] };
  const base = materialFactsDigest(facts);
  assert.notEqual(base, materialFactsDigest({ ...facts, refunds: [refund("re_a", 101)] }));
  assert.notEqual(base, materialFactsDigest({ ...facts, refunds: [{ ...refund("re_a", 100), status: "pending" }] }));
  assert.notEqual(base, materialFactsDigest({ ...facts, refunds: [{ ...refund("re_a", 100), occurredAt: "2026-10-03T10:00:00Z" }] }));
});

test("conflicting duplicate identities are refused; exact duplicates collapse", () => {
  const facts = paidFacts();
  assert.throws(() => materialFactsDigest({ ...facts, refunds: [refund("re_a", 100), refund("re_a", 200)] }), /conflicting/i);
  assert.equal(materialFactsDigest({ ...facts, refunds: [refund("re_a", 100), refund("re_a", 100)] }),
    materialFactsDigest({ ...facts, refunds: [refund("re_a", 100)] }));
});

test("canonical JSON sorts keys, keeps arrays in order and refuses unsupported values", () => {
  assert.equal(canonicalSupport({ b: 1, a: [2, 1], c: { z: null, y: "x" } }), '{"a":[2,1],"b":1,"c":{"y":"x","z":null}}');
  assert.equal(canonicalSupport({ "é": 1, e: 2 }), '{"e":2,"é":1}');
  for (const value of [undefined, () => 1, Number.NaN, Infinity, 1.5e400, { a: undefined }, new Date(0), 2n]) {
    assert.throws(() => canonicalSupport(value), undefined, String(value));
  }
});

test("golden vector: the digest is SHA-256 of the canonical facts", () => {
  assert.equal(canonicalSupport(paidFacts()),
    '{"accountId":"acct_support_test","capturedMinor":1500,"chargeId":"ch_support","currency":"usd","disputes":[],'
    + '"mode":"test","paidAt":"2026-10-01T10:00:00Z","paymentIntentId":"pi_support","paymentState":"paid",'
    + '"refunds":[],"sessionId":"cs_test_support"}');
  // The same vectors are pinned in SQL suite 70 against private.support_digest.
  assert.equal(materialFactsDigest(paidFacts()), "47c7edb642e7f1b4a6edf427b5e48ad0590c42cb93a2e8ca1c9072b5cd4c2850");
  assert.equal(materialFactsDigest({ ...paidFacts(), refunds: [refund("re_b", 200), refund("re_a", 100)] }),
    "e87045b490c8aec5658546aaf719bd30fff787bf0f49035b5e7e3643a4ff9e3d");
  assert.equal(canonicalSupport({ "é": 1, e: 2, q: "a\"b\n\u0001/ü" }), '{"e":2,"q":"a\\"b\\n\\u0001/ü","é":1}');
  assert.equal(materialFactsDigest(paidFacts()), materialFactsDigest(JSON.parse(JSON.stringify(paidFacts()))));
});
