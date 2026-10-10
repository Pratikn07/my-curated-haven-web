// Pure parts of the support race harness (scripts/admin-support-concurrency.mjs): which scenarios exist, which ones a
// run selects, and the only database it may touch, the owned loopback test stack. No I/O here, so Node tests load it.

export const SCENARIOS = {
  "repair-vs-refund": "an approved repair racing a full refund never leaves a refunded purchase granted",
  "double-execution": "two operations for one approved proposal: exactly one runs",
  "same-operation-retry": "the same operation committed twice at once yields one receipt",
  "refund-a-vs-purchase-b": "a refund of purchase A and a payment for purchase B settle independently",
  "close-recreate-after-approval": "a closed and recreated account never inherits an approved repair",
  "publication-during-commit": "a publication racing a repair commit either keeps the approved effect or stops it",
  "audit-write-failure": "a failed audit write rolls back the whole repair, and a retry applies it once",
  "projection-write-failure": "a failed access projection rolls back the whole repair",
  "source-write-failure": "a failed purchase-source write rolls back the whole webhook reconciliation",
  "postcheck-write-failure": "a failed post-check leaves the committed receipt intact",
  "stale-fence": "an expired verifier claim cannot record facts after a newer claim",
  "old-success-after-refund": "an older answer cannot overwrite a newer refund",
  "refund-same-command-twice": "the same refund command sent twice at once reserves once; the same id with another amount is refused",
  "refund-two-operations-one-approval": "two operations for one approved refund: exactly one reserves",
  "refund-two-approvals-one-payment": "two approved refunds of one payment never reserve more than was paid",
  "refund-dispatch-twice": "two dispatch claims for one refund: exactly one is sent",
  "refund-dashboard-during-review": "a refund made in the Stripe Dashboard after approval stops the reservation",
  "refund-unknown-then-new-request": "while a refund's outcome is unknown, a new refund of the payment is blocked",
  "refund-answer-vs-expiry": "Stripe's answer racing the claim's expiry always ends recorded as sent",
};

/** The scenarios to run: all when none are named; unknown names are refused. */
export function selectScenarios(names) {
  if (!names || names.length === 0) return Object.keys(SCENARIOS);
  const unknown = names.filter((name) => !(name in SCENARIOS));
  if (unknown.length > 0) throw new Error(`Unknown scenario: ${unknown.join(", ")}`);
  return [...new Set(names)];
}

/**
 * The owned loopback test database from a workdir's supabase/config.toml, or an error for anything else. In CI
 * (`ci: true`) the job's own throwaway stack is accepted whatever its project id and port; it is still loopback.
 */
export function loopbackTarget(configText, { ci = false } = {}) {
  const project = configText.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
  const dbSection = configText.split(/^\[db\]\s*$/m)[1]?.split(/^\[/m)[0] ?? "";
  const port = Number(dbSection.match(/^port\s*=\s*(\d+)/m)?.[1]);
  if (!project) throw new Error("The workdir has no project_id");
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("The workdir's database port is missing or invalid");
  if (!ci && !/-test$/.test(project)) throw new Error("The workdir must be an owned test project (project_id ending in -test)");
  if (!ci && port === 54322) throw new Error("Refusing the default local stack (54322)");
  return { projectId: project, url: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres` };
}
