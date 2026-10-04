import Image from "next/image";
import type { CampaignPageData } from "@/lib/data/load-campaign";
import { recipeCountLabel } from "@/lib/campaigns/validate";
import { usableImageSrc } from "@/lib/recipes/format";
import { CampaignText, Motif } from "./CampaignParts";

/**
 * 1. The first screen says "you're in the right place": the post's promise,
 * its photo, how many free recipes are waiting, and one way down to them.
 * No navigation or commerce competes with it.
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

  return (
    <header className="cp-hero" aria-labelledby="cp-title">
      <p className="cp-hero-eyebrow cp-kicker">From the Tiny Soho kitchen</p>

      <h1 id="cp-title" className="cp-hero-title">
        <CampaignText text={campaign.title} />
      </h1>

      <div className="cp-hero-media">
        <div className="cp-hero-arch">
          <Image
            src={hero.src}
            alt={hero.alt}
            fill
            priority
            sizes="(min-width: 1024px) 34rem, 68vw"
            placeholder={hero.blurDataURL ? "blur" : "empty"}
            blurDataURL={hero.blurDataURL}
            style={hero.focus ? { objectPosition: hero.focus } : undefined}
          />
        </div>
        {prints.map((print, index) => (
          <div key={print.src} className="cp-hero-print" data-slot={index === 0 ? "a" : "b"} aria-hidden="true">
            <div className="cp-hero-print-photo">
              <Image src={print.src} alt="" fill sizes="14rem" />
            </div>
            <span>{print.title}</span>
          </div>
        ))}
        <Motif motif={campaign.motif} placement="hero" />
      </div>

      <p className="cp-hero-count" aria-hidden="true">
        <span className="cp-hero-count-number">{count}</span>
        <span className="cp-hero-count-label">
          free {count === 1 ? "recipe" : "recipes"}
          <br />
          waiting below
        </span>
      </p>

      <p className="cp-hero-sub">{campaign.subtitle}</p>

      <a
        href="#cp-recipes"
        className="cp-button cp-hero-cta"
        data-magnetic
        data-story-action="recipe_jump"
        data-story-placement="hero"
      >
        <span>{count === 1 ? "See the free recipe" : `See the ${recipeCountLabel(count, "free")}`}</span>
        <span className="cp-hero-cta-arrow" aria-hidden="true">
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
    </header>
  );
}
