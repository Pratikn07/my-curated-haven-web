import Image from "next/image";
import Link from "next/link";
import { ClipboardList, CookingPot, Printer, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";
import type { CampaignPageData, CampaignRecipe } from "@/lib/data/load-campaign";
import { planRecipeLayout } from "@/lib/campaigns/validate";
import { usableImageSrc } from "@/lib/recipes/format";
import { Kicker, SplitTitle } from "./CampaignParts";

/** Diet and meal labels read better in sentence case on a card: "nut-free" → "Nut-free". */
function label(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** What waits on every recipe page, so a parent knows what one tap gets them. */
const ON_THE_PAGE = [
  { icon: ClipboardList, text: "Ingredients" },
  { icon: CookingPot, text: "Steps" },
  { icon: ShieldCheck, text: "Allergens" },
  { icon: Printer, text: "Print" },
];

function RecipeTile({ recipe, featured, stagger }: { recipe: CampaignRecipe; featured: boolean; stagger: number }) {
  const src = usableImageSrc(recipe.previewImagePath);
  const number = String(recipe.position).padStart(2, "0");
  const diets = recipe.dietLabels.slice(0, featured ? 4 : 2).map(label);
  const meals = recipe.mealLabels.slice(0, 2).map(label);
  return (
    <li
      className="cp-recipe"
      data-featured={featured ? "true" : undefined}
      data-reveal="rise"
      data-tilt
      data-cursor="Open"
      style={{ "--i": stagger } as CSSProperties}
    >
      <div className="cp-recipe-photo">
        <div className="cp-recipe-photo-inner">
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
        </div>
        <span className="cp-recipe-num" aria-hidden="true">
          {number}
        </span>
        <span className="cp-recipe-stamp" aria-hidden="true">
          Free
        </span>
      </div>
      <div className="cp-recipe-body">
        <p className="cp-recipe-kicker" aria-hidden="true">
          No. {number}
          {meals.length > 0 ? ` · ${meals.join(" & ")}` : ""}
        </p>
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
        {recipe.totalMinutes || diets.length > 0 ? (
          <ul className="cp-recipe-facts" aria-label="At a glance">
            {recipe.totalMinutes ? (
              <li className="cp-recipe-time">
                <span className="cp-recipe-time-value" data-count-to={recipe.totalMinutes}>
                  {recipe.totalMinutes}
                </span>{" "}
                min
              </li>
            ) : null}
            {diets.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        ) : null}
        <span className="cp-recipe-cta" aria-hidden="true">
          <span className="cp-recipe-cta-label">{featured ? "Read the full recipe" : "Read recipe"}</span>
          <span className="cp-recipe-cta-icon">→</span>
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
export default function CampaignRecipes({ data, index }: { data: CampaignPageData; index?: string }) {
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
        <Kicker index={index}>{recipes.length === 1 ? "The one we promised" : "The ones we promised"}</Kicker>
        <h2 id="cp-recipes-title" className="cp-h2" data-reveal="words">
          <SplitTitle text={campaign.recipesHeading ?? "Your recipes are here."} />
        </h2>
        <div className="cp-recipes-intro" data-reveal="rise">
          <p className="cp-section-note">
            Tap a recipe to open it. Everything is on its page, free, with no account needed.
          </p>
          <ul className="cp-onpage" aria-label="On every recipe page">
            {ON_THE_PAGE.map(({ icon: Icon, text }, item) => (
              <li key={text} style={{ "--k": item } as CSSProperties}>
                <Icon aria-hidden="true" strokeWidth={1.6} />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <ol className="cp-recipe-list">
        {recipes.map((recipe, position) => (
          <RecipeTile
            key={recipe.id}
            recipe={recipe}
            featured={position === featuredIndex}
            stagger={position % plan.columns}
          />
        ))}
      </ol>
    </section>
  );
}
