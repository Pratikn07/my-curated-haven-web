"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminContext, RecipeDetail } from "@/lib/admin/contracts";
import { refreshDraftAction } from "@/lib/admin/actions";
import AdminRecipePreview from "./AdminRecipePreview";
import AdminRecipeReview from "./AdminRecipeReview";
import AdminRecipePublication from "./AdminRecipePublication";
import AdminRecordFrame from "./AdminRecordFrame";
import AdminRecipeUsage from "./AdminRecipeUsage";
import AdminRecipeHistory from "./AdminRecipeHistory";

export default function AdminInspection({
  detail: initialDetail,
  context,
  returnTo,
  withdrawImpactToken,
}: {
  detail: RecipeDetail;
  context: AdminContext;
  returnTo: string;
  withdrawImpactToken: string | null;
}) {
  const [localDetail, setLocalDetail] = useState({ source: initialDetail, value: initialDetail });
  const detail = localDetail.source === initialDetail ? localDetail.value : initialDetail;
  function setDetail(next: RecipeDetail) {
    setLocalDetail({ source: initialDetail, value: next });
  }
  async function syncDetail() {
    const current = await refreshDraftAction(detail.active.recipeId);
    if (current.ok) setDetail(current.value as RecipeDetail);
  }
  const canEdit = context.operator.permissions.includes("recipe.edit") && context.stage !== "inspection" && context.stage !== "disabled";
  return (
    <AdminRecordFrame
      title={detail.active.catalog.title}
      identifier={detail.active.slug}
      liveState={`${detail.publication}${detail.contentVersion === null ? "" : ` · version ${detail.contentVersion}`}`}
      workingState={detail.working ? `${detail.working.state} · revision ${detail.working.version}` : "No working revision"}
      checkedAt={new Date(detail.checkedAt).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })}
      actions={canEdit ? (
        <Link href={`/admin/recipes/${detail.active.recipeId}/edit?returnTo=${encodeURIComponent(returnTo)}`}>Edit working revision</Link>
      ) : (
        <p>{context.stage === "inspection" ? "This console is in inspection stage." : "Editing requires recipe permission."}</p>
      )}
    >
      <Link href={returnTo}>Back to recipes</Link>
      <AdminRecipePreview snapshot={detail.active} label="Active recipe" />
      <AdminRecipeReview detail={detail} context={context} onChanged={setDetail} />
      <AdminRecipePublication detail={detail} context={context} mode="withdraw"
        initialImpactToken={withdrawImpactToken} onChanged={() => { void syncDetail(); }} />
      <section aria-label="Readiness" className="admin-readiness">
        <h2>Readiness</h2>
        <p>Review state: {detail.readiness.review}</p>
        <ul>
          {detail.readiness.checks.map((check) => (
            <li key={check.code}>
              {check.code}: {check.state} — {check.explanation}
            </li>
          ))}
        </ul>
      </section>
      <AdminRecipeUsage usage={detail.usage} />
      <AdminRecipeHistory key={detail.history.events[0]?.id ?? "empty"} recipeId={detail.active.recipeId} initial={detail.history} />
    </AdminRecordFrame>
  );
}
