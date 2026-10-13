// "You're in" sends a buyer back to the recipe they tapped "Buy now" on, only when that recipe is in the book bought.
import assert from "node:assert/strict";
import test from "node:test";
import { BOUGHT_FROM_MAX_AGE_MS, pickBoughtFrom } from "../../src/lib/recipes/bought-from.ts";

const NOW = 1_800_000_000_000;
const BOOK = ["berry-ghost-yogurt-bark", "witchs-broomsticks"];
const stored = (value) => JSON.stringify({ collection: "halloween", recipe: "witchs-broomsticks", at: NOW - 60_000, ...value });

test("returns the recipe when it is in the book bought, recently", () => {
  assert.equal(pickBoughtFrom(stored(), "halloween", BOOK, NOW), "witchs-broomsticks");
});

test("ignores another book, a recipe outside the book, or nothing stored", () => {
  assert.equal(pickBoughtFrom(stored({ collection: "meal-prep" }), "halloween", BOOK, NOW), null);
  assert.equal(pickBoughtFrom(stored({ recipe: "salmon-and-pea-fish-cakes" }), "halloween", BOOK, NOW), null);
  assert.equal(pickBoughtFrom(null, "halloween", BOOK, NOW), null);
});

test("ignores stale, future-dated and malformed values", () => {
  assert.equal(pickBoughtFrom(stored({ at: NOW - BOUGHT_FROM_MAX_AGE_MS - 1 }), "halloween", BOOK, NOW), null);
  assert.equal(pickBoughtFrom(stored({ at: NOW + 60_000 }), "halloween", BOOK, NOW), null);
  assert.equal(pickBoughtFrom("{not json", "halloween", BOOK, NOW), null);
  assert.equal(pickBoughtFrom(JSON.stringify(["witchs-broomsticks"]), "halloween", BOOK, NOW), null);
  assert.equal(pickBoughtFrom(stored({ recipe: 42 }), "halloween", BOOK, NOW), null);
});
