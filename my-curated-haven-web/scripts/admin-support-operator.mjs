#!/usr/bin/env node
// Restricted support operator commands for approved access repairs (Phase 3, Task 18). Preview first, then record the
// human's answer to exactly that preview, then apply it with fresh provider evidence:
//   node scripts/admin-support-operator.mjs --preview --order <id> --observation <id> --kind reconcile_order \
//     --reason "<why>" --human <user id> --operation <uuid>          (prepares, then shows the proposal)
//   node scripts/admin-support-operator.mjs --preview --proposal <id>
//   node scripts/admin-support-operator.mjs --attest-file ./approval.json
//   node scripts/admin-support-operator.mjs --execute --proposal <id> --operation <uuid> --mode test --account acct_…
// Credentials come only from the environment: SUPPORT_OPERATOR_DATABASE_URL (a registered operator login) and, to
// execute, SUPPORT_VERIFIER_DATABASE_URL plus the Stripe key for that mode. Output is limited to reference, digest,
// effects and receipt codes. Refunds and dispute notices are not available here.
import { lstat, readFile } from "node:fs/promises";
import { register } from "node:module";
import pg from "pg";

register("./ts-alias-hooks.mjs", import.meta.url);

const { OperatorInputError, attestFileProblem, confirmsBinding, parseAttestation, parseOperatorArgs } =
  await import("../src/lib/admin/support/operator-cli.ts");

function operatorUrl() {
  const raw = process.env.SUPPORT_OPERATOR_DATABASE_URL?.trim();
  if (!raw) throw new OperatorInputError("SUPPORT_OPERATOR_DATABASE_URL is not set");
  const url = new URL(raw);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") throw new OperatorInputError("SUPPORT_OPERATOR_DATABASE_URL must be a PostgreSQL URL");
  return raw;
}

function summarise(preview) {
  const p = preview.proposal;
  const lines = [`order ${preview.supportReference}  proposal ${p.id}`, `kind ${p.kind}  mode ${p.binding.mode}  account ${p.binding.accountId}`,
    `digest ${p.digest}`, `expires ${p.expiresAt}${preview.expired ? " (expired)" : ""}  current ${preview.current ? "yes" : "no"}`];
  for (const e of p.effects) {
    lines.push(`effect source ${e.beforeEligible ?? "none"} -> ${e.afterEligible}  access ${e.beforeEffective} -> ${e.afterEffective}  email ${e.notification}`);
  }
  lines.push(p.blockers.length ? `blocked: ${p.blockers.join(", ")}` : "blockers: none");
  lines.push(preview.approval ? `approved by ${preview.approval.humanAuthoriser} until ${preview.approval.expiresAt}` : "approval: none");
  return lines.join("\n");
}

function receiptLine(status) {
  if (status.state === "applied" || status.state === "already_satisfied") {
    const e = status.effects[0];
    return `${status.state}  operation ${status.operationId}  audit ${status.auditId}  verification ${status.verification}`
      + (e ? `  access ${e.beforeEffective} -> ${e.afterEffective}` : "");
  }
  return `${status.state}  operation ${status.operationId}${status.reasonCode ? `  reason ${status.reasonCode}` : ""}`;
}

async function query(client, sql, params) {
  const { rows } = await client.query(sql, params);
  return rows[0]?.result;
}

let verifier = null;
let connected = null;
try {
  const args = parseOperatorArgs(process.argv.slice(2));
  connected = new pg.Client({ connectionString: operatorUrl() });
  await connected.connect();

  if (args.action === "prepare" || args.action === "preview") {
    let proposalId = args.action === "preview" ? args.proposalId : null;
    if (args.action === "prepare") {
      const proposal = await query(connected, "SELECT private.support_operator_prepare($1::jsonb) AS result", [JSON.stringify({
        orderId: args.orderId, observationId: args.observationId, kind: args.kind, reason: args.reason, humanId: args.humanId,
        operationId: args.operationId })]);
      proposalId = proposal.id;
    }
    console.log(summarise(await query(connected, "SELECT private.support_operator_preview($1) AS result", [proposalId])));
  } else if (args.action === "attest") {
    const info = await lstat(args.file);
    const problem = attestFileProblem({ isFile: info.isFile(), isSymbolicLink: info.isSymbolicLink(), mode: info.mode, size: info.size,
      uid: info.uid, currentUid: process.getuid?.() ?? info.uid });
    if (problem) throw new OperatorInputError(problem);
    const attestation = parseAttestation(JSON.parse(await readFile(args.file, "utf8")));
    const approval = await query(connected, "SELECT private.support_operator_attest($1, $2, $3, $4) AS result",
      [attestation.proposalId, attestation.digest, attestation.humanId, attestation.evidenceReference]);
    console.log(`approval ${approval.id}  proposal ${approval.proposalId}  by ${approval.humanAuthoriser}  until ${approval.expiresAt}`);
  } else {
    const preview = await query(connected, "SELECT private.support_operator_preview($1) AS result", [args.proposalId]);
    if (!confirmsBinding(preview.proposal.binding, args.mode, args.accountId)) {
      throw new OperatorInputError("--mode and --account do not match the proposal's order; nothing was run");
    }
    const command = { operationId: args.operationId, proposalId: args.proposalId, expectedDigest: preview.proposal.digest, caseId: args.caseId };
    const begun = await query(connected, "SELECT private.support_operator_execute_begin($1::jsonb) AS result", [JSON.stringify(command)]);
    let status = begun.status;
    if (status.state === "checking") {
      // Fresh evidence from the registered verifier, outside any database transaction.
      verifier = await import("../src/lib/payments/reconciliation/repository.ts");
      const { sourcedProviderRead } = await import("../src/lib/payments/reconciliation/service.ts");
      const { runVerification } = await import("../src/lib/payments/reconciliation/verifier.ts");
      if (!verifier.verifierConfigured()) throw new OperatorInputError("SUPPORT_VERIFIER_DATABASE_URL is not set to a usable database");
      const verified = await runVerification(begun.jobId, { claim: verifier.claimVerification, read: sourcedProviderRead,
        record: verifier.recordObservation });
      if (!verified.ok) {
        status = await query(connected, "SELECT private.support_operator_operation($1) AS result", [args.operationId]);
      } else {
        try {
          status = await query(connected, "SELECT private.support_operator_execute($1::jsonb, $2) AS result",
            [JSON.stringify(command), verified.observationId]);
        } catch (error) {
          if (!/ADM_[A-Z_]+/.test(error?.message ?? "")) {
            // The commit may have happened: read the stored result before saying anything.
            status = await query(connected, "SELECT private.support_operator_operation($1) AS result", [args.operationId])
              .catch(() => ({ operationId: args.operationId, state: "outcome_unknown", reasonCode: null }));
          } else {
            throw error;
          }
        }
      }
    }
    console.log(receiptLine(status));
  }
} catch (error) {
  const code = error?.message?.match(/ADM_[A-Z_]+/)?.[0];
  console.error(`admin-support-operator: ${code ?? (error instanceof OperatorInputError ? error.message : "failed")}`);
  process.exitCode = 1;
} finally {
  await connected?.end().catch(() => {});
  await verifier?.closeVerifierPool?.().catch(() => {});
}
