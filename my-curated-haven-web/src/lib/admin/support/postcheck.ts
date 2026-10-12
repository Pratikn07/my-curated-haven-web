import type { RepairReceipt } from "./contracts";

/**
 * Settle a committed repair's post-check. A failed or unavailable check never undoes or hides the committed receipt:
 * it stays applied, with verification `unavailable` (the check could not run) or `pending` (access did not match).
 */
export async function settleSupportPostcheck(receipt: RepairReceipt, check: () => Promise<boolean>): Promise<RepairReceipt> {
  try {
    return { ...receipt, verification: (await check()) ? "verified" : "pending" };
  } catch {
    return { ...receipt, verification: "unavailable" };
  }
}
