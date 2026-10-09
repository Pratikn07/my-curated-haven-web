import type { RecipeSnapshot, Revision } from "@/lib/admin/contracts";
import { diffSnapshots } from "@/lib/admin/snapshot";
import AdminRecipePreview from "./AdminRecipePreview";

function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    "catalog.title": "Title",
    "catalog.publicSummary": "Public summary",
    "catalog.totalMinutes": "Total time",
    "catalog.mealLabels": "Meal labels",
    "catalog.dietLabels": "Diet labels",
    "body.ingredients": "Ingredients and order",
    "body.instructions": "Instructions and order",
    "body.yield": "Yield",
    "body.allergens": "Allergen list",
    "image.path": "Image",
    "image.alt": "Image alt text",
    "image.description": "Image description",
  };
  return labels[field] ?? field.replace(/[.]/g, " · ");
}

export default function AdminRecipeChanges({ active, revision }: { active: RecipeSnapshot; revision: Revision }) {
  const differences = diffSnapshots(active, revision.snapshot);
  return <div className="admin-recipe-changes">
    <div className="admin-recipe-changes__compare">
      <AdminRecipePreview snapshot={active} label="Published today" />
      <AdminRecipePreview snapshot={revision.snapshot} label="Proposed revision" />
    </div>
    <section className="admin-recipe-changes__summary" aria-label="Change summary">
      <h2>Changed fields</h2>
      {differences.length ? <ul aria-label="Changed fields">{differences.map((difference) => <li key={difference.field}>
        <strong>{fieldLabel(difference.field)}</strong>
        {typeof difference.before === "string" && typeof difference.after === "string" ?
          <span> · Live: {difference.before || "empty"} · Proposed: {difference.after || "empty"}</span> : null}
      </li>)}</ul> : <p>No content changes from the live recipe.</p>}
      <p>Saved revision {revision.version} · digest {revision.digest.slice(0, 12)} · saved at {revision.savedAt}</p>
    </section>
  </div>;
}
