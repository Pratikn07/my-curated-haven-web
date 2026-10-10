import test from "node:test";
import assert from "node:assert/strict";
import { attestFileProblem, confirmsBinding, parseAttestation, parseOperatorArgs } from "../../src/lib/admin/support/operator-cli.ts";

const P = "f3000000-0000-4000-8000-000000000030";
const O = "f3000000-0000-4000-8000-000000000031";
const H = "f3000000-0000-4000-8000-000000000002";
const DIGEST = "a".repeat(64);

test("preview, prepare, attest and execute each take only their own arguments", () => {
  assert.deepEqual(parseOperatorArgs(["--preview", "--proposal", P]), { action: "preview", proposalId: P });
  assert.deepEqual(parseOperatorArgs(["--preview", "--order", O, "--observation", P, "--kind", "reconcile_order", "--reason", " Missing access ",
    "--human", H, "--operation", O]), { action: "prepare", orderId: O, observationId: P, kind: "reconcile_order", reason: "Missing access",
    humanId: H, operationId: O });
  assert.deepEqual(parseOperatorArgs(["--attest-file", "./approval.json"]), { action: "attest", file: "./approval.json" });
  assert.deepEqual(parseOperatorArgs(["--execute", "--proposal", P, "--operation", O, "--mode", "test", "--account", "acct_support_test"]),
    { action: "execute", proposalId: P, operationId: O, mode: "test", accountId: "acct_support_test", caseId: null });
});

test("dry preview, forged facts and missing confirmations are refused", () => {
  assert.throws(() => parseOperatorArgs([]), /exactly one/);
  assert.throws(() => parseOperatorArgs(["--preview", "--execute", "--proposal", P]), /exactly one/);
  assert.throws(() => parseOperatorArgs(["--execute", "--proposal", P, "--operation", O, "--facts-file", "facts.json"]), /Unknown argument/);
  assert.throws(() => parseOperatorArgs(["--execute", "--proposal", P, "--operation", O, "--account", "acct_x"]), /no default/);
  assert.throws(() => parseOperatorArgs(["--execute", "--proposal", P, "--operation", O, "--mode", "live"]), /account/);
  assert.throws(() => parseOperatorArgs(["--preview", "--proposal", P, "--mode", "test"]), /does not apply/);
  assert.throws(() => parseOperatorArgs(["--preview", "--proposal", "not-a-uuid"]), /UUID/);
  assert.throws(() => parseOperatorArgs(["--preview", "--proposal", P, "--proposal", O]), /twice/);
  assert.throws(() => parseOperatorArgs(["--preview", "--order", O, "--observation", P, "--kind", "grant_access", "--reason", "x",
    "--human", H, "--operation", O]), /--kind/);
  assert.throws(() => parseOperatorArgs(["--execute", "--proposal", P, "--operation", O, "--mode", "test", "--account", "acct_x",
    "--human", H]), /does not apply/);
});

test("the approval file holds exactly the four fields, with a short reference", () => {
  const ok = { proposalId: P, digest: DIGEST, humanId: H, evidenceReference: " chat 10 Oct: yes " };
  assert.deepEqual(parseAttestation(ok), { ...ok, evidenceReference: "chat 10 Oct: yes" });
  assert.throws(() => parseAttestation({ ...ok, humanAuthoriser: H }), /exactly/);
  assert.throws(() => parseAttestation({ ...ok, digest: "changed" }), /digest/);
  assert.throws(() => parseAttestation({ ...ok, evidenceReference: "x".repeat(201) }), /transcript/);
  assert.throws(() => parseAttestation([ok]), /one JSON object/);
});

test("the approval file must be a small private regular file", () => {
  const file = { isFile: true, isSymbolicLink: false, mode: 0o100600, size: 200, uid: 501, currentUid: 501 };
  assert.equal(attestFileProblem(file), null);
  assert.match(attestFileProblem({ ...file, isSymbolicLink: true }) ?? "", /symbolic link/);
  assert.match(attestFileProblem({ ...file, isFile: false }) ?? "", /regular/);
  assert.match(attestFileProblem({ ...file, mode: 0o100666 }) ?? "", /writable/);
  assert.match(attestFileProblem({ ...file, size: 5000 }) ?? "", /4 KB/);
  assert.match(attestFileProblem({ ...file, uid: 0 }) ?? "", /another user/);
});

test("the typed mode and account must match the proposal's binding", () => {
  assert.equal(confirmsBinding({ mode: "test", accountId: "acct_support_test" }, "test", "acct_support_test"), true);
  assert.equal(confirmsBinding({ mode: "test", accountId: "acct_support_test" }, "live", "acct_support_test"), false);
  assert.equal(confirmsBinding({ mode: "live", accountId: "acct_a" }, "live", "acct_b"), false);
});
