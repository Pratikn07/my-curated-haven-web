import assert from "node:assert/strict";
import test from "node:test";
import {
  APPROVED_HOMEPAGE_RECIPE_STATE,
  DEFAULT_HOMEPAGE_RECIPE_STATE,
  HOMEPAGE_RECIPE_STATE,
  projectHomepageRecipes,
  resolveHomepageRecipeState,
} from "../../src/config/homepage-content.ts";

test("homepage recipe state defaults to preparation", () => {
  assert.deepEqual(DEFAULT_HOMEPAGE_RECIPE_STATE, { mode: "preparation" });
  assert.deepEqual(resolveHomepageRecipeState(), { mode: "preparation" });
});

test("missing or unsafe homepage recipe state falls back to preparation", () => {
  assert.deepEqual(resolveHomepageRecipeState(null), { mode: "preparation" });
  assert.deepEqual(resolveHomepageRecipeState({ mode: "free_ready", approvedRecipeSlugs: [] }), {
    mode: "preparation",
  });
  assert.deepEqual(
    resolveHomepageRecipeState({
      mode: "collection_ready",
      approvedRecipeSlugs: ["toddler-pancakes"],
      collection: {
        slug: "spring-menu",
        href: "https://retailer.example/checkout",
        releaseVersion: "offer-v2",
        ownerApproved: true,
        summary: "A family collection",
      },
    }),
    { mode: "preparation" },
  );
});

test("collection-ready state requires an approved canonical collection reference", () => {
  const resolved = resolveHomepageRecipeState({
    mode: "collection_ready",
    approvedRecipeSlugs: ["toddler-pancakes"],
    collection: {
      slug: "spring-menu",
      href: "/collections/spring-menu",
      releaseVersion: "offer-v2",
      ownerApproved: true,
      summary: "A collection of complete family recipes.",
    },
  });
  assert.equal(resolved.mode, "collection_ready");

  assert.deepEqual(
    resolveHomepageRecipeState({
      mode: "collection_ready",
      approvedRecipeSlugs: ["toddler-pancakes"],
      collection: {
        slug: "spring-menu",
        href: "/collections/other-menu",
        releaseVersion: "offer-v2",
        ownerApproved: false,
        summary: "A collection of complete family recipes.",
      },
    }),
    { mode: "preparation" },
  );
});

test("homepage recipe projection keeps assigned slot order and excludes unapproved items", () => {
  const state = resolveHomepageRecipeState({
    mode: "free_ready",
    approvedRecipeSlugs: ["banana-oat-pancakes", "lentil-rice-bowl", "apple-muffins"],
  });
  assert.equal(state.mode, "free_ready");
  const slots = [
    { slot: 3, recipe: { slug: "apple-muffins" } },
    { slot: 1, recipe: { slug: "published-but-not-approved" } },
    { slot: 2, recipe: { slug: "banana-oat-pancakes" } },
    { slot: 4, recipe: { slug: "lentil-rice-bowl" } },
    { slot: 5, recipe: { slug: "fourth-approved-recipe" } },
  ];

  assert.deepEqual(
    projectHomepageRecipes(state, slots).map(({ recipe }) => recipe.slug),
    ["banana-oat-pancakes", "apple-muffins", "lentil-rice-bowl"],
  );
});

test("preparation state never projects recipe cards", () => {
  assert.deepEqual(
    projectHomepageRecipes(DEFAULT_HOMEPAGE_RECIPE_STATE, [
      { slot: 1, recipe: { slug: "any-recipe" } },
    ]),
    [],
  );
});

test("the live homepage state is free_ready with the three approved slugs", () => {
  assert.equal(HOMEPAGE_RECIPE_STATE.mode, "free_ready");
  assert.deepEqual(HOMEPAGE_RECIPE_STATE, {
    mode: "free_ready",
    approvedRecipeSlugs: [...APPROVED_HOMEPAGE_RECIPE_STATE.approvedRecipeSlugs],
  });
  assert.equal(HOMEPAGE_RECIPE_STATE.approvedRecipeSlugs.length, 3);
});
