"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function AdminRecipeReview({
  detail: initialDetail,
  context,
  onChanged,
}: {
  detail: RecipeDetail;
  context: AdminContext;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialDetail);
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);
  const [reason, setReason] = useState("");
  const [issueCode, setIssueCode] = useState("");
  const [issueField, setIssueField] = useState("");
  const [issueSeverity, setIssueSeverity] = useState<"blocker" | "suggestion">("blocker");
  const [issueExplanation, setIssueExplanation] = useState("");
  const [resolved, setResolved] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const working = detail.working;
  const canEdit = context.operator.permissions.includes("recipe.edit");
  const canReview = context.operator.permissions.includes("recipe.review");

  const reload = useCallback(
    async (recipeId: string) => {
      const fresh = await refreshDraftAction(recipeId);
      if (fresh.ok) setDetail(fresh.value as RecipeDetail);
      const target = (fresh.ok ? (fresh.value as RecipeDetail).working : working) ?? working;
      if (target) {
        const state = await loadReviewStateAction(target.id);
        if (state.ok) setReviewState(state.value as ReviewState);
      }
      onChanged?.();
      router.refresh();
    },
    [onChanged, router, working]
  );

  useEffect(() => {
    if (!working) return;
    let cancelled = false;
    void loadReviewStateAction(working.id).then((state) => {
      if (!cancelled && state.ok) setReviewState(state.value as ReviewState);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [working?.id]);

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
    setPending(false);
    setStatus(result.ok ? "Awaiting review" : `Submit failed (${result.code}).`);
    if (result.ok) void reload(detail.active.recipeId);
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
    setPending(false);
    if (result.ok) {
      setIssueCode("");
      setIssueField("");
      setIssueExplanation("");
      setStatus("Issue recorded.");
      void reload(detail.active.recipeId);
    } else {
      setStatus(`Issue not recorded (${result.code}).`);
    }
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
    setPending(false);
    if (result.ok) {
      setResolved([]);
      setStatus(
        decision === "approve"
          ? "This revision is approved and ready to publish."
          : `Decision recorded: ${decision}.`
      );
      void reload(detail.active.recipeId);
    } else {
      setStatus(`Decision failed (${result.code}). Reload and retry on the current revision.`);
    }
  }

  const submission = reviewState?.submission ?? null;
  const openBlockers = (reviewState?.issues ?? []).filter((i) => i.severity === "blocker" && !i.resolved);
  const canReviewCurrentSubmission = canReview && working !== null && submission !== null;
  const reviewStateLabel = working
    ? `Version ${working.version} · ${working.digest.slice(0, 12)} · ${working.state}`
    : "No working revision";

  return (
    <section aria-label="Review and approval">
      <h2>Review and approval</h2>
      <p>{reviewStateLabel}</p>
      {submission ? (
        <p>
          Submitted by {submission.submittedBy} at {submission.submittedAt}
        </p>
      ) : null}

      <h3>Readiness</h3>
      <ul>
        {detail.readiness.checks.map((check) => (
          <li key={check.code}>
            {check.code}: {check.state} — {check.explanation}
          </li>
        ))}
      </ul>

      {canEdit && working ? (
        <button type="button" onClick={submit} disabled={pending}>
          Submit for review
        </button>
      ) : null}

      <h3>Issues</h3>
      <ul>
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

      {canReview && working ? (
        <div>
          <h3>Record issue</h3>
          <label htmlFor="issue-code">Issue code</label>
          <input id="issue-code" value={issueCode} onChange={(e) => setIssueCode(e.target.value)} />
          <label htmlFor="issue-field">Field (optional)</label>
          <input
            id="issue-field"
            value={issueField}
            onChange={(e) => setIssueField(e.target.value)}
          />
          <label htmlFor="issue-severity">Severity</label>
          <select
            id="issue-severity"
            value={issueSeverity}
            onChange={(e) => setIssueSeverity(e.target.value as "blocker" | "suggestion")}
          >
            <option value="blocker">Blocker</option>
            <option value="suggestion">Suggestion</option>
          </select>
          <label htmlFor="issue-explanation">Explanation</label>
          <input
            id="issue-explanation"
            value={issueExplanation}
            onChange={(e) => setIssueExplanation(e.target.value)}
          />
          <button
            type="button"
            onClick={recordIssue}
            disabled={pending || issueCode.trim().length === 0 || issueExplanation.trim().length === 0}
          >
            Record issue
          </button>
        </div>
      ) : null}

      {canReview ? (
        <div>
          <h3>Decision</h3>
          <label htmlFor="review-reason">Review reason</label>
          <input id="review-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button
            type="button"
            onClick={() => decide("approve")}
            disabled={pending || reason.trim().length === 0 || !canReviewCurrentSubmission}
          >
            Approve this revision
          </button>
          <button
            type="button"
            onClick={() => decide("changes_requested")}
            disabled={pending || reason.trim().length === 0 || !canReviewCurrentSubmission}
          >
            Request changes
          </button>
          <button
            type="button"
            onClick={() => decide("reject")}
            disabled={pending || reason.trim().length === 0 || !canReviewCurrentSubmission}
          >
            Reject
          </button>
          {!canReviewCurrentSubmission ? (
            <p>Awaiting a submitted revision before a decision can be recorded.</p>
          ) : null}
          {openBlockers.length > 0 ? (
            <p>
              {openBlockers.length} blocker(s) remain open; approval needs every blocker resolved.
            </p>
          ) : null}
        </div>
      ) : (
        <p>Review decisions require the reviewer permission.</p>
      )}

      {status ? (
        <p role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
    </section>
  );
}
