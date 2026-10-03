import assert from "node:assert/strict";
import test from "node:test";
import {
  inputFromStored,
  parseRecipeForm,
  publishProblems,
  slugify,
  toSavePayload,
} from "../../src/lib/admin/recipe-input.ts";
import { ADMIN_WRITE_MESSAGES, classifyAdminError } from "../../src/lib/admin/errors.ts";

function form(fields) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const entry of Array.isArray(value) ? value : [value]) data.append(name, entry);
  }
  return data;
}

const COMPLETE = {
  title: "Soft Oat Bars",
  slug: "",
  summary: "Chewy oat bars for small hands.",
  imageUrl: "http://127.0.0.1:54321/storage/v1/object/public/recipe-previews/admin/a.webp",
  totalMinutes: "25",
  meal: ["Snack", "Breakfast"],
  diet: ["Vegetarian"],
  yieldText: "12 small bars",
  ingredientAmount: ["1 cup", "", ""],
  ingredientItem: ["rolled oats", "banana, mashed", ""],
  step: ["Mix everything.", "", "Bake for 20 minutes."],
  tips: "",
  storageNotes: "Fridge for 3 days.",
  allergenReviewState: "reviewed_listed",
  allergen: ["Wheat", "Not an allergen"],
};

test("slugify matches the database rules and collapses repeated dashes", () => {
  assert.equal(slugify("Sweet Potato & Spinach Frittata Fingers"), "sweet-potato-and-spinach-frittata-fingers");
  assert.equal(slugify("  Mum's -- Best   Bars!  "), "mums-best-bars");
  assert.equal(slugify("x".repeat(100)).length, 80);
});

test("a complete recipe parses, fills the web address and drops blank rows", () => {
  const result = parseRecipeForm(form(COMPLETE));
  assert.equal(result.ok, true);
  const recipe = result.value;
  assert.equal(recipe.slug, "soft-oat-bars");
  assert.equal(recipe.totalMinutes, 25);
  assert.deepEqual(recipe.ingredients, [
    { amount: "1 cup", item: "rolled oats" },
    { amount: "", item: "banana, mashed" },
  ]);
  assert.deepEqual(recipe.steps, ["Mix everything.", "Bake for 20 minutes."]);
  assert.equal(recipe.tips, null);
  assert.deepEqual(recipe.allergens, ["Wheat"], "unknown allergen names are ignored");
  assert.deepEqual(publishProblems(recipe), []);
});

test("a draft only needs a name, but cannot go live until it is complete", () => {
  const result = parseRecipeForm(form({ title: "Just an idea" }));
  assert.equal(result.ok, true);
  assert.deepEqual(publishProblems(result.value), [
    "Add a short summary (at least 10 characters).",
    "Add a photo.",
    "Say how much it makes.",
    "Add the ingredients.",
    "Add the steps.",
    "Check the allergens and choose what the recipe contains.",
  ]);
});

test("invalid fields come back with plain messages", () => {
  const result = parseRecipeForm(
    form({
      title: "No",
      totalMinutes: "ten",
      ingredientAmount: ["2 tbsp"],
      ingredientItem: [""],
      allergenReviewState: "reviewed_listed",
      meal: ["<script>"],
    })
  );
  assert.equal(result.ok, false);
  assert.match(result.errors.title, /at least 3/);
  assert.match(result.errors.totalMinutes, /whole minutes/);
  assert.match(result.errors.ingredients, /no ingredient/);
  assert.match(result.errors.allergens, /Tick the allergens/);
  assert.match(result.errors.labels, /listed meal and diet/);
});

test("a typed web address must be a valid slug", () => {
  const result = parseRecipeForm(form({ ...COMPLETE, slug: "oat bars!" }));
  assert.equal(result.ok, false);
  assert.match(result.errors.slug, /lowercase letters/);
});

test("choosing no allergens clears any ticked ones", () => {
  const result = parseRecipeForm(form({ ...COMPLETE, allergenReviewState: "reviewed_no_allergens" }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.allergens, []);
});

test("the save payload omits empty ingredient amounts", () => {
  const result = parseRecipeForm(form(COMPLETE));
  const payload = toSavePayload(result.value);
  assert.deepEqual(payload.ingredients, [{ amount: "1 cup", item: "rolled oats" }, { item: "banana, mashed" }]);
  assert.equal(payload.yield, "12 small bars");
  assert.equal(payload.tips, "");
});

test("older recipe formats open in the editor", () => {
  const recipe = inputFromStored({
    title: "Legacy",
    slug: "legacy",
    ingredients: ["2 eggs", { amount: "1", unit: "cup", item: "milk" }, { item: "" }],
    instructions: ["Whisk.", { step: 2, text: "Cook." }],
    allergenReviewState: "something-else",
    totalMinutes: 15,
    mealLabels: ["Breakfast", 3],
  });
  assert.deepEqual(recipe.ingredients, [
    { amount: "", item: "2 eggs" },
    { amount: "1 cup", item: "milk" },
  ]);
  assert.deepEqual(recipe.steps, ["Whisk.", "Cook."]);
  assert.equal(recipe.allergenReviewState, "unknown");
  assert.deepEqual(recipe.mealLabels, ["Breakfast"]);
});

test("database error codes map to editor messages", () => {
  assert.equal(classifyAdminError({ code: "MCSTL" }), "stale");
  assert.equal(classifyAdminError({ code: "23505" }), "slug_taken");
  assert.equal(classifyAdminError({ code: "MCFRE" }), "free_recipe");
  assert.equal(classifyAdminError({ code: "PGRST301" }), "unavailable");
  assert.equal(classifyAdminError(null), "unavailable");
  for (const message of Object.values(ADMIN_WRITE_MESSAGES)) assert.ok(message.length > 0);
});
