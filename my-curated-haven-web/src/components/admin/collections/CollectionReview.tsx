"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { CollectionDetail, CollectionRevision, ReviewCollectionCommand } from "@/lib/admin/collections/contracts";
import {
  raiseCollectionIssueAction, reviewCollectionAction, submitCollectionAction,
} from "@/lib/admin/collections/actions";
import { formatUtc } from "@/lib/admin/collections/labels";

const subscribeHydration = () => () => {};

const ISSUE_CODES: { code: string; label: string }[] = [
  { code: "COPY", label: "Words on the page" },
  { code: "RECIPE_FIT", label: "A recipe does not fit" },
  { code: "ORDER", label: "Recipe order" },
  { code: "COVER", label: "Cover or cloth" },
  { code: "PLACEMENT", label: "Shelf, ages or series" },
  { code: "OTHER", label: "Something else" },
];

const DECISION_LABELS = { approve: "Approved", changes_requested: "Changes requested", reject: "Rejected" } as const;

function failure(result: { ok: false; code: string; reference: string }): string {
  if (result.code === "CONFLICT") return "The draft or its evidence changed since you opened this page. Reload and review it again.";
  if (result.code === "BLOCKED") return "This cannot go ahead while a check is failing or unknown, or a blocking issue is open.";
  if (result.code === "DENIED") return "You do not have permission for this step.";
  if (result.code === "DISABLED") return "Collection review is switched off in this console.";
  return `This did not go through (${result.code}, reference ${result.reference}). Try again.`;
}

export default function CollectionReview({ detail, working, canEdit, canReview }: {
  detail: CollectionDetail;
  working: CollectionRevision;
  canEdit: boolean;
  canReview: boolean;
}) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [resolved, setResolved] = useState<string[]>([]);
  const [issue, setIssue] = useState({ code: "COPY", field: "", severity: "blocker" as "blocker" | "suggestion", explanation: "" });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const impactToken = detail.impact.ok ? detail.impact.value.token : null;
  const exact = { collectionId: detail.collectionId, revisionId: working.id, expectedVersion: working.version,
    expectedDigest: working.digest };
  const openIssues = detail.review.issues.filter((i) => !i.resolved);
  const openBlockers = openIssues.filter((i) => i.severity === "blocker");
  const resolvable = openIssues.filter((i) => i.origin === "human" || i.origin === "import" || i.origin === "ai");
  const ready = detail.readiness.readyForApproval && impactToken !== null;
  const unresolvedBlockers = openBlockers.filter((i) => !resolved.includes(i.id));

  async function run(action: () => Promise<{ ok: true } | { ok: false; code: string; reference: string }>,
    done: string): Promise<boolean> {
    setPending(true);
    setMessage(null);
    const result = await action();
    setPending(false);
    if (!result.ok) {
      // A failed attempt keeps its operation id and the form, so a retry cannot record twice.
      setMessage(failure(result));
      return false;
    }
    setMessage(done);
    setReason("");
    setResolved([]);
    setOperationId(crypto.randomUUID());
    router.refresh();
    return true;
  }

  function decide(decision: ReviewCollectionCommand["decision"]) {
    if (!detail.review.submission || !impactToken) return;
    void run(() => reviewCollectionAction({ ...exact, operationId, reason: reason.trim(), impactToken,
      submissionId: detail.review.submission!.id, decision, resolvedIssueIds: resolved }),
    decision === "approve" ? "Approved. This exact revision can now be published." : `${DECISION_LABELS[decision]}.`);
  }

  const disabled = !hydrated || pending;
  return (
    <section aria-labelledby="collection-review" className="admin-collection__section admin-collection-review">
      <h2 id="collection-review">Review</h2>
      <p role="status" aria-label="Review status" aria-live="polite">{message ?? ""}</p>

      {working.state === "draft" || working.state === "changes_requested" ? (
        canEdit ? <div className="admin-collection__review-step">
          <p>{ready ? "This exact revision is ready to submit for review."
            : "Fix the items under Readiness before submitting."}</p>
          <label>Note for the reviewer<input value={reason} maxLength={1000} disabled={disabled}
            onChange={(e) => setReason(e.target.value)} /></label>
          <button type="button" disabled={disabled || !ready || reason.trim().length === 0}
            onClick={() => impactToken && run(() => submitCollectionAction({ ...exact, operationId, reason: reason.trim(), impactToken }),
              "Submitted for review.")}>Submit for review</button>
        </div> : <p>Waiting for an editor to submit this draft.</p>
      ) : null}

      {working.state === "submitted" ? <>
        <p>Submitted{detail.review.submission?.submittedBy ? ` by ${detail.review.submission.submittedBy}` : ""}
          {detail.review.submission ? ` at ${formatUtc(detail.review.submission.submittedAt)}` : ""}.
          {detail.review.submission?.reason ? ` Note: ${detail.review.submission.reason}` : ""}</p>
        {openIssues.length > 0 ? <div>
          <h3>Open issues</h3>
          <ul>{openIssues.map((i) => <li key={i.id}>
            <strong>{i.severity === "blocker" ? "Blocks approval" : "Suggestion"}:</strong> {i.explanation}
            {i.field ? ` (${i.field})` : ""} <span className="admin-collection__note">raised by {i.raisedBy ?? "an earlier check"}</span>
          </li>)}</ul>
        </div> : null}
        {canReview ? <>
          <fieldset className="admin-collection__review-step" disabled={disabled}>
            <legend>Raise an issue</legend>
            <label>Topic<select value={issue.code} onChange={(e) => setIssue({ ...issue, code: e.target.value })}>
              {ISSUE_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select></label>
            <label>Where (optional)<input value={issue.field} maxLength={80} onChange={(e) => setIssue({ ...issue, field: e.target.value })} /></label>
            <label>Effect<select value={issue.severity} onChange={(e) => setIssue({ ...issue, severity: e.target.value as "blocker" | "suggestion" })}>
              <option value="blocker">Blocks approval</option><option value="suggestion">Suggestion</option>
            </select></label>
            <label>What needs to change<textarea value={issue.explanation} maxLength={1000} rows={2}
              onChange={(e) => setIssue({ ...issue, explanation: e.target.value })} /></label>
            <button type="button" disabled={issue.explanation.trim().length === 0}
              onClick={() => run(() => raiseCollectionIssueAction({ ...exact, operationId, reason: "Review issue", code: issue.code,
                field: issue.field.trim() || null, severity: issue.severity, explanation: issue.explanation.trim() }), "Issue recorded.")
                .then((ok) => { if (ok) setIssue({ ...issue, field: "", explanation: "" }); })}>Record issue</button>
          </fieldset>
          <fieldset className="admin-collection__review-step" disabled={disabled}>
            <legend>Decision on revision {working.version}</legend>
            {resolvable.length > 0 ? <div role="group" aria-label="Issues this decision resolves">
              {resolvable.map((i) => <label key={i.id} className="admin-library__check"><input type="checkbox"
                checked={resolved.includes(i.id)} onChange={(e) => setResolved(e.target.checked
                  ? [...resolved, i.id] : resolved.filter((x) => x !== i.id))} />Resolved: {i.explanation}</label>)}
            </div> : null}
            <label>Reason for your decision<input value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} /></label>
            <div className="admin-collection__save-actions">
              <button type="button" disabled={!ready || unresolvedBlockers.length > 0 || reason.trim().length === 0}
                onClick={() => decide("approve")}>Approve this revision</button>
              <button type="button" disabled={reason.trim().length === 0} onClick={() => decide("changes_requested")}>Request changes</button>
              <button type="button" disabled={reason.trim().length === 0} onClick={() => decide("reject")}>Reject</button>
            </div>
            {!ready ? <p className="admin-collection__note">Approval needs every check under Readiness to pass.</p>
              : unresolvedBlockers.length > 0 ? <p className="admin-collection__note">Resolve the blocking issues above to approve.</p> : null}
          </fieldset>
        </> : <p>Waiting for a reviewer.</p>}
      </> : null}

      {working.state === "approved" ? <p>Approved. This exact revision, {working.version}, can be published. Any further edit needs another review.</p> : null}
      {working.state === "rejected" ? <p>Rejected. Edit the draft to prepare a different revision, or discard it.</p> : null}

      {detail.review.decisions.length > 0 ? <div>
        <h3>Decisions</h3>
        <ul>{detail.review.decisions.map((d) => <li key={d.id}>
          <strong>{DECISION_LABELS[d.decision]}</strong> revision {d.version} by {d.decidedBy ?? "staff"} · {formatUtc(d.decidedAt)}
          <p className="admin-collection__note">Reason: {d.reason}</p>
        </li>)}</ul>
      </div> : null}
    </section>
  );
}
