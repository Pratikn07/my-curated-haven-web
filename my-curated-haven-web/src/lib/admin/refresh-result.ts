import type { RefreshReceipt } from "./contracts";

export async function settleCommittedRefresh(
  operationId: string,
  refresh: () => Promise<void>
): Promise<RefreshReceipt> {
  try {
    await refresh();
    return { operationId, state: "complete" };
  } catch {
    return { operationId, state: "pending" };
  }
}
