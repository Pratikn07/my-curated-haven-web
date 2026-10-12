/**
 * Argument and approval-file rules for the support operator command (scripts/admin-support-operator.mjs). No runtime
 * imports, so they are unit-tested directly. There is deliberately no way to pass provider facts, an approver for the
 * browser, or a default mode: facts come only from the registered verifier, and live mode is always explicit.
 */

export type OperatorArgs =
  | { action: "preview"; proposalId: string }
  | { action: "prepare"; orderId: string; observationId: string; kind: "reconcile_order" | "rebuild_projection"; reason: string;
      humanId: string; operationId: string }
  | { action: "attest"; file: string }
  | { action: "execute"; proposalId: string; operationId: string; mode: "test" | "live"; accountId: string; caseId: string | null };

export type Attestation = { proposalId: string; digest: string; humanId: string; evidenceReference: string };

export class OperatorInputError extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const ACCOUNT = /^acct_[A-Za-z0-9_]{1,64}$/;
const VALUE_FLAGS = new Set(["--proposal", "--order", "--observation", "--kind", "--reason", "--human", "--operation", "--mode",
  "--account", "--case", "--attest-file"]);
const ACTION_FLAGS = new Set(["--preview", "--attest-file", "--execute"]);

function fail(message: string): never {
  throw new OperatorInputError(message);
}

function uuid(value: string | undefined, name: string): string {
  return value !== undefined && UUID.test(value) ? value : fail(`${name} must be a lowercase UUID`);
}

export function parseOperatorArgs(argv: string[]): OperatorArgs {
  const values = new Map<string, string>();
  const actions: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (ACTION_FLAGS.has(flag)) actions.push(flag);
    if (VALUE_FLAGS.has(flag)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) fail(`${flag} needs a value`);
      if (values.has(flag)) fail(`${flag} given twice`);
      values.set(flag, value);
      i += 1;
    } else if (!ACTION_FLAGS.has(flag)) {
      fail(`Unknown argument: ${flag}`);
    }
  }
  if (actions.length !== 1) fail("Choose exactly one of --preview, --attest-file <path> or --execute");
  const used = (...allowed: string[]) => {
    for (const flag of values.keys()) if (!allowed.includes(flag)) fail(`${flag} does not apply here`);
  };
  if (actions[0] === "--attest-file") {
    used("--attest-file");
    return { action: "attest", file: values.get("--attest-file")! };
  }
  if (actions[0] === "--execute") {
    used("--proposal", "--operation", "--mode", "--account", "--case");
    const mode = values.get("--mode");
    if (mode !== "test" && mode !== "live") fail("--mode must be test or live; there is no default");
    const accountId = values.get("--account");
    if (!accountId || !ACCOUNT.test(accountId)) fail("--account must name the Stripe account (acct_…)");
    const caseId = values.get("--case");
    return { action: "execute", proposalId: uuid(values.get("--proposal"), "--proposal"),
      operationId: uuid(values.get("--operation"), "--operation"), mode, accountId,
      caseId: caseId === undefined ? null : uuid(caseId, "--case") };
  }
  if (values.has("--proposal")) {
    used("--proposal");
    return { action: "preview", proposalId: uuid(values.get("--proposal"), "--proposal") };
  }
  used("--order", "--observation", "--kind", "--reason", "--human", "--operation");
  const kind = values.get("--kind");
  if (kind !== "reconcile_order" && kind !== "rebuild_projection") fail("--kind must be reconcile_order or rebuild_projection");
  const reason = (values.get("--reason") ?? "").trim();
  if (reason.length < 1 || reason.length > 500) fail("--reason must be 1 to 500 characters");
  return { action: "prepare", orderId: uuid(values.get("--order"), "--order"), observationId: uuid(values.get("--observation"), "--observation"),
    kind, reason, humanId: uuid(values.get("--human"), "--human"), operationId: uuid(values.get("--operation"), "--operation") };
}

/** Why an approval file must not be read, or null. It must be a small regular file, not a link, writable only by its owner. */
export function attestFileProblem(info: { isFile: boolean; isSymbolicLink: boolean; mode: number; size: number; uid: number;
  currentUid: number }): string | null {
  if (info.isSymbolicLink) return "the approval file is a symbolic link";
  if (!info.isFile) return "the approval file is not a regular file";
  if (info.size > 4096) return "the approval file is larger than 4 KB";
  if ((info.mode & 0o022) !== 0) return "the approval file is writable by others";
  if (info.uid !== info.currentUid) return "the approval file belongs to another user";
  return null;
}

/** Exactly the four approval fields; anything else in the file is refused. */
export function parseAttestation(value: unknown): Attestation {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail("The approval file must hold one JSON object");
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort().join(",");
  if (keys !== "digest,evidenceReference,humanId,proposalId") fail("The approval file must hold exactly proposalId, digest, humanId and evidenceReference");
  if (typeof record.digest !== "string" || !DIGEST.test(record.digest)) fail("digest must be the proposal's 64-character digest");
  const reference = typeof record.evidenceReference === "string" ? record.evidenceReference.trim() : "";
  if (reference.length < 1 || reference.length > 200) fail("evidenceReference must be 1 to 200 characters, not a transcript");
  return { proposalId: uuid(record.proposalId as string, "proposalId"), digest: record.digest,
    humanId: uuid(record.humanId as string, "humanId"), evidenceReference: reference };
}

/** The mode and account typed on the command line must be the ones the proposal is bound to. */
export function confirmsBinding(binding: { mode: string; accountId: string }, mode: string, accountId: string): boolean {
  return binding.mode === mode && binding.accountId === accountId;
}
