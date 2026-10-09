"use client";

import { useState } from "react";
import type { CollectionReceipt } from "@/lib/admin/collections/contracts";
import { retryCollectionRefreshAction } from "@/lib/admin/collections/actions";
import { formatUtc } from "@/lib/admin/collections/labels";

function retryFailure(result: { code: string; reference: string }): string {
  if (result.code === "DENIED") return "You can no longer publish this collection, so you cannot refresh its pages. Ask someone who can.";
  if (result.code === "DISABLED") return "Collection publication is switched off, so its pages cannot be refreshed from here.";
  if (result.code === "NOT_FOUND") return "That publication has no refresh to run.";
  return `The refresh did not run (${result.code}, reference ${result.reference}). Try again.`;
}

/**
 * Committed publications with their public refresh state. The publication and its refresh are separate facts:
 * a pending refresh never means the publication failed, and retrying refreshes only, it never publishes again.
 */
export default function CollectionReceipts({ collectionId, receipts, canRetry }: {
  collectionId: string;
  receipts: CollectionReceipt[];
  canRetry: boolean;
}) {
  const [refreshed, setRefreshed] = useState<Set<string>>(() => new Set());
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function retry(operationId: string) {
    setPending(operationId);
    setMessage(null);
    const result = await retryCollectionRefreshAction(collectionId, operationId);
    setPending(null);
    if (!result.ok) {
      setMessage(retryFailure(result));
      return;
    }
    if (result.value.state === "complete") {
      setRefreshed((current) => new Set(current).add(operationId));
      setMessage("Public pages updated.");
    } else {
      setMessage("The refresh is still pending. The publication is committed; try again shortly.");
    }
  }

  if (receipts.length === 0) return null;
  return <section aria-labelledby="collection-receipts" className="admin-collection__section admin-collection-receipts">
    <h2 id="collection-receipts">Publications</h2>
    <p role="status" aria-label="Refresh status" aria-live="polite">{message ?? ""}</p>
    <ol>
      {receipts.map((receipt) => {
        const complete = receipt.refreshState === "complete" || refreshed.has(receipt.operationId);
        return <li key={receipt.operationId}>
          <p><strong>Revision {receipt.version} published</strong> <time dateTime={receipt.committedAt}>{formatUtc(receipt.committedAt)}</time></p>
          <dl className="admin-collection__facts">
            <div><dt>Publication</dt><dd><code>{receipt.publicationId}</code></dd></div>
            <div><dt>Release</dt><dd>{receipt.releaseId ? <code>{receipt.releaseId}</code> : "None"}</dd></div>
            <div><dt>Public pages</dt><dd>{complete ? "Updated" : "Refresh pending"}</dd></div>
          </dl>
          {!complete ? <>
            <p className="admin-collection__note">The publication is committed. Some public pages may show the earlier version until they refresh.</p>
            {canRetry ? <button type="button" disabled={pending !== null} onClick={() => retry(receipt.operationId)}>
              {pending === receipt.operationId ? "Refreshing" : "Retry refresh"}</button> : null}
          </> : null}
        </li>;
      })}
    </ol>
  </section>;
}
