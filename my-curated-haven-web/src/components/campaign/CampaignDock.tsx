import Image from "next/image";
import Link from "next/link";
import type { CampaignPageData } from "@/lib/data/load-campaign";
import { recipeCountLabel } from "@/lib/campaigns/validate";
import { usableImageSrc } from "@/lib/recipes/format";

/**
 * The promised recipe, one tap away from anywhere on the page. It slides up
 * once the hero's button has scrolled away and steps aside while the recipes
 * themselves, an offer or the end of the page is on screen (CampaignMotion
 * sets data-visible). Hidden and out of the tab order until then, and never
 * shown without the script, where the hero's button is the way down.
 */
export default function CampaignDock({ data }: { data: CampaignPageData }) {
  const { recipes, hero } = data;
  const single = recipes.length === 1 ? recipes[0] : null;
  const thumb = usableImageSrc(single?.previewImagePath) ?? hero.src;

  return (
    <div className="cp-dock" data-visible="false">
      <div className="cp-dock-inner" data-recipe-id={single?.id} data-recipe-position={single ? 1 : undefined}>
        <span className="cp-dock-thumb" aria-hidden="true">
          <Image src={thumb} alt="" fill sizes="56px" />
        </span>
        <span className="cp-dock-text">
          <span className="cp-dock-kicker">{single ? "Free recipe" : recipeCountLabel(recipes.length, "free")}</span>
          <span className="cp-dock-title">{single ? single.title : "Waiting for you above"}</span>
        </span>
        {single ? (
          <Link
            href={`/recipes/${single.slug}`}
            prefetch={false}
            className="cp-button cp-dock-cta"
            data-story-action="campaign_recipe"
            data-story-placement="sticky"
          >
            <span className="cp-button-label">Open recipe</span>
            <span className="cp-button-icon" aria-hidden="true">
              →
            </span>
          </Link>
        ) : (
          <a href="#cp-recipes" className="cp-button cp-dock-cta" data-story-action="recipe_jump" data-story-placement="sticky">
            <span className="cp-button-label">Jump to them</span>
            <span className="cp-button-icon" aria-hidden="true">
              ↑
            </span>
          </a>
        )}
      </div>
    </div>
  );
}
