import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { CampaignPageData, CampaignRecipe } from "@/lib/data/load-campaign";
import { planRecipeLayout } from "@/lib/campaigns/validate";
import { usableImageSrc } from "@/lib/recipes/format";
import { Kicker } from "./CampaignParts";

/** Diet labels read better in sentence case on a card: "nut-free" → "Nut-free". */
function label(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function RecipeTile({ recipe, featured, stagger }: { recipe: CampaignRecipe; featured: boolean; stagger: number }) {
  const src = usableImageSrc(recipe.previewImagePath);
  const facts = [
    ...(recipe.totalMinutes ? [`${recipe.totalMinutes} min`] : []),
    ...recipe.dietLabels.slice(0, featured ? 4 : 2).map(label),
  ];
  return (
    <li className="cp-recipe" data-featured={featured ? "true" : undefined} style={{ "--i": stagger } as CSSProperties}>
      <div className="cp-recipe-photo">
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            sizes={featured ? "(min-width: 1024px) 40rem, 100vw" : "(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"}
          />
        ) : (
          <span className="cp-recipe-photo-empty" aria-hidden="true">
            {recipe.title.charAt(0)}
          </span>
        )}
        <span className="cp-recipe-num" aria-hidden="true">
          {String(recipe.position).padStart(2, "0")}
        </span>
      </div>
      <div className="cp-recipe-body">
        <h3 className="cp-recipe-title">
          <Link
            href={`/recipes/${recipe.slug}`}
            prefetch={false}
            data-story-action="campaign_recipe"
            data-story-placement="recipes"
            data-recipe-id={recipe.id}
            data-recipe-position={recipe.position}
          >
            {recipe.title}
          </Link>
        </h3>
        {recipe.note || recipe.publicSummary ? <p className="cp-recipe-note">{recipe.note ?? recipe.publicSummary}</p> : null}
        {facts.length > 0 ? (
          <ul className="cp-recipe-facts" aria-label="At a glance">
            {facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        ) : null}
        <span className="cp-recipe-cta" aria-hidden="true">
          Read recipe <span className="cp-arrow">→</span>
        </span>
      </div>
    </li>
  );
}

/**
 * 2. The recipes the post promised, early and in its order. Each card opens the
 * recipe's permanent page, where ingredients, steps, allergens and printing live.
 * The layout follows how many there are (see planRecipeLayout).
 */
export default function CampaignRecipes({ data }: { data: CampaignPageData }) {
  const { campaign, recipes } = data;
  const plan = planRecipeLayout(recipes.length);
  const featuredIndex = plan.layout === "single" || plan.layout === "trio" ? 0 : -1;

  return (
    <section
      id="cp-recipes"
      className="cp-recipes"
      aria-labelledby="cp-recipes-title"
      data-layout={plan.layout}
      data-compact={plan.compactOnPhones ? "true" : undefined}
      data-story-section="recipes"
      style={{ "--cols": plan.columns } as CSSProperties}
    >
      <div className="cp-section-head">
        <Kicker>{recipes.length === 1 ? "The one we promised" : "The ones we promised"}</Kicker>
        <h2 id="cp-recipes-title" className="cp-h2">
          {campaign.recipesHeading ?? "Your recipes are here."}
        </h2>
        <p className="cp-section-note">
          Tap a recipe to open it. Ingredients, steps, allergens and printing are all on its page. No account needed.
        </p>
      </div>
      <ol className="cp-recipe-list">
        {recipes.map((recipe, index) => (
          <RecipeTile key={recipe.id} recipe={recipe} featured={index === featuredIndex} stagger={index % plan.columns} />
        ))}
      </ol>
    </section>
  );
}
