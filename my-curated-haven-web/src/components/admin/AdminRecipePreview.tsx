import type { RecipeSnapshot } from "@/lib/admin/contracts";

export default function AdminRecipePreview({
  snapshot,
  label,
}: {
  snapshot: RecipeSnapshot;
  label: string;
}) {
  return (
    <section aria-label={label}>
      <h2>{snapshot.catalog.title}</h2>
      <p>{snapshot.catalog.publicSummary}</p>
      {snapshot.body ? (
        <div>
          <h3>Ingredients</h3>
          <pre>{JSON.stringify(snapshot.body.ingredients, null, 2)}</pre>
          <h3>Instructions</h3>
          <pre>{JSON.stringify(snapshot.body.instructions, null, 2)}</pre>
        </div>
      ) : (
        <p role="status">Body is incomplete for this recipe.</p>
      )}
    </section>
  );
}
