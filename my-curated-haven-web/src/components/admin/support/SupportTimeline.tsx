"use client";

import { useState } from "react";
import type { SupportHistoryPage, TimelineEvent } from "@/lib/admin/support/contracts";
import { supportHistoryAction } from "@/lib/admin/support/actions";
import { formatUtc } from "@/lib/admin/collections/labels";

const EVENT_LABELS: Record<string, string> = {
  CASE_CREATE: "Case opened", CASE_APPEND_NOTE: "Note added", CASE_AMEND_NOTE: "Note corrected",
  CASE_SET_STATE: "Case moved", CASE_REDACT_NOTE: "Note redacted",
};

/** What happened on this order, newest first. Redacted notes stay redacted. */
export default function SupportTimeline({ orderId, initial }: { orderId: string; initial: SupportHistoryPage }) {
  const [events, setEvents] = useState<TimelineEvent[]>(initial.events);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [status, setStatus] = useState<string | null>(null);

  async function more() {
    if (!cursor) return;
    const result = await supportHistoryAction(orderId, cursor);
    if (!result.ok) { setStatus(`Older activity is unavailable (${result.code}). Try again.`); return; }
    setEvents((current) => [...current, ...result.value.events]);
    setCursor(result.value.nextCursor);
  }

  return (
    <section aria-labelledby="support-timeline" className="admin-collection__section">
      <h2 id="support-timeline">Activity</h2>
      {events.length === 0 ? <p>No support activity on this order yet.</p>
        : <ol className="admin-support__timeline">
          {events.map((event) => <li key={event.id}>
            <span>{EVENT_LABELS[event.code] ?? event.code}</span>
            <span> · {formatUtc(event.at)}{event.actorLabel ? ` · ${event.actorLabel}` : ""}</span>
            {event.note !== null ? <p>{event.note}</p> : event.code === "CASE_APPEND_NOTE" || event.code === "CASE_AMEND_NOTE"
              ? <p className="admin-collection__note">Note text redacted.</p> : null}
          </li>)}
        </ol>}
      {cursor ? <button type="button" onClick={more}>Show older activity</button> : null}
      {status ? <p role="status">{status}</p> : null}
    </section>
  );
}
