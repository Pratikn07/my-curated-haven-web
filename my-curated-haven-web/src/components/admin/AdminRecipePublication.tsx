"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminContext,
  RecipeDetail,
} from "@/lib/admin/contracts";
import { diffSnapshots } from "@/lib/admin/snapshot";
import type { AdminRecipeOperation } from "@/lib/admin/receipts";
import {
  loadImpactAction,
  loadRecipeOperationsAction,
  publishRevisionAction,
  recordFailureAction,
  refreshRecipeAction,
  retryRefreshAction,
  withdrawRecipeAction,
} from "@/lib/admin/actions";

const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

export default function AdminRecipePublication({
  detail,
  context,
  onChanged,
  mode = "publish",
  publicationBlocked = false,
  initialImpactToken = null,
  recoveryReceipt = null,
}: {
  detail: RecipeDetail;
  context: AdminContext;
  onChanged?: () => void;
  mode?: "publish" | "withdraw";
  publicationBlocked?: boolean;
  initialImpactToken?: string | null;
  recoveryReceipt?: AdminRecipeOperation | null;
}) {
  const [reason, setReason] = useState("");
  const [emergency, setEmergency] = useState(false);
  const [acknowledge, setAcknowledge] = useState(false);
  const [confirming, setConfirming] = useState<"publish" | "withdraw" | null>(null);
  const [impactToken, setImpactToken] = useState<string | null>(null);
  const [impactBase, setImpactBase] = useState<{ contentVersion: number | null; activeHash: string } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingOp, setPendingOp] = useState<string | null>(recoveryReceipt?.operationId ?? null);
  const [pending, setPending] = useState(false);
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  const router = useRouter();

  const working = detail.working;
  const canPublish = context.operator.permissions.includes("recipe.publish");
  const canWithdraw = context.operator.permissions.includes("recipe.withdraw");
  const approved = working !== null && working.state === "approved";
  const published = detail.publication === "published";
  if (mode === "withdraw" && !published) return null;

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
    if (!initialImpactToken || value.impactToken !== initialImpactToken) {
      setPending(false);
      setStatus("Impact changed since this page loaded. Return to Preview & changes, then review the current effect.");
      return;
    }
    setImpactToken(value.impactToken);
    setImpactBase(value.base);
    setConfirming("publish");
    setPending(false);
  }

  async function executePublish() {
    if (!working || !impactToken || !impactBase) return;
    setPending(true);
    const operationId = crypto.randomUUID();
    let result: Awaited<ReturnType<typeof publishRevisionAction>>;
    try {
      result = await publishRevisionAction({
        operationId,
        recipeId: detail.active.recipeId,
        reason: reason.trim(),
        revisionId: working.id,
        expectedVersion: working.version,
        expectedDigest: working.digest,
        base: working.base,
        impactToken,
      });
    } catch {
      setPending(false);
      setConfirming(null);
      setPendingOp(operationId);
      setStatus(`Publication outcome unconfirmed. Check operation ${operationId} before trying again.`);
      return;
    }
    if (!result.ok) {
      setPending(false);
      setConfirming(null);
      if (result.code === "CONFLICT" || result.code === "BLOCKED") {
        setStatus("The approved revision or impact changed. Return to Preview & changes and review the current facts.");
      } else {
        setPendingOp(operationId);
        setStatus(`Publication outcome unconfirmed (${result.code}). Check operation ${operationId} before trying again.`);
      }
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
    const receipts = await loadRecipeOperationsAction(detail.active.recipeId);
    const committed = receipts.ok ? receipts.value.find((receipt) => receipt.operationId === pendingOp) : null;
    if (!committed) {
      setPending(false);
      setStatus(receipts.ok
        ? `No committed receipt found for operation ${pendingOp}. Reload and review the current recipe before a new attempt.`
        : `Receipt check unavailable for operation ${pendingOp}. Try again.`);
      return;
    }
    const result = await retryRefreshAction(pendingOp, detail.active.recipeId);
    setPending(false);
    if (result.ok && result.value.state === "complete") {
      setPendingOp(null);
      setStatus(mode === "withdraw" ? "Withdrawn." : "Published.");
    } else {
      setStatus(`Committed; display refresh unconfirmed. Operation ${pendingOp}.`);
    }
    onChanged?.();
  }

  async function executeWithdraw() {
    if (!initialImpactToken) {
      setStatus("Impact unavailable. Reload this page and review current usage before withdrawing.");
      return;
    }
    setPending(true);
    const impact = await loadImpactAction(detail.active.recipeId);
    if (!impact.ok) {
      setPending(false);
      setStatus(`Impact unavailable (${impact.code}). Try again.`);
      return;
    }
    const fresh = impact.value as { impactToken: string; base: { contentVersion: number | null; activeHash: string } };
    if (fresh.impactToken !== initialImpactToken) {
      setPending(false);
      setStatus("Impact changed since this page loaded. Reload and review current usage before withdrawing.");
      return;
    }
    const impactBase = fresh.base;
    const operationId = crypto.randomUUID();
    let result: Awaited<ReturnType<typeof withdrawRecipeAction>>;
    try {
      result = await withdrawRecipeAction({
        operationId,
        recipeId: detail.active.recipeId,
        reason: reason.trim(),
        base: impactBase,
        impactToken: fresh.impactToken,
        emergency,
        acknowledgePromiseImpact: acknowledge,
      });
    } catch {
      setPending(false);
      setPendingOp(operationId);
      setStatus(`Withdrawal outcome unconfirmed. Check operation ${operationId} before trying again.`);
      return;
    }
    setPending(false);
    if (!result.ok) {
      if (result.code === "CONFLICT" || result.code === "BLOCKED") {
        setStatus("Withdrawal blocked by a changed recipe or impact. Review the current usage before trying again.");
        void recordFailureAction({
          action: "recipe.withdraw", target: detail.active.recipeId,
          operationId, code: result.code,
        });
      } else {
        setPendingOp(operationId);
        setStatus(`Withdrawal outcome unconfirmed (${result.code}). Check operation ${operationId} before trying again.`);
      }
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
  const campaigns = detail.usage.ok ? (detail.usage.value.campaigns ?? []) : [];
  const freeSlots = detail.usage.ok ? detail.usage.value.freeSlots : [];
  const hasPromise = campaigns.length > 0 || freeSlots.length > 0;
  const owner = context.operator.roles.includes("owner");

  return (
    <section aria-label={mode === "publish" ? "Publication" : "Withdrawal"} className="admin-publication">
      <h2>Publication</h2>
      {mode === "publish" && !approved && !published ? (
        <p>Publication needs an approved revision. Review decisions require the reviewer permission.</p>
      ) : null}

      {mode === "publish" && approved && canPublish ? (
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
            <button type="button" onClick={confirmPublish} disabled={!hydrated || pending || publicationBlocked || Boolean(pendingOp)}>
              Publish this revision
            </button>
          )}
        </div>
      ) : null}

      {mode === "withdraw" && published && canWithdraw ? (
        <div>
          <h3>Withdraw from public</h3>
          {!initialImpactToken || !detail.usage.ok || detail.usage.value.sourceRevision === null ? (
            <p role="status">Campaign impact is unavailable. Withdrawal is paused until this check succeeds.</p>
          ) : null}
          {campaigns.length > 0 ? <p>Affected campaigns: {campaigns.map((campaign) => campaign.slug).join(", ")}.</p> : null}
          {freeSlots.length > 0 ? <p>Affected free recipe slots: {freeSlots.join(", ")}.</p> : null}
          {hasPromise && !owner ? <p>Only an owner can confirm withdrawal when a campaign or free slot promises this recipe.</p> : null}
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
            disabled={!hydrated}
          />
          <label htmlFor="withdraw-emergency">
            <input
              id="withdraw-emergency"
              type="checkbox"
              checked={emergency}
              onChange={(e) => setEmergency(e.target.checked)}
              disabled={!hydrated}
            />
            Emergency (sealed or commercial exposure)
          </label>
          <label htmlFor="withdraw-ack">
            <input
              id="withdraw-ack"
              type="checkbox"
              checked={acknowledge}
              onChange={(e) => setAcknowledge(e.target.checked)}
              disabled={!hydrated}
            />
            I acknowledge the named campaign and free-slot promises above may be affected
          </label>
          <button
            type="button"
            onClick={executeWithdraw}
            disabled={!hydrated || pending || Boolean(pendingOp) || !initialImpactToken ||
              (hasPromise && (!owner || !acknowledge)) || reason.trim().length === 0}
          >
            Confirm withdrawal
          </button>
        </div>
      ) : null}

      {pendingOp ? (
        <button type="button" onClick={retryRefresh} disabled={pending}>
          Check committed operation and refresh display
        </button>
      ) : null}

      {mode === "publish" && recoveryReceipt && pendingOp && !status ? (
        <p role="status">Committed; display refresh unconfirmed. Operation {recoveryReceipt.operationId}.</p>
      ) : null}

      {status ? (
        <p role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
    </section>
  );
}
