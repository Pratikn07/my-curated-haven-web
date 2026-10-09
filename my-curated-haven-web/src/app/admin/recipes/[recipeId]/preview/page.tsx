import Link from "next/link";
import AdminRecordFrame from "@/components/admin/AdminRecordFrame";
import AdminRecipeChanges from "@/components/admin/AdminRecipeChanges";
import AdminRecipeReview from "@/components/admin/AdminRecipeReview";
import { getAdminContext, loadAdminRecipe } from "@/lib/admin/context";
import { loadAdminImpact } from "@/lib/admin/recipes";
import { loadRecipeCorrectionImpact } from "@/lib/admin/recipe-corrections";

export default async function AdminRecipePreviewPage({ params }: { params: Promise<{ recipeId: string }> }) {
  const { recipeId } = await params;
  const context = await getAdminContext();
  if (!context.ok || context.value.assurance !== "aal2") return <p role="status">Preview unavailable. Verify your admin access.</p>;
  const permissions = context.value.operator.permissions;
  if (!permissions.some((permission) => ["recipe.edit", "recipe.review", "recipe.publish"].includes(permission))) {
    return <p role="status">Preview requires recipe editing, review, or publication access.</p>;
  }
  const [detail, impact, reach] = await Promise.all([loadAdminRecipe(recipeId), loadAdminImpact(recipeId),
    loadRecipeCorrectionImpact(recipeId)]);
  if (!detail.ok) return <p role="status">Recipe preview unavailable. Try again.</p>;
  const working = detail.value.working;
  if (!working) return <p role="status">No saved working revision to preview.</p>;
  return <AdminRecordFrame
    title="Preview & changes"
    identifier={detail.value.active.catalog.title}
    liveState={`${detail.value.publication} · version ${detail.value.contentVersion ?? "none"}`}
    workingState={`${working.state} · revision ${working.version}`}
    checkedAt={new Date(detail.value.checkedAt).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })}
    actions={<>
      <p>Review the saved candidate and current impact before making a decision.</p>
      {impact.ok ? <p>Impact checked at {impact.value.checkedAt}.</p> : <p role="status">Impact check unavailable. Publication is blocked until a fresh check succeeds.</p>}
      <Link href={`#admin-review`}>Review this revision</Link>
      {working.state === "approved" && permissions.includes("recipe.publish") ? <Link href={`/admin/recipes/${recipeId}/publish`}>Review exact effect</Link> : null}
      <Link href={`/admin/recipes/${recipeId}/edit`}>Back to editor</Link>
    </>}
  >
    <AdminRecipeChanges active={detail.value.active} revision={working}
      collections={reach.ok ? reach.value.collections.map((collection) => collection.title) : null} />
    <section aria-label="Impact and readiness" className="admin-usage">
      <h2>Impact and readiness</h2>
      <p>Review: {detail.value.readiness.review} · evaluated at {detail.value.readiness.evaluatedAt}</p>
      <ul>{detail.value.readiness.checks.map((check) => <li key={check.code}>{check.code}: {check.state} — {check.explanation}</li>)}</ul>
      {impact.ok ? <p>Free slots: {impact.value.usage.freeSlots.length} · Collection releases: {impact.value.usage.releases.length} · Campaign references: {impact.value.usage.campaigns.length}</p> : <p role="status">Material impact unavailable.</p>}
    </section>
    <div id="admin-review"><AdminRecipeReview detail={detail.value} context={context.value} /></div>
  </AdminRecordFrame>;
}
