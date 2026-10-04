// Campaign landing pages: every configured campaign is valid, and the recipe
// layout is planned from the count rather than a fixed three-card grid.
import assert from "node:assert/strict";
import test from "node:test";
import { CAMPAIGNS, LOCAL_SAMPLE_CAMPAIGNS } from "../../src/config/campaigns.ts";
import { KITCHEN_STORY } from "../../src/config/kitchen-story.ts";
import {
  parseCampaignTitle,
  plainCampaignTitle,
  planRecipeLayout,
  recipeCountLabel,
  validateCampaign,
} from "../../src/lib/campaigns/validate.ts";

test("every configured campaign is valid and has a unique slug", () => {
  const all = [...CAMPAIGNS, ...LOCAL_SAMPLE_CAMPAIGNS];
  for (const campaign of all) {
    assert.deepEqual(validateCampaign(campaign), [], campaign.slug);
  }
  const slugs = all.map((campaign) => campaign.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("the first post's address keeps working", () => {
  const first = CAMPAIGNS.find((campaign) => campaign.slug === "frittata-fingers");
  assert.ok(first);
  assert.equal(first.status, "published");
  assert.equal(first.recipes[0].slug, "sweet-potato-and-spinach-frittata-fingers");
});

test("the kitchen story is valid on its own", () => {
  const errors = validateCampaign({ ...CAMPAIGNS[0], story: KITCHEN_STORY });
  assert.deepEqual(errors, []);
  assert.equal(KITCHEN_STORY.moments.length, 5);
  for (const moment of KITCHEN_STORY.moments) {
    assert.ok(moment.image.alt.includes("Bhagyashree") || moment.image.alt.includes("Anaika"), moment.label);
  }
});

test("invalid campaigns are reported, not served", () => {
  const base = LOCAL_SAMPLE_CAMPAIGNS[0];
  assert.ok(validateCampaign({ ...base, slug: "Not A Slug" }).length > 0);
  assert.ok(validateCampaign({ ...base, recipes: [] }).length > 0);
  assert.ok(validateCampaign({ ...base, recipes: [{ slug: "a" }, { slug: "a" }] }).length > 0);
  assert.ok(validateCampaign({ ...base, title: "An *unclosed emphasis" }).length > 0);
  assert.ok(validateCampaign({ ...base, hero: { src: "recipe-previews/x.webp", alt: "x" } }).length > 0);
  assert.ok(validateCampaign({ ...base, wayBackKeyword: "lower case" }).length > 0);
  assert.ok(validateCampaign({ ...base, analytics: { series: "Halloween 2026!" } }).length > 0);
});

test("titles mark one phrase in italics without reading HTML", () => {
  assert.deepEqual(parseCampaignTitle("3 Breakfasts *Worth Saving*"), [
    { text: "3 Breakfasts ", emphasis: false },
    { text: "Worth Saving", emphasis: true },
  ]);
  assert.deepEqual(parseCampaignTitle("<b>x</b>"), [{ text: "<b>x</b>", emphasis: false }]);
  assert.equal(plainCampaignTitle("3 recipes *small hands can hold.*"), "3 recipes small hands can hold.");
});

test("the recipe layout follows the number of recipes", () => {
  assert.equal(planRecipeLayout(1).layout, "single");
  assert.equal(planRecipeLayout(2).layout, "pair");
  assert.equal(planRecipeLayout(3).layout, "trio");
  const columns = Object.fromEntries([4, 5, 6, 7, 8, 9, 12].map((n) => [n, planRecipeLayout(n).columns]));
  assert.deepEqual(columns, { 4: 4, 5: 3, 6: 3, 7: 4, 8: 4, 9: 3, 12: 3 });
  // No grid leaves a single card alone on its last row.
  for (let count = 4; count <= 12; count += 1) {
    const { columns: perRow } = planRecipeLayout(count);
    assert.notEqual(count % perRow, 1, `${count} recipes in ${perRow} columns`);
  }
  assert.equal(planRecipeLayout(2).compactOnPhones, false);
  assert.equal(planRecipeLayout(5).compactOnPhones, true);
});

test("recipe counts read naturally", () => {
  assert.equal(recipeCountLabel(1, "free"), "1 free recipe");
  assert.equal(recipeCountLabel(5, "free"), "5 free recipes");
  assert.equal(recipeCountLabel(8), "8 recipes");
});
