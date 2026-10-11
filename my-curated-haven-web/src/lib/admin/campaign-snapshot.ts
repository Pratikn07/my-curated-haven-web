import type { Campaign } from "../campaigns/types";

/**
 * The compact campaign record the console reads to know which recipes the deployed story pages promise
 * (`private.admin_campaign_recipe_slugs` accepts `recipeSlugs`). Built only from `CAMPAIGNS`, never the local
 * sample campaigns. Drafts are included: they are promises about to go out.
 */
export type CampaignSnapshot = { campaigns: { slug: string; status: string; recipeSlugs: string[] }[] };

export function buildCampaignSnapshot(campaigns: readonly Pick<Campaign, "slug" | "status" | "recipes">[]): CampaignSnapshot {
  const seen = new Set<string>();
  return {
    campaigns: campaigns.map((campaign) => {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(campaign.slug) || seen.has(campaign.slug)) {
        throw new Error(`Invalid or duplicate campaign slug: ${campaign.slug}`);
      }
      seen.add(campaign.slug);
      if (campaign.status !== "draft" && campaign.status !== "published") {
        throw new Error(`Campaign ${campaign.slug} has an unknown status`);
      }
      const recipeSlugs = campaign.recipes.map((recipe) => recipe.slug);
      if (recipeSlugs.length === 0 || recipeSlugs.some((slug) => typeof slug !== "string" || slug.length === 0)) {
        throw new Error(`Campaign ${campaign.slug} has no valid recipes`);
      }
      return { slug: campaign.slug, status: campaign.status, recipeSlugs };
    }),
  };
}

/** Stable text for hashing: keys are written in a fixed order by buildCampaignSnapshot. */
export function canonicalSnapshot(snapshot: CampaignSnapshot): string {
  return JSON.stringify(snapshot);
}
