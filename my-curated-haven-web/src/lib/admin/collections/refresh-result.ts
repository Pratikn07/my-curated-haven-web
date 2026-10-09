export type RefreshResult = { operationId: string; state: "complete" | "pending" };

/**
 * Runs one public refresh for a publication that has already committed. A failure only leaves the refresh
 * pending: the publication is never relabelled as failed, and a retry refreshes without publishing again.
 */
export async function settleCollectionRefresh(operationId: string, run: () => Promise<void>): Promise<RefreshResult> {
  try {
    await run();
    return { operationId, state: "complete" };
  } catch {
    return { operationId, state: "pending" };
  }
}
