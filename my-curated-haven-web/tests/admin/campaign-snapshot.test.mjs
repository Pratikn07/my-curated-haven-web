import assert from "node:assert/strict";
import test from "node:test";
import { CAMPAIGNS } from "../../src/config/campaigns.ts";
import { buildCampaignSnapshot, canonicalSnapshot } from "../../src/lib/admin/campaign-snapshot.ts";

test("the snapshot lists every configured campaign with the recipe slugs it promises", () => {
  const snapshot = buildCampaignSnapshot(CAMPAIGNS);
  assert.deepEqual(snapshot.campaigns.map((c) => c.slug), CAMPAIGNS.map((c) => c.slug));
  const frittata = snapshot.campaigns.find((c) => c.slug === "frittata-fingers");
  assert.deepEqual(frittata, { slug: "frittata-fingers", status: "draft",
    recipeSlugs: ["sweet-potato-and-spinach-frittata-fingers", "soft-baked-blueberry-and-oat-bars", "salmon-and-pea-fish-cakes"] });
  assert.ok(!snapshot.campaigns.some((c) => c.slug.startsWith("local-sample")), "local sample campaigns stay out");
});

test("the canonical text is stable, so the same campaigns give the same hash", () => {
  assert.equal(canonicalSnapshot(buildCampaignSnapshot(CAMPAIGNS)), canonicalSnapshot(buildCampaignSnapshot([...CAMPAIGNS])));
});

test("duplicate slugs, unknown statuses and empty recipe lists are refused", () => {
  const one = { slug: "a", status: "published", recipes: [{ slug: "r" }] };
  assert.throws(() => buildCampaignSnapshot([one, one]), /duplicate/);
  assert.throws(() => buildCampaignSnapshot([{ ...one, status: "archived" }]), /unknown status/);
  assert.throws(() => buildCampaignSnapshot([{ ...one, recipes: [] }]), /no valid recipes/);
});
