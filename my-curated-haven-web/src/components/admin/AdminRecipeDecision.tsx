import Link from "next/link";
import type { AdminContext, Base, RecipeDetail, Result, Usage } from "@/lib/admin/contracts";
import type { AdminRecipeOperation } from "@/lib/admin/receipts";
import { diffSnapshots } from "@/lib/admin/snapshot";
import AdminRecipePublication from "./AdminRecipePublication";

type Impact = Result<{ usage: Usage; base: Base; impactToken: string; checkedAt: string }>;

export default function AdminRecipeDecision({ detail, context, impact, receipts }: {
  detail: RecipeDetail;
  context: AdminContext;
  impact: Impact;
  receipts: Result<AdminRecipeOperation[]>;
}) {
  const working = detail.working;
  const approved = working?.state === "approved";
  const materialUnknown = !impact.ok || impact.value.usage.sourceRevision === null ||
    detail.readiness.checks.some((check) => check.severity === "blocker" && check.state !== "pass");
  const changedFields = working ? diffSnapshots(detail.active, working.snapshot).map((change) => change.field) : [];
  const recoveryReceipt = receipts.ok ? receipts.value.find((receipt) =>
    receipt.action === "revision.publish" && receipt.publication === detail.publication &&
    receipt.version === detail.contentVersion
  ) ?? null : null;

  return <div className="admin-decision">
    {!approved ? <p role="status">Publication requires an approved working revision.</p> : <>
      <section aria-label="Exact candidate">
        <h2>Exact candidate</h2>
        <p>Revision {working.id} · version {working.version} · digest {working.digest}</p>
        <p>Live: {detail.publication} · version {detail.contentVersion ?? "none"}</p>
        <p>Changed fields: {changedFields.length ? changedFields.join(", ") : "none"}</p>
      </section>
      <section aria-label="Publication effect">
        <h2>Publication effect</h2>
        {impact.ok ? <>
          <p>Checked at {impact.value.checkedAt}. Free slots: {impact.value.usage.freeSlots.join(", ") || "none"}.</p>
          <p>Collection releases: {impact.value.usage.releases.map((release) => `${release.title} version ${release.version}`).join(", ") || "none"}.</p>
          <p>Campaign references: {impact.value.usage.campaigns.map((campaign) => campaign.slug).join(", ") || "none"}.</p>
          {impact.value.usage.sourceRevision === null ? <p role="status">Campaign usage check unavailable.</p> : null}
        </> : <p role="status">Impact check unavailable. Publication is blocked.</p>}
        {materialUnknown ? <p role="status">A material check is unknown or blocked. Return to Preview &amp; changes after it is resolved.</p> : null}
      </section>
      <AdminRecipePublication detail={detail} context={context} mode="publish" publicationBlocked={materialUnknown} initialImpactToken={impact.ok ? impact.value.impactToken : null} recoveryReceipt={recoveryReceipt} />
    </>}
    {recoveryReceipt && !approved ? <section aria-label="Committed receipt">
      <h2>Committed receipt</h2>
      <p>Operation {recoveryReceipt.operationId} · version {recoveryReceipt.version} · committed at {recoveryReceipt.committedAt}.</p>
      <AdminRecipePublication detail={detail} context={context} mode="publish" publicationBlocked recoveryReceipt={recoveryReceipt} />
    </section> : null}
    <Link href={`/admin/recipes/${detail.active.recipeId}/preview`}>Back to Preview &amp; changes</Link>
  </div>;
}
