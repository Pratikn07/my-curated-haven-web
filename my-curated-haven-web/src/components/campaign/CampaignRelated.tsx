import RecipeCard from "@/components/recipe/RecipeCard";
import type { RecipeCatalogItem } from "@/lib/data/recipes";
import { Kicker } from "./CampaignParts";
import ShelfControls from "./ShelfControls";

/**
 * 6. More free recipes, as the same cards /recipes uses, on a shelf the parent
 * can swipe, scroll with the keyboard, or move with the buttons.
 */
export default function CampaignRelated({ recipes }: { recipes: RecipeCatalogItem[] }) {
  if (recipes.length === 0) return null;
  return (
    <section className="cp-related" aria-labelledby="cp-related-title" data-story-section="related">
      <div className="cp-related-head">
        <div>
          <Kicker>Still hungry?</Kicker>
          <h2 id="cp-related-title" className="cp-h2">
            More from the kitchen
          </h2>
        </div>
        <ShelfControls targetId="cp-related-shelf" />
      </div>
      <ul
        id="cp-related-shelf"
        className="cp-shelf"
        tabIndex={0}
        aria-label="More free recipes"
        data-story-action="more_recipe"
        data-story-placement="related"
      >
        {recipes.map((recipe, index) => (
          <li key={recipe.id} data-recipe-id={recipe.id} data-recipe-position={index + 1}>
            <RecipeCard recipe={recipe} showSaveButton={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
