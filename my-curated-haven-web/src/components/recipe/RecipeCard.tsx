import Badge from "@/components/ui/Badge";

export type RecipeExample = {
  id: string;
  title: string;
  mealLabel?: string;
  totalMinutes?: number;
  dietaryLabels?: string[];
  accessLabel?: string;
  imageLabel?: string;
  missingImage?: boolean;
};

export default function RecipeCard({ recipe }: { recipe: RecipeExample }) {
  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      <div className="flex aspect-[4/3] items-center justify-center bg-surface-muted px-4 text-center text-text-muted">
        {recipe.missingImage ? "Image not available" : recipe.imageLabel ?? "Sample photo"}
      </div>
      <div className="grid gap-2 p-4">
        <h3 className="text-lg font-semibold leading-snug">{recipe.title}</h3>
        <p className="text-sm text-text-muted">
          {recipe.totalMinutes ? `${recipe.totalMinutes} min` : "Time not reviewed"}
          {recipe.mealLabel ? ` · ${recipe.mealLabel}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {recipe.accessLabel ? <Badge variant={recipe.accessLabel === "Free sample" ? "free" : "collection"}>{recipe.accessLabel}</Badge> : null}
          {recipe.dietaryLabels?.map((label) => (
            <Badge key={label}>{label}</Badge>
          ))}
        </div>
      </div>
    </article>
  );
}
