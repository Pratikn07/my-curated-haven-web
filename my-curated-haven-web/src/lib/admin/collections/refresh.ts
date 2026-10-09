import "server-only";
import { revalidatePath } from "next/cache";
import { getCommercePool } from "@/lib/payments/repository";
import type { Result } from "../contracts";
import { adminRpc } from "../rpc";
import { createClient } from "../../supabase/server";
import type { CollectionReceipt } from "./contracts";
import { settleCollectionRefresh, type RefreshResult } from "./refresh-result";

/**
 * Refreshes the pages of one committed publication. Its job and paths were written in the publication's own
 * transaction; this claims exactly that job with a lease, revalidates only the stored paths and finishes it.
 * The worker procedures are reachable only through the server's database pool, never from a browser.
 */
async function runRefreshJob(operationId: string): Promise<void> {
  const pool = getCommercePool();
  const { rows } = await pool.query("SELECT private.collection_refresh_claim($1) AS job", [operationId]);
  const job = rows[0]?.job as { leaseToken: string; paths: string[] } | null;
  if (!job) {
    const { rows: state } = await pool.query("SELECT state FROM private.collection_refresh_jobs WHERE operation_id=$1", [operationId]);
    if (state[0]?.state === "complete") return;
    throw new Error("refresh job is leased, missing or out of attempts");
  }
  try {
    for (const path of job.paths) revalidatePath(path);
  } catch (error) {
    await pool.query("SELECT private.collection_refresh_finish($1,$2,'revalidate-failed')", [operationId, job.leaseToken])
      .catch(() => undefined);
    throw error;
  }
  await pool.query("SELECT private.collection_refresh_finish($1,$2,NULL)", [operationId, job.leaseToken]);
}

async function settle(operationId: string): Promise<RefreshResult> {
  const result = await settleCollectionRefresh(operationId, () => runRefreshJob(operationId));
  if (result.state === "pending") console.error("[collections] public refresh pending", { operationId });
  return result;
}

/** Runs straight after a publication commits. A no-change receipt created no job and needs no refresh. */
export async function refreshCollectionPublication(receipt: CollectionReceipt): Promise<RefreshResult> {
  if (receipt.noChange) return { operationId: receipt.operationId, state: "complete" };
  return settle(receipt.operationId);
}

/**
 * Manual retry of a stored refresh. The caller must still be allowed to publish this collection, and the job
 * must belong to it; the paths come from the job, and the publication RPC is never called again.
 */
export async function retryCollectionRefresh(collectionId: string, operationId: string): Promise<Result<RefreshResult>> {
  const supabase = await createClient();
  const allowed = await adminRpc(() => supabase.rpc("admin_collection_refresh_allowed", { p_collection_id: collectionId,
    p_operation_id: operationId }), (data) => data === true, true);
  if (!allowed.ok) return allowed;
  if (!allowed.value) return { ok: false, code: "NOT_FOUND", reference: "collection-refresh" };
  return { ok: true, value: await settle(operationId) };
}
