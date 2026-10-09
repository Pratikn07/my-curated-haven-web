"use client";

import { useState } from "react";
import type { CollectionEvent } from "@/lib/admin/collections/contracts";
import { loadCollectionHistoryAction } from "@/lib/admin/collections/actions";
import { formatUtc } from "@/lib/admin/collections/labels";

const LABELS: Record<string, string> = {
  "collection.import": "Imported from site configuration",
  "collection.save": "Private draft saved",
  "collection.start": "Private draft started",
  "collection.submit": "Submitted for review",
  "collection.review": "Review decision recorded",
  "collection.publish": "Published",
  "collection.discard": "Private draft discarded",
};

function label(event: CollectionEvent): string {
  return LABELS[event.action] ?? event.action.replaceAll(".", " ");
}

function who(event: CollectionEvent): string {
  const authoriser = event.authoriserEmail ?? (event.humanAuthoriser ? `staff ${event.humanAuthoriser.slice(0, 8)}` : null);
  if (event.executorType === "operator") {
    return authoriser ? `${event.executor}, authorised by ${authoriser}` : event.executor;
  }
  return authoriser ?? `staff ${event.executor.slice(0, 8)}`;
}

export default function CollectionHistory({ collectionId, initial, initialCursor }: {
  collectionId: string;
  initial: CollectionEvent[];
  initialCursor: string | null;
}) {
  const [events, setEvents] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOlder() {
    if (!cursor || pending) return;
    setPending(true);
    setError(null);
    const result = await loadCollectionHistoryAction(collectionId, cursor);
    setPending(false);
    if (!result.ok) {
      setError(`Older history unavailable (${result.code}, reference ${result.reference}). Try again.`);
      return;
    }
    setEvents((current) => {
      const known = new Set(current.map((item) => item.id));
      return [...current, ...result.value.events.filter((item) => !known.has(item.id))];
    });
    setCursor(result.value.nextCursor);
  }

  return <section aria-labelledby="collection-history" className="admin-history">
    <h2 id="collection-history">History</h2>
    {events.length === 0 ? <p>No collection changes recorded yet.</p> : <ol>
      {events.map((event) => <li key={event.id}>
        <strong>{label(event)}</strong>
        <span> by {who(event)}</span>
        <time dateTime={event.at}> · {formatUtc(event.at)}</time>
        {event.reason ? <p>Reason: {event.reason}</p> : null}
      </li>)}
    </ol>}
    {cursor ? <button type="button" onClick={loadOlder} disabled={pending}>{pending ? "Loading history" : "Load older history"}</button> : null}
    {error ? <p role="status">{error}</p> : null}
  </section>;
}
