import Image from "next/image";
import type { CSSProperties } from "react";
import type { CampaignPageData } from "@/lib/data/load-campaign";
import { recipeCountLabel } from "@/lib/campaigns/validate";
import { usableImageSrc } from "@/lib/recipes/format";
import { Marquee, Motif, Orbit, SplitTitle } from "./CampaignParts";

/**
 * 1. The first screen says "you're in the right place": the post's promise,
 * its photo, how many free recipes are waiting, and one way down to them.
 * No navigation or commerce competes with it.
 *
 * The headline arrives word by word from behind a mask, the photo settles in
 * its arch, and a ring of short facts turns slowly around the recipe count.
 * On large screens the letters lean toward the pointer and the photo ripples
 * under it (CampaignMotion); none of that is needed to read or use the page.
 */
export default function CampaignHero({ data }: { data: CampaignPageData }) {
  const { campaign, recipes, hero, story } = data;
  const count = recipes.length;
  // Other promised recipes, laid on the desk next to the main photo on larger screens.
  const prints = recipes
    .map((recipe) => ({ src: usableImageSrc(recipe.previewImagePath), title: recipe.title }))
    .filter((print): print is { src: string; title: string } => Boolean(print.src) && print.src !== hero.src)
    .slice(0, 2);
  const portrait = story.moments[story.moments.length - 1]?.image;
  const free = count === 1 ? "free recipe" : "free recipes";
  const ribbon = [
    recipeCountLabel(count, "free"),
    "No account needed",
    "Cook it, print it, keep it",
    "Allergens on every recipe",
    ...recipes.slice(0, 3).map((recipe) => recipe.title),
    "From our kitchen to yours",
  ];

  return (
    <header className="cp-hero" aria-labelledby="cp-title">
      <div className="cp-hero-copy">
        <p className="cp-hero-eyebrow cp-kicker">
          <span className="cp-live" aria-hidden="true" />
          <span>From the Tiny Soho kitchen</span>
        </p>

        <h1 id="cp-title" className="cp-hero-title" data-proximity>
          <SplitTitle text={campaign.title} letters />
        </h1>

        <p className="cp-hero-sub">{campaign.subtitle}</p>

        <div className="cp-hero-actions">
          <a
            href="#cp-recipes"
            className="cp-button cp-hero-cta"
            data-magnetic
            data-story-action="recipe_jump"
            data-story-placement="hero"
          >
            <span className="cp-button-label">
              {count === 1 ? "See the free recipe" : `See the ${recipeCountLabel(count, "free")}`}
            </span>
            <span className="cp-button-icon cp-hero-cta-arrow" aria-hidden="true">
              ↓
            </span>
          </a>

          <p className="cp-hero-byline">
            {portrait ? (
              <span className="cp-hero-avatar" aria-hidden="true">
                <Image src={portrait.src} alt="" fill sizes="48px" style={{ objectPosition: "56% 22%" }} />
              </span>
            ) : null}
            <span>
              Picked by <b>Bhagyashree</b>
              <br />
              Recipes by Tiny Soho
            </span>
          </p>
        </div>
      </div>

      <div className="cp-hero-media">
        <div className="cp-hero-arch" data-ripple>
          <Image
            src={hero.src}
            alt={hero.alt}
            fill
            priority
            sizes="(min-width: 1024px) 36rem, 62vw"
            placeholder={hero.blurDataURL ? "blur" : "empty"}
            blurDataURL={hero.blurDataURL}
            style={hero.focus ? { objectPosition: hero.focus } : undefined}
          />
          <span className="cp-hero-sheen" aria-hidden="true" />
        </div>

        {prints.map((print, index) => (
          <div
            key={print.src}
            className="cp-hero-print"
            data-slot={index === 0 ? "a" : "b"}
            style={{ "--depth": index === 0 ? -1.4 : 1.8 } as CSSProperties}
            aria-hidden="true"
          >
            <div className="cp-hero-print-photo">
              <Image src={print.src} alt="" fill sizes="14rem" />
            </div>
            <span>{print.title}</span>
          </div>
        ))}

        <Orbit id="cp-orbit-hero" className="cp-hero-badge" text={`${free} · no account · print at home · `}>
          <span className="cp-hero-count" style={{ "--digits": String(count).length } as CSSProperties}>
            {count}
          </span>
          <span className="cp-hero-count-label">
            {count === 1 ? "recipe" : "recipes"}
            <br />
            below
          </span>
        </Orbit>

        <Motif motif={campaign.motif} placement="hero" />
      </div>

      <div className="cp-hero-ribbon">
        <Marquee items={ribbon} />
      </div>
    </header>
  );
}
