import { CAMPAIGNS, LOCAL_SAMPLE_CAMPAIGNS } from "@/config/campaigns";
import type { Campaign } from "@/lib/campaigns/types";
import { CAMPAIGN_SLUG_PATTERN, validateCampaign } from "@/lib/campaigns/validate";
import { isHostedDeploy } from "@/lib/supabase/env";

/**
 * Where campaigns come from. Today that is src/config/campaigns.ts; an admin
 * backed by the database can implement the same two methods later, and the
 * page and loader will not change.
 */
export interface CampaignSource {
  list(): Promise<readonly Campaign[]>;
  get(slug: string): Promise<Campaign | null>;
}

function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

/** Published campaigns everywhere, drafts everywhere but production, local samples never on Vercel. */
function servable(campaign: Campaign): boolean {
  if (campaign.status === "draft" && isProduction()) return false;
  const errors = validateCampaign(campaign);
  if (errors.length > 0) {
    console.error("[campaigns] Not serving an invalid campaign", { slug: campaign.slug, errors });
    return false;
  }
  return true;
}

export const configCampaignSource: CampaignSource = {
  async list() {
    const all = isHostedDeploy() ? CAMPAIGNS : [...CAMPAIGNS, ...LOCAL_SAMPLE_CAMPAIGNS];
    return all.filter(servable);
  },
  async get(slug) {
    if (!CAMPAIGN_SLUG_PATTERN.test(slug)) return null;
    return (await this.list()).find((campaign) => campaign.slug === slug) ?? null;
  },
};

export function getCampaign(slug: string): Promise<Campaign | null> {
  return configCampaignSource.get(slug);
}
