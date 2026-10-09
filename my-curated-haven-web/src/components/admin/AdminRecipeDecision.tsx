import Link from "next/link";
import type { AdminContext, Base, CorrectionImpact, RecipeDetail, Result, Usage } from "@/lib/admin/contracts";
import type { AdminRecipeOperation } from "@/lib/admin/receipts";
import { diffSnapshots } from "@/lib/admin/snapshot";
import AdminRecipePublication from "./AdminRecipePublication";

type Impact = Result<{ usage: Usage; base: Base; impactToken: string; checkedAt: string }>;

/**
 * A recipe people have bought (sealed release, live offer, pending checkout or live payment) is published
 * only as a correction: the same recipe, with its global effect shown and acknowledged.
 */
function CorrectionNotice({ impact, campaignBlocked }: { impact: Result<CorrectionImpact>; campaignBlocked: boolean }) {
  return <section aria-label="Correction to a purchased recipe">
    <h2>Correction to a purchased recipe</h2>
    <p>People have bought collections that include this recipe. Publishing this revision corrects the recipe
      everywhere it is used: existing buyers and every other reader will see the corrected version. The current
      version is archived with your reason. Collection recipes, releases, prices, sales and past orders do not change.</p>
    {impact.ok ? <ul aria-label="Collections this correction reaches">
      {impact.value.collections.map((collection) => <li key={collection.collectionId}>
        {collection.title}: {collection.releases.length
          ? collection.releases.map((release) => `release ${release.version} (${release.state})`).join(", ")
          : "no release yet"}
        {collection.draft ? `. Private draft revision ${collection.draft.version} (${collection.draft.state}) will need its recipe reference updated and a new review.` : "."}
      </li>)}
    </ul> : <p role="status">The affected collections could not be listed ({impact.code}). The correction stays blocked until they can.</p>}
    {campaignBlocked ? <p role="status">A campaign promises this recipe. A correction stays blocked until the campaign itself is reviewed.</p> : null}
  </section>;
}

export default function AdminRecipeDecision({ detail, context, impact, receipts, correctionImpact }: {
  detail: RecipeDetail;
  context: AdminContext;
  impact: Impact;
  receipts: Result<AdminRecipeOperation[]>;
  correctionImpact: Result<CorrectionImpact>;
}) {
  const working = detail.working;
  const approved = working?.state === "approved";
  const materialUnknown = !impact.ok || impact.value.usage.sourceRevision === null ||
    detail.readiness.checks.some((check) => check.severity === "blocker" && check.state !== "pass");
  const changedFields = working ? diffSnapshots(detail.active, working.snapshot).map((change) => change.field) : [];
  const correction = impact.ok && detail.publication !== "draft" && impact.value.usage.releases.some((release) =>
    release.sealed || release.liveOffer || release.pendingLiveAttempt || release.historicalLivePayment);
  const campaignBlocked = correction && impact.ok && impact.value.usage.campaigns.length > 0;
  const recoveryReceipt = receipts.ok ? receipts.value.find((receipt) =>
    (receipt.action === "revision.publish" || receipt.action === "recipe.correct") && receipt.publication === detail.publication &&
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
      {correction ? <CorrectionNotice impact={correctionImpact} campaignBlocked={campaignBlocked} /> : null}
      <AdminRecipePublication detail={detail} context={context} mode="publish" correction={correction}
        publicationBlocked={materialUnknown || campaignBlocked || (correction && !correctionImpact.ok)}
        initialImpactToken={impact.ok ? impact.value.impactToken : null} recoveryReceipt={recoveryReceipt} />
    </>}
    {recoveryReceipt && !approved ? <section aria-label="Committed receipt">
      <h2>Committed receipt</h2>
      <p>Operation {recoveryReceipt.operationId} · version {recoveryReceipt.version} · committed at {recoveryReceipt.committedAt}.</p>
      <AdminRecipePublication detail={detail} context={context} mode="publish" publicationBlocked recoveryReceipt={recoveryReceipt} />
    </section> : null}
    <Link href={`/admin/recipes/${detail.active.recipeId}/preview`}>Back to Preview &amp; changes</Link>
  </div>;
}
