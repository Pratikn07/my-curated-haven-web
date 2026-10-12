#!/usr/bin/env node
// Bounded commerce recovery for one mode. Dry run by default (counts only); --apply re-checks due webhook events and
// orders left unresolved for 15 minutes with Stripe and reconciles them under each order's approved policy.
//   node scripts/commerce-reconcile.mjs --mode test [--limit 10] [--apply]
// Needs SUPPORT_VERIFIER_DATABASE_URL (a registered verifier login) and, to apply, the Stripe key for that mode.
import { register } from "node:module";

register("./ts-alias-hooks.mjs", import.meta.url);

function parse(argv) {
  const options = { mode: null, limit: 10, apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--mode") options.mode = argv[++i];
    else if (arg === "--limit") options.limit = Number(argv[++i]);
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--dry-run") options.apply = false;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.mode !== "test" && options.mode !== "live") throw new Error("--mode must be test or live");
  if (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 100) throw new Error("--limit must be 1 to 100");
  return options;
}

let closeVerifierPool = async () => {};
try {
  const options = parse(process.argv.slice(2));
  const repository = await import("../src/lib/payments/reconciliation/repository.ts");
  closeVerifierPool = repository.closeVerifierPool;
  if (!repository.verifierConfigured()) throw new Error("SUPPORT_VERIFIER_DATABASE_URL is not set to a usable database");
  const { runRecovery } = await import("../src/lib/payments/reconciliation/recovery.ts");
  console.log(JSON.stringify(await runRecovery(options), null, 2));
} catch (error) {
  console.error(`commerce-reconcile: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await closeVerifierPool();
}
