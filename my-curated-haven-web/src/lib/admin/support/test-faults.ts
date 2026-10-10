import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Faults for local browser tests only: a spec writes a marker file and the next matching step consumes it. Active
 * only with the local-ledger provider fixture on a server that is not deployed; anywhere else this always says no.
 */
export type LocalFault = "lose-next-commit" | "fail-next-postcheck";
export const LOCAL_FAULT_DIR = join(tmpdir(), "mch-support-test-faults");

export function consumeLocalFault(name: LocalFault): boolean {
  if (process.env.SUPPORT_PROVIDER_FIXTURE !== "local-ledger" || process.env.VERCEL_ENV !== undefined) return false;
  const marker = join(LOCAL_FAULT_DIR, name);
  if (!existsSync(marker)) return false;
  rmSync(marker, { force: true });
  return true;
}
