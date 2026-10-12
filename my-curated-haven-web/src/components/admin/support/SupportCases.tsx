"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { CaseCategory, CaseCommand, CaseState, OrderCase, OrderCasesPage } from "@/lib/admin/support/contracts";
import type { Result } from "@/lib/admin/contracts";
import { supportCaseAction } from "@/lib/admin/support/actions";
import { CASE_CATEGORY_LABELS, CASE_STATE_LABELS } from "@/lib/admin/support/labels";

const subscribeHydration = () => () => {};

function failure(code: string): string {
  if (code === "CONFLICT") return "Someone else changed this case. The page has been refreshed; check it and try again.";
  if (code === "BLOCKED") return "Notes are off until the owner sets how long they are kept.";
  if (code === "INVALID") return "That change isn't allowed for this case. A resolved case needs the outcome recorded.";
  if (code === "DENIED") return "You don't have permission to change cases.";
  return `Not saved (${code}). Try again.`;
}

/** Cases on this order. Changing a case never changes access, payments or the order. */
export default function SupportCases({ orderId, cases, canWrite }: {
  orderId: string; cases: Result<OrderCasesPage>; canWrite: boolean;
}) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const router = useRouter();
  const [category, setCategory] = useState<CaseCategory>("missing_access");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const notesEnabled = cases.ok && cases.value.notesEnabled;

  async function send(command: Omit<CaseCommand, "operationId" | "orderId" | "userId">) {
    setPending(true);
    setStatus(null);
    const result = await supportCaseAction({ ...command, operationId: crypto.randomUUID(), orderId, userId: null });
    setPending(false);
    if (!result.ok) { setStatus(failure(result.code)); if (result.code === "CONFLICT") router.refresh(); return; }
    setStatus(`Saved. Case is ${CASE_STATE_LABELS[result.value.state].toLowerCase()}.`);
    router.refresh();
  }

  return (
    <section aria-labelledby="support-cases" className="admin-collection__section">
      <h2 id="support-cases">Cases</h2>
      {!cases.ok ? <p role="status">Cases are unavailable ({cases.code}). This is not an empty list.</p>
        : cases.value.cases.length === 0 ? <p>No cases on this order.</p>
        : <ul className="admin-support__cases">
          {cases.value.cases.map((item) => <CaseRow key={item.id} item={item} canWrite={canWrite && hydrated && !pending}
            notesEnabled={notesEnabled} onSend={send} />)}
        </ul>}
      {canWrite ? <form onSubmit={(e) => { e.preventDefault(); void send({ caseId: null, expectedVersion: null, action: "create",
        category, note: null, amendsEventId: null, state: "open", resolutionReference: null }); }}>
        <label htmlFor="support-case-category">New case about</label>
        <select id="support-case-category" value={category} disabled={!hydrated || pending}
          onChange={(e) => setCategory(e.target.value as CaseCategory)}>
          {Object.entries(CASE_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="submit" disabled={!hydrated || pending}>Open case</button>
      </form> : null}
      {cases.ok && !notesEnabled && canWrite ? <p className="admin-collection__note">Notes are off until the owner sets how long they are kept.</p> : null}
      <p role="status" aria-label="Case status">{status ?? ""}</p>
    </section>
  );
}

function CaseRow({ item, canWrite, notesEnabled, onSend }: {
  item: OrderCase; canWrite: boolean; notesEnabled: boolean;
  onSend: (command: Omit<CaseCommand, "operationId" | "orderId" | "userId">) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [next, setNext] = useState<CaseState>(item.state === "resolved" ? "open" : "investigating");
  const [outcome, setOutcome] = useState("");
  const base = { caseId: item.id, expectedVersion: item.version, category: item.category, amendsEventId: null };
  return (
    <li>
      <p><strong>{CASE_CATEGORY_LABELS[item.category]}</strong> · {CASE_STATE_LABELS[item.state]}
        {item.resolutionReference ? ` · Outcome: ${item.resolutionReference}` : ""}</p>
      {canWrite && notesEnabled ? <form onSubmit={(e) => { e.preventDefault(); void onSend({ ...base, action: "append_note", note,
        state: item.state, resolutionReference: null }).then(() => setNote("")); }}>
        <label htmlFor={`note-${item.id}`}>Add a note</label>
        <textarea id={`note-${item.id}`} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" disabled={note.trim().length === 0}>Add note</button>
      </form> : null}
      {canWrite ? <form onSubmit={(e) => { e.preventDefault(); void onSend({ ...base, action: "set_state", note: null, state: next,
        resolutionReference: next === "resolved" ? outcome : null }); }}>
        <label htmlFor={`state-${item.id}`}>Move to</label>
        <select id={`state-${item.id}`} value={next} onChange={(e) => setNext(e.target.value as CaseState)}>
          {Object.entries(CASE_STATE_LABELS).filter(([value]) => value !== item.state)
            .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        {next === "resolved" ? <>
          <label htmlFor={`outcome-${item.id}`}>Outcome (what was done, or what the customer still needs to do)</label>
          <input id={`outcome-${item.id}`} value={outcome} maxLength={1000} onChange={(e) => setOutcome(e.target.value)} />
        </> : null}
        <button type="submit" disabled={next === "resolved" && outcome.trim().length === 0}>Move case</button>
      </form> : null}
    </li>
  );
}
