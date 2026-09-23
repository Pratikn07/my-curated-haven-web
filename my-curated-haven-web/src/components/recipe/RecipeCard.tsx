import Link from "next/link";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import SaveRecipeButton from "./SaveRecipeButton";
import type { RecipeCatalogItem } from "@/lib/data/recipes";

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

export type RecipeCardProps = {
  recipe: RecipeCatalogItem | RecipeExample;
  priority?: boolean;
  isSaved?: boolean;
  isAuthenticated?: boolean;
  showSaveButton?: boolean;
};

function isCatalogItem(
  recipe: RecipeCatalogItem | RecipeExample
): recipe is RecipeCatalogItem {
  return "slug" in recipe && typeof recipe.slug === "string";
}

export default function RecipeCard({
  recipe,
  priority = false,
  isSaved = false,
  isAuthenticated = false,
  showSaveButton = false,
}: RecipeCardProps) {
  const isCatalog = isCatalogItem(recipe);
  const slug = isCatalog ? recipe.slug : undefined;
  const title = recipe.title;
  const totalMinutes = recipe.totalMinutes;
  const mealLabel = isCatalog
    ? recipe.mealLabels?.join(", ")
    : recipe.mealLabel;
  const dietLabels = isCatalog
    ? recipe.dietLabels || []
    : recipe.dietaryLabels || [];
  const accessLabel = isCatalog ? "Free recipe" : (recipe.accessLabel ?? "Free sample");
  const summary = isCatalog ? recipe.publicSummary : undefined;
  const imageSrc = isCatalog ? recipe.previewImagePath : undefined;
  const missingImage = !isCatalog && recipe.missingImage;
  const imageLabel = !isCatalog ? recipe.imageLabel : undefined;

  const hasImage = Boolean(imageSrc && imageSrc.trim().length > 0 && !missingImage);

  return (
    <article className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted">
        {hasImage && slug ? (
          <Link
            href={`/recipes/${slug}`}
            tabIndex={-1}
            aria-hidden="true"
            className="block h-full w-full"
          >
            <Image
              src={imageSrc!}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              priority={priority}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        ) : hasImage ? (
          <Image
            src={imageSrc!}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm font-medium text-text-muted">
            {missingImage ? "Image not available" : imageLabel ?? "No photo available"}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div className="grid gap-2">
          <h3 className="text-lg font-semibold leading-snug text-foreground">
            {slug ? (
              <Link
                href={`/recipes/${slug}`}
                className="hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </h3>

          <p className="text-sm text-text-muted">
            {totalMinutes ? `${totalMinutes} min` : "Time not reviewed"}
            {mealLabel ? ` · ${mealLabel}` : ""}
          </p>

          {summary ? (
            <p className="line-clamp-2 text-sm text-text-muted">{summary}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-2">
            {accessLabel ? (
              <Badge variant={accessLabel.includes("Free") ? "free" : "collection"}>
                {accessLabel}
              </Badge>
            ) : null}
            {dietLabels.map((label) => (
              <Badge key={label} variant="outline">
                {label}
              </Badge>
            ))}
          </div>

          {showSaveButton && slug ? (
            <SaveRecipeButton
              recipeId={recipe.id}
              recipeSlug={slug}
              initialIsSaved={isSaved}
              isAuthenticated={isAuthenticated}
              variant="compact"
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}
