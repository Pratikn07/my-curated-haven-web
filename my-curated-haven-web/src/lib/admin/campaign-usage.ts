import type { Campaign } from "../campaigns/types";

export type CampaignUsageRef = {
  slug: string;
  status: "draft" | "published";
  recipeSlugs: string[];
  promisedCount: number;
  deploymentRevision: string | null;
};

export function loadCampaignUsage(
  slug: string,
  revision: string | null,
  campaigns: readonly Campaign[],
): { ok: true; value: CampaignUsageRef[] } {
  const refs = campaigns
    .filter((c) => c.recipes.some((r) => r.slug === slug))
    .map((c) => ({
      slug: c.slug,
      status: c.status,
      recipeSlugs: c.recipes.map((r) => r.slug),
      promisedCount: c.recipes.length,
      deploymentRevision: revision,
    }));
  return { ok: true, value: refs };
}
