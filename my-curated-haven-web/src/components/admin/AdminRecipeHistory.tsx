"use client";

import { useState } from "react";
import type { AuditEvent, HistoryPage } from "@/lib/admin/contracts";
import { loadHistoryAction } from "@/lib/admin/actions";

const LABELS: Record<string, string> = {
  "draft.start": "Working draft started",
  "draft.save": "Working draft saved",
  "draft.rebase": "Working draft rebased",
  "revision.submit": "Revision submitted for review",
  "revision.review": "Review decision recorded",
  "revision.publish": "Revision published",
  "recipe.publish": "Recipe published",
  "recipe.withdraw": "Recipe withdrawn",
  "asset.check": "Image availability checked",
};

function label(event: AuditEvent): string {
  return LABELS[event.action] ?? event.action.replaceAll(".", " ");
}

export default function AdminRecipeHistory({ recipeId, initial }: { recipeId: string; initial: HistoryPage }) {
  const [events, setEvents] = useState(initial.events);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOlder() {
    if (!cursor || pending) return;
    setPending(true);
    setError(null);
    const result = await loadHistoryAction(recipeId, cursor);
    setPending(false);
    if (!result.ok) {
      setError(`Older history unavailable (${result.code}). Try again.`);
      return;
    }
    setEvents((current) => {
      const known = new Set(current.map((item) => item.id));
      return [...current, ...result.value.events.filter((item) => !known.has(item.id))];
    });
    setCursor(result.value.nextCursor);
  }

  return <section aria-label="History" className="admin-history">
    <h2>History</h2>
    {events.length === 0 ? <p>No recipe workspace changes recorded yet.</p> : <ol>
      {events.map((event) => <li key={event.id}>
        <strong>{label(event)}</strong>
        <span> by {event.actorEmail ?? `operator ${event.actorId.slice(0, 8)}`}</span>
        <time dateTime={event.at}> · {new Date(event.at).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })}</time>
        <span> · {event.result}</span>
        {event.reason ? <p>Reason: {event.reason}</p> : null}
      </li>)}
    </ol>}
    {cursor ? <button type="button" onClick={loadOlder} disabled={pending}>{pending ? "Loading history" : "Load older history"}</button> : null}
    {error ? <p role="status">{error}</p> : null}
  </section>;
}
