import type { RecipeSnapshot } from "@/lib/admin/contracts";
import { toRecipeDisplay } from "@/lib/admin/recipe-display";

export default function AdminRecipePreview({
  snapshot,
  label,
}: {
  snapshot: RecipeSnapshot;
  label: string;
}) {
  const display = toRecipeDisplay(snapshot);
  return (
    <section aria-label={label} className="admin-recipe-preview">
      <h2>{label}</h2>
      <h3>{snapshot.catalog.title}</h3>
      <p>{snapshot.catalog.publicSummary}</p>
      {snapshot.image.path ? <p>Existing image selected{snapshot.image.alt ? ` · Alt text: ${snapshot.image.alt}` : " · Alt text missing"}</p> : <p>No image selected.</p>}
      {display.ok ? <>
        <h4>Ingredients</h4>
        <ul>{display.ingredients.map((ingredient, index) => <li key={index}>{ingredient.text}</li>)}</ul>
        <h4>Instructions</h4>
        <ol>{display.steps.map((step, index) => <li key={index}>{step.text}</li>)}</ol>
        {snapshot.body ? <p>Yield: {snapshot.body.yield}</p> : null}
      </> : <p role="status">Preview unavailable: {display.reason} The saved source remains unchanged.</p>}
    </section>
  );
}
