"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startCollectionDraftAction } from "@/lib/admin/collections/actions";

/** The workspace's next step for an editor: open the existing draft, or prepare one from what is live. */
export default function CollectionDraftActions({ collectionId, hasDraft, hasPublication, canPublish, returnTo }: {
  collectionId: string;
  hasDraft: boolean;
  hasPublication: boolean;
  canPublish: boolean;
  returnTo: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [operationId] = useState(() => crypto.randomUUID());
  const router = useRouter();
  const editHref = `/admin/collections/${collectionId}/edit?returnTo=${encodeURIComponent(returnTo)}`;

  async function prepare() {
    setPending(true);
    setMessage(null);
    const result = await startCollectionDraftAction({ collectionId, operationId, reason: "Prepare update" });
    if (result.ok || result.code === "CONFLICT") {
      router.push(editHref);
      return;
    }
    setPending(false);
    setMessage(`Could not prepare a draft (${result.code}, reference ${result.reference}). Try again.`);
  }

  if (hasDraft) return <div className="admin-workspace-action">
    <Link href={editHref}>Edit private draft</Link>
    <Link href={`/admin/collections/${collectionId}/preview?returnTo=${encodeURIComponent(returnTo)}`}>Preview &amp; changes</Link>
    {canPublish ? <Link href={`/admin/collections/${collectionId}/publish?returnTo=${encodeURIComponent(returnTo)}`}>Review and publish</Link> : null}
  </div>;
  if (!hasPublication) return <p>This collection has nothing published to start from.</p>;
  return <div className="admin-workspace-action">
    <p>Prepare a private draft from what is live. Nothing changes for visitors or buyers until it is published.</p>
    <button type="button" onClick={prepare} disabled={pending}>{pending ? "Preparing update" : "Prepare update"}</button>
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
