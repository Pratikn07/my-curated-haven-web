"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminContext,
  RecipeDetail,
} from "@/lib/admin/contracts";
import type { ReviewState } from "@/lib/admin/recipes";
import {
  loadReviewStateAction,
  recordIssueAction,
  refreshDraftAction,
  reviewRevisionAction,
  submitRevisionAction,
} from "@/lib/admin/actions";

const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

export default function AdminRecipeReview({
  detail: initialDetail,
  context,
  onChanged,
}: {
  detail: RecipeDetail;
  context: AdminContext;
  onChanged?: (detail: RecipeDetail) => void;
}) {
  const router = useRouter();
  const [localDetail, setLocalDetail] = useState({ source: initialDetail, value: initialDetail });
  const detail = localDetail.source === initialDetail ? localDetail.value : initialDetail;
  function setDetail(next: RecipeDetail) {
    setLocalDetail({ source: initialDetail, value: next });
  }
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);
  const [reason, setReason] = useState("");
  const [issueCode, setIssueCode] = useState("");
  const [issueField, setIssueField] = useState("");
  const [issueSeverity, setIssueSeverity] = useState<"blocker" | "suggestion">("blocker");
  const [issueExplanation, setIssueExplanation] = useState("");
  const [resolved, setResolved] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);

  const working = detail.working;
  const workingId = working?.id;
  const workingState = working?.state;
  const canEdit = context.operator.permissions.includes("recipe.edit");
  const canReview = context.operator.permissions.includes("recipe.review");

  async function reload(recipeId: string) {
      const fresh = await refreshDraftAction(recipeId);
      if (!fresh.ok) {
        router.refresh();
        return false;
      }
      const next = fresh.value as RecipeDetail;
      const state = next.working ? await loadReviewStateAction(next.working.id) : null;
      if (state && !state.ok) {
        router.refresh();
        return false;
      }
      setDetail(next);
      setReviewState(state?.ok ? (state.value as ReviewState) : null);
      onChanged?.(next);
      if (!onChanged) router.refresh();
      return true;
  }

  useEffect(() => {
    if (!workingId) return;
    let cancelled = false;
    void loadReviewStateAction(workingId).then((state) => {
      if (!cancelled && state.ok) setReviewState(state.value as ReviewState);
    });
    return () => {
      cancelled = true;
    };
  }, [workingId, workingState]);

  async function submit() {
    if (!working) return;
    setPending(true);
    const result = await submitRevisionAction({
      operationId: crypto.randomUUID(),
      recipeId: detail.active.recipeId,
      reason: "Submitted for review",
      revisionId: working.id,
      expectedVersion: working.version,
      expectedDigest: working.digest,
    });
    const refreshed = result.ok ? await reload(detail.active.recipeId) : false;
    setPending(false);
    setStatus(result.ok
      ? refreshed ? "Awaiting review" : "Submission saved. Refresh the page to see its current review state."
      : `Submit failed (${result.code}).`);
  }

  async function recordIssue() {
    if (!working) return;
    setPending(true);
    const result = await recordIssueAction({
      operationId: crypto.randomUUID(),
      recipeId: detail.active.recipeId,
      reason: "Reviewer note",
      revisionId: working.id,
      expectedDigest: working.digest,
      code: issueCode.trim(),
      field: issueField.trim() || null,
      severity: issueSeverity,
      explanation: issueExplanation.trim(),
    });
    if (result.ok) {
      setIssueCode("");
      setIssueField("");
      setIssueExplanation("");
      const refreshed = await reload(detail.active.recipeId);
      setStatus(refreshed ? "Issue recorded." : "Issue recorded. Refresh the page to see current issues.");
    } else {
      setStatus(`Issue not recorded (${result.code}).`);
    }
    setPending(false);
  }

  async function decide(decision: "approve" | "changes_requested" | "reject") {
    if (!working || !reviewState?.submission) return;
    setPending(true);
    const result = await reviewRevisionAction({
      operationId: crypto.randomUUID(),
      recipeId: detail.active.recipeId,
      reason: reason.trim(),
      revisionId: working.id,
      expectedVersion: working.version,
      expectedDigest: working.digest,
      submissionId: reviewState.submission.id,
      decision,
      resolvedIssueIds: resolved,
    });
    if (result.ok) {
      setResolved([]);
      const refreshed = await reload(detail.active.recipeId);
      setStatus(refreshed
        ? decision === "approve"
          ? "This revision is approved and ready to publish."
          : `Decision recorded: ${decision}.`
        : "Decision recorded. Refresh the page to see its current review state.");
    } else {
      setStatus(`Decision failed (${result.code}). Reload and retry on the current revision.`);
    }
    setPending(false);
  }

  const submission = reviewState?.submission ?? null;
  const openBlockers = (reviewState?.issues ?? []).filter((i) => i.severity === "blocker" && !i.resolved);
  const canSubmit = working !== null && ["draft", "changes_requested", "rejected"].includes(working.state);
  const canReviewCurrentSubmission = canReview && working?.state === "submitted" && submission !== null;
  const reviewStateLabel = working
    ? `Version ${working.version} · ${working.digest.slice(0, 12)} · ${working.state}`
    : "No working revision";

  if (!working) {
    return <section aria-label="Review and approval" className="admin-review">
      <h2>Review and approval</h2>
      <p>No working revision yet. Start a private edit before requesting review.</p>
    </section>;
  }

  return (
    <section aria-label="Review and approval" className="admin-review">
      <h2>Review and approval</h2>
      <p>{reviewStateLabel}</p>
      {submission ? (
        <p>
          Submitted by {submission.submittedBy} at {submission.submittedAt}
        </p>
      ) : null}

      <h3>Readiness</h3>
      <ul className="admin-review__checks">
        {detail.readiness.checks.map((check) => (
          <li key={check.code}>
            {check.code}: {check.state} — {check.explanation}
          </li>
        ))}
      </ul>

      {canEdit && canSubmit ? (
        <button type="button" onClick={submit} disabled={pending || !hydrated}>
          Submit for review
        </button>
      ) : null}
      {working.state === "submitted" ? <p>Awaiting reviewer decision.</p> : null}
      {working.state === "approved" ? <p>Approved and ready for publication.</p> : null}

      <h3>Issues</h3>
      <ul className="admin-review__issues">
        {(reviewState?.issues ?? []).map((issue) => (
          <li key={issue.id}>
            <span>
              [{issue.severity}] {issue.code}
              {issue.field ? ` (${issue.field})` : ""}: {issue.explanation}
              {issue.resolved ? " — resolved" : ""}
            </span>
            {!issue.resolved && canReview ? (
              <label>
                <input
                  type="checkbox"
                  aria-label={`Resolve ${issue.code.replace(/-/g, " ")} issue`}
                  checked={resolved.includes(issue.id)}
                  disabled={!hydrated}
                  onChange={(e) =>
                    setResolved((prev) =>
                      e.target.checked ? [...prev, issue.id] : prev.filter((id) => id !== issue.id)
                    )
                  }
                />
                Resolve {issue.code} issue
              </label>
            ) : null}
          </li>
        ))}
      </ul>

      {canReviewCurrentSubmission ? (
        <div className="admin-review__form">
          <h3>Record issue</h3>
          <label htmlFor="issue-code">Issue code</label>
          <input id="issue-code" value={issueCode} onChange={(e) => setIssueCode(e.target.value)} disabled={!hydrated} />
          <label htmlFor="issue-field">Field (optional)</label>
          <input
            id="issue-field"
            value={issueField}
            onChange={(e) => setIssueField(e.target.value)}
            disabled={!hydrated}
          />
          <label htmlFor="issue-severity">Severity</label>
          <select
            id="issue-severity"
            value={issueSeverity}
            onChange={(e) => setIssueSeverity(e.target.value as "blocker" | "suggestion")}
            disabled={!hydrated}
          >
            <option value="blocker">Blocker</option>
            <option value="suggestion">Suggestion</option>
          </select>
          <label htmlFor="issue-explanation">Explanation</label>
          <input
            id="issue-explanation"
            value={issueExplanation}
            onChange={(e) => setIssueExplanation(e.target.value)}
            disabled={!hydrated}
          />
          <button
            type="button"
            onClick={recordIssue}
            disabled={!hydrated || pending || issueCode.trim().length === 0 || issueExplanation.trim().length === 0}
          >
            Record issue
          </button>
        </div>
      ) : null}

      {canReviewCurrentSubmission ? (
        <div className="admin-review__form">
          <h3>Decision</h3>
          <label htmlFor="review-reason">Review reason</label>
          <input id="review-reason" value={reason} onChange={(e) => setReason(e.target.value)} disabled={!hydrated} />
          <div className="admin-review__buttons">
            <button
              type="button"
              onClick={() => decide("approve")}
              disabled={!hydrated || pending || reason.trim().length === 0 || !canReviewCurrentSubmission}
            >
              Approve this revision
            </button>
            <button
              type="button"
              onClick={() => decide("changes_requested")}
              disabled={!hydrated || pending || reason.trim().length === 0 || !canReviewCurrentSubmission}
            >
              Request changes
            </button>
            <button
              type="button"
              onClick={() => decide("reject")}
              disabled={!hydrated || pending || reason.trim().length === 0 || !canReviewCurrentSubmission}
            >
              Reject
            </button>
          </div>
          {openBlockers.length > 0 ? (
            <p>
              {openBlockers.length} blocker(s) remain open; approval needs every blocker resolved.
            </p>
          ) : null}
        </div>
      ) : !canReview ? (
        <p>Review decisions require the reviewer permission.</p>
      ) : working.state !== "approved" ? (
        <p>Submit the current revision before recording a review decision.</p>
      ) : null}

      {status ? (
        <p role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
    </section>
  );
}
