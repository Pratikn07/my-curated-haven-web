import Link from "next/link";
import type { CSSProperties } from "react";
import RecipeCard from "@/components/recipe/RecipeCard";
import type { RecipeCatalogItem } from "@/lib/data/recipes";
import { Kicker, SplitTitle } from "./CampaignParts";
import ShelfControls from "./ShelfControls";

/**
 * 6. More free recipes, as the same cards /recipes uses, on a shelf the parent
 * can swipe, drag with a mouse, scroll with the keyboard, or move with the
 * buttons. A thin line under it shows how far along the shelf they are.
 */
export default function CampaignRelated({ recipes, index }: { recipes: RecipeCatalogItem[]; index?: string }) {
  if (recipes.length === 0) return null;
  return (
    <section className="cp-related" aria-labelledby="cp-related-title" data-story-section="related">
      <div className="cp-related-head">
        <div>
          <Kicker index={index}>Still hungry?</Kicker>
          <h2 id="cp-related-title" className="cp-h2" data-reveal="words">
            <SplitTitle text="More from the *kitchen*" />
          </h2>
        </div>
        <ShelfControls targetId="cp-related-shelf" />
      </div>
      <ul
        id="cp-related-shelf"
        className="cp-shelf"
        tabIndex={0}
        aria-label="More free recipes"
        data-drag
        data-cursor="Drag"
        data-story-action="more_recipe"
        data-story-placement="related"
      >
        {recipes.map((recipe, position) => (
          <li
            key={recipe.id}
            data-recipe-id={recipe.id}
            data-recipe-position={position + 1}
            data-reveal="rise"
            style={{ "--i": Math.min(position, 4) } as CSSProperties}
          >
            <RecipeCard recipe={recipe} showSaveButton={false} />
          </li>
        ))}
        <li className="cp-shelf-end" data-reveal="rise" style={{ "--i": Math.min(recipes.length, 4) } as CSSProperties}>
          <Link href="/recipes" data-story-action="recipes_index" data-story-placement="related">
            <span className="cp-shelf-end-kicker">The whole kitchen</span>
            <span className="cp-shelf-end-title">Every free recipe, in one place</span>
            <span className="cp-shelf-end-icon" aria-hidden="true">
              →
            </span>
          </Link>
        </li>
      </ul>
      <div className="cp-shelf-progress" aria-hidden="true">
        <span />
      </div>
    </section>
  );
}
