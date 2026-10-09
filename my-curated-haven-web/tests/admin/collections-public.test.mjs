import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("../../scripts/ts-alias-hooks.mjs", import.meta.url);
const { databaseShowroomCollection, freezeNote } = await import("../../src/lib/collections/publication-map.ts");
const { collectionFacts } = await import("../../src/lib/collections/visibility.ts");

const row = {
  collection_id: "c", publication_id: "p", release_id: "r", slug: "first-foods", title: "First foods",
  tagline: "Soft starts", story: "Gentle.", for_when: "Starting solids", refresh: "New each season", shelf: "mornings",
  sort_order: 1, stage_min: 6, stage_max: 12, series_key: "breakfast", series_volume: 1, listing_state: "listed",
  availability: "open", cloth: "sage", cover: null,
  members: [{ recipeId: "b", slug: "pear", position: 2 }, { recipeId: "a", slug: "apple", position: 1 }],
};
const facts = new Map([
  ["a", { id: "a", slug: "apple", title: "Apple", total_minutes: 10, preview_image_path: "recipe-previews/a.webp",
    publication_state: "published", allergens: [], storage_notes: "Freeze in small pots for up to 2 months." }],
  ["b", { id: "b", slug: "pear", title: "Pear", total_minutes: null, preview_image_path: null,
    publication_state: "draft", allergens: ["milk"], storage_notes: null }],
]);

test("a database record keeps its own order, words and members; hints come from config only", () => {
  const hint = { inShowroom: true, placeholderPrice: "$7.99", title: "Stale configured title", recipes: [{ slug: "stale" }] };
  const c = databaseShowroomCollection(row, facts, hint, (p) => (p ? `/img/${p}` : null));
  assert.deepEqual(c.recipes.map((r) => r.slug), ["apple", "pear"]);
  assert.equal(c.title, "First foods");
  assert.equal(c.inShowroom, true);
  assert.equal(c.placeholderPrice, "$7.99");
  assert.deepEqual(c.series, { key: "breakfast", volume: 1 });
  assert.equal(c.recipes[0].href, "/recipes/apple");
  assert.equal(c.recipes[1].href, undefined, "unpublished recipes carry no link");
  assert.equal(c.recipes[0].freezes, "2 months");
  assert.equal(c.recipes[0].image, "/img/recipe-previews/a.webp");
});

test("freeze notes only claim a time that is stated", () => {
  assert.equal(freezeNote("Freeze for up to 3 weeks."), "3 weeks");
  assert.equal(freezeNote("Keeps in the fridge for 3 days."), null);
  assert.equal(freezeNote(null), null);
});

test("an empty collection makes no claims about its recipes", () => {
  assert.deepEqual(collectionFacts({ recipes: [] }), ["0 recipes"]);
  assert.deepEqual(collectionFacts({ recipes: [{ minutes: 20, freezes: "2 months" }] }), ["1 recipe", "all under an hour", "all freeze"]);
});
