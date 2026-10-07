"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminContext,
  RecipeDetail,
} from "@/lib/admin/contracts";
import { diffSnapshots } from "@/lib/admin/snapshot";
import {
  loadImpactAction,
  publishRevisionAction,
  recordFailureAction,
  refreshRecipeAction,
  retryRefreshAction,
  withdrawRecipeAction,
} from "@/lib/admin/actions";

export default function AdminRecipePublication({
  detail,
  context,
  onChanged,
}: {
  detail: RecipeDetail;
  context: AdminContext;
  onChanged?: () => void;
}) {
  const [reason, setReason] = useState("");
  const [emergency, setEmergency] = useState(false);
  const [acknowledge, setAcknowledge] = useState(false);
  const [confirming, setConfirming] = useState<"publish" | "withdraw" | null>(null);
  const [impactToken, setImpactToken] = useState<string | null>(null);
  const [impactBase, setImpactBase] = useState<{ contentVersion: number | null; activeHash: string } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const working = detail.working;
  const canPublish = context.operator.permissions.includes("recipe.publish");
  const canWithdraw = context.operator.permissions.includes("recipe.withdraw");
  const approved = working !== null && working.state === "approved";
  const published = detail.publication === "published";

  async function confirmPublish() {
    if (!working) return;
    setPending(true);
    const impact = await loadImpactAction(detail.active.recipeId);
    if (!impact.ok) {
      setPending(false);
      setStatus(`Impact unavailable (${impact.code}). Try again.`);
      return;
    }
    const value = impact.value as {
      impactToken: string;
      base: { contentVersion: number | null; activeHash: string };
      usage: { campaigns?: unknown[] };
    };
    setImpactToken(value.impactToken);
    setImpactBase(value.base);
    setConfirming("publish");
    setPending(false);
  }

  async function executePublish() {
    if (!working || !impactToken || !impactBase) return;
    setPending(true);
    const operationId = crypto.randomUUID();
    const result = await publishRevisionAction({
      operationId,
      recipeId: detail.active.recipeId,
      reason: reason.trim(),
      revisionId: working.id,
      expectedVersion: working.version,
      expectedDigest: working.digest,
      base: working.base,
      impactToken,
    });
    if (!result.ok) {
      setPending(false);
      setStatus(`Publication failed (${result.code}). No changes were made.`);
      void recordFailureAction({
        action: "revision.publish",
        target: detail.active.recipeId,
        operationId,
        code: result.code,
      });
      return;
    }
    const refresh = await refreshRecipeAction(result.value, { slug: detail.active.slug });
    setPending(false);
    setConfirming(null);
    if (refresh.state === "complete") {
      setStatus("Published.");
    } else {
      setPendingOp(operationId);
      setStatus("Saved; display refresh pending.");
    }
    onChanged?.();
    router.refresh();
  }

  async function retryRefresh() {
    if (!pendingOp) return;
    setPending(true);
    const result = await retryRefreshAction(pendingOp, detail.active.recipeId);
    setPending(false);
    if (result.ok && result.value.state === "complete") {
      setPendingOp(null);
      setStatus("Published.");
    } else {
      setStatus("Saved; display refresh pending.");
    }
    onChanged?.();
  }

  async function executeWithdraw() {
    setPending(true);
    const impact = await loadImpactAction(detail.active.recipeId);
    if (!impact.ok) {
      setPending(false);
      setStatus(`Impact unavailable (${impact.code}). Try again.`);
      return;
    }
    const impactBase = (impact.value as { base: { contentVersion: number | null; activeHash: string } }).base;
    const operationId = crypto.randomUUID();
    const result = await withdrawRecipeAction({
      operationId,
      recipeId: detail.active.recipeId,
      reason: reason.trim(),
      base: impactBase,
      emergency,
      acknowledgePromiseImpact: acknowledge,
    });
    setPending(false);
    if (!result.ok) {
      setStatus(`Withdrawal failed (${result.code}). No changes were made.`);
      void recordFailureAction({
        action: "recipe.withdraw",
        target: detail.active.recipeId,
        operationId,
        code: result.code,
      });
      return;
    }
    const refresh = await refreshRecipeAction(result.value, { slug: detail.active.slug });
    setConfirming(null);
    if (refresh.state === "complete") {
      setStatus("Withdrawn.");
    } else {
      setPendingOp(operationId);
      setStatus("Saved; display refresh pending.");
    }
    onChanged?.();
    router.refresh();
  }

  const changedFields =
    working !== null ? diffSnapshots(detail.active, working.snapshot).map((d) => d.field) : [];
  const releases = detail.usage.ok
    ? (detail.usage.value.releases ?? [])
    : [];
  const campaignCount = detail.usage.ok ? (detail.usage.value.campaigns ?? []).length : 0;

  return (
    <section aria-label="Publication">
      <h2>Publication</h2>
      {!approved && !published ? (
        <p>Publication needs an approved revision. Review decisions require the reviewer permission.</p>
      ) : null}

      {approved && canPublish ? (
        <div>
          <h3>Publish candidate</h3>
          <p>
            Version {working?.version} · {working?.digest.slice(0, 12)}
          </p>
          {changedFields.length > 0 ? <p>Changed: {changedFields.join(", ")}</p> : null}
          {releases.length > 0 ? (
            <p>
              Affected releases:{" "}
              {releases.map((r) => `${r.title} v${r.version} (${r.state})`).join("; ")}
            </p>
          ) : null}
          {campaignCount > 0 ? <p>Affected campaigns: {campaignCount}</p> : null}
          {confirming === "publish" ? (
            <div role="dialog" aria-label="Confirm publication">
              <p>
                Publish version {working?.version} ({changedFields.join(", ") || "no field changes"})
                {releases.length > 0
                  ? ` affecting ${releases.length} release(s)`
                  : ""}
                ?
              </p>
              <label htmlFor="publish-reason">Reason</label>
              <input
                id="publish-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button
                type="button"
                onClick={executePublish}
                disabled={pending || reason.trim().length === 0}
              >
                Confirm publication
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(null);
                  setReason("");
                }}
                autoFocus
              >
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={confirmPublish} disabled={pending}>
              Publish this revision
            </button>
          )}
        </div>
      ) : null}

      {published && canWithdraw ? (
        <div>
          <h3>Withdraw from public</h3>
          {releases.some((r) => r.sealed || r.liveOffer || r.pendingLiveAttempt || r.historicalLivePayment) ? (
            <p>
              This recipe has sealed or commercial exposure. Emergency withdrawal is owner-only
              and does not refund purchases or change customer rights.
            </p>
          ) : null}
          <label htmlFor="withdraw-reason">Reason</label>
          <input
            id="withdraw-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <label htmlFor="withdraw-emergency">
            <input
              id="withdraw-emergency"
              type="checkbox"
              checked={emergency}
              onChange={(e) => setEmergency(e.target.checked)}
            />
            Emergency (sealed or commercial exposure)
          </label>
          <label htmlFor="withdraw-ack">
            <input
              id="withdraw-ack"
              type="checkbox"
              checked={acknowledge}
              onChange={(e) => setAcknowledge(e.target.checked)}
            />
            I understand customers may lose access
          </label>
          <button
            type="button"
            onClick={executeWithdraw}
            disabled={pending || reason.trim().length === 0}
          >
            Confirm withdrawal
          </button>
        </div>
      ) : null}

      {pendingOp ? (
        <button type="button" onClick={retryRefresh} disabled={pending}>
          Retry display refresh
        </button>
      ) : null}

      {status ? (
        <p role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
    </section>
  );
}
