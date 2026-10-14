// The recipe page's method content: validation, minutes, per-age lines and the time sentence.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  formatMinutes,
  hasPerAgeContent,
  methodHowTo,
  methodIngredientLines,
  methodProblem,
  methodTime,
  numberedSections,
  parseRecipeMethod,
  pickForAge,
  STEP_PHOTO_FOLDER,
  stepPhotoSrc,
  validateRecipeMethod,
} from "../../src/lib/recipes/method.ts";
import { allergenLine, getAllergenDisplay } from "../../src/lib/recipes/allergen-display.ts";

const example = JSON.parse(
  readFileSync(new URL("../fixtures/recipe-method-sample.json", import.meta.url), "utf8")
);
const clone = () => structuredClone(example);
const minimal = () => ({
  shortName: "Toast Fingers",
  handsOnMinutes: 15,
  totalMinutes: 15,
  waitLabel: "",
  makes: "8 fingers",
  safety: { all: ["Sit down to eat."] },
  contains: ["milk"],
  ingredientGroups: [{ name: null, items: [{ amount: "2", item: "slices of bread" }] }],
  tools: [],
  sections: [{ name: null, steps: [{ stage: "Toast", text: "Toast the bread." }] }],
  tips: [],
  storage: "",
  madeIt: "",
});

test("the sample method is valid, and review notes never reach the page data", () => {
  const method = validateRecipeMethod(example);
  assert.equal(method.shortName, "Snack Pops");
  assert.equal("review" in method, false);
  assert.equal(method.sections[0].steps.length, 4);
  assert.deepEqual(method.sections[0].steps[1].photo, {
    file: "synthetic-snack-pops-step-coated",
    caption: example.sections[0].steps[1].photo.caption,
  });
  assert.equal(methodProblem(example), null);
});

test("edge cases seen in real method files are valid", () => {
  // Empty tips and storage.
  assert.ok(parseRecipeMethod({ ...minimal(), tips: [], storage: "" }));
  // More than one waiting card (30 minutes, then 2 hours).
  const twoWaits = clone();
  twoWaits.sections[0].steps[1].wait = { title: "While it sets · 30 minutes", activity: { 2: "Sing a song." } };
  const parsed = parseRecipeMethod(twoWaits);
  assert.equal(parsed.sections[0].steps.filter((s) => s.wait).length, 2);
  // Per-age lines with only some ages, and a plain-string safety line on a step.
  const partial = minimal();
  partial.sections[0].steps[0] = { stage: "Cut", text: "Cut the toast into fingers.", toddler: { 3: "Count the fingers." }, safety: "Let it cool first." };
  assert.ok(parseRecipeMethod(partial));
  // Waiting in more than one place.
  assert.equal(parseRecipeMethod({ ...minimal(), totalMinutes: 115, waitLabel: "oven and fridge" }).waitLabel, "oven and fridge");
  // Missing optional lists read as empty.
  const bare = minimal();
  delete bare.tools;
  delete bare.tips;
  delete bare.contains;
  assert.deepEqual(parseRecipeMethod(bare).tools, []);
});

test("malformed method content is refused, so the page keeps today's layout", () => {
  const cases = {
    "not an object": "nope",
    "no steps": { ...minimal(), sections: [{ name: null, steps: [] }] },
    "no ingredients": { ...minimal(), ingredientGroups: [] },
    "total below hands-on": { ...minimal(), handsOnMinutes: 20, totalMinutes: 15 },
    "fractional minutes": { ...minimal(), handsOnMinutes: 1.5 },
    "a fourth age": { ...minimal(), safety: { all: [], byAge: { 4: "Older children" } } },
    "a photo name that leaves the folder": (() => {
      const m = minimal();
      m.sections[0].steps[0].photo = { file: "../../secrets", caption: "x" };
      return m;
    })(),
    "a photo name with a file type": (() => {
      const m = minimal();
      m.sections[0].steps[0].photo = { file: "toast.png", caption: "x" };
      return m;
    })(),
    "a wait with no activity": (() => {
      const m = minimal();
      m.sections[0].steps[0].wait = { title: "While it chills · 1 hour" };
      return m;
    })(),
    "an empty stage name": (() => {
      const m = minimal();
      m.sections[0].steps[0].stage = "  ";
      return m;
    })(),
    "a long wait label": { ...minimal(), totalMinutes: 30, waitLabel: "x".repeat(61) },
    "a list that is not a list": { ...minimal(), tips: "Chill the glass first." },
  };
  for (const [name, raw] of Object.entries(cases)) {
    assert.equal(parseRecipeMethod(raw), null, name);
    assert.equal(typeof methodProblem(raw), "string", name);
  }
  assert.equal(parseRecipeMethod(null), null);
  assert.equal(parseRecipeMethod(undefined), null);
  assert.equal(methodProblem({ ...minimal(), handsOnMinutes: 20, totalMinutes: 15 }), "totalMinutes");
});

test("minutes read like a recipe card", () => {
  assert.equal(formatMinutes(165), "2 hr 45 min");
  assert.equal(formatMinutes(150), "2 hr 30 min");
  assert.equal(formatMinutes(120), "2 hr");
  assert.equal(formatMinutes(61), "1 hr 1 min");
  assert.equal(formatMinutes(15), "15 min");
  assert.equal(formatMinutes(0), "0 min");
});

test("the time sentence and bar under Hands-on, Total and Makes", () => {
  const pops = methodTime(example);
  assert.equal(pops.handsOn, "15 min");
  assert.equal(pops.total, "2 hr 45 min");
  assert.equal(pops.sentence, "15 min of work, then 2 hr 30 min in the freezer.");
  assert.equal(pops.handsOnPercent, 9);
  assert.equal(methodTime({ handsOnMinutes: 15, totalMinutes: 15, waitLabel: "" }).sentence, "All 15 min is hands-on. No waiting.");
  assert.equal(methodTime({ handsOnMinutes: 15, totalMinutes: 15, waitLabel: "" }).handsOnPercent, 100);
  assert.equal(
    methodTime({ handsOnMinutes: 15, totalMinutes: 115, waitLabel: "oven and fridge" }).sentence,
    "15 min of work, then 1 hr 40 min in the oven and fridge."
  );
  assert.equal(methodTime({ handsOnMinutes: 10, totalMinutes: 40, waitLabel: "" }).sentence, "10 min of work, then 30 min of waiting.");
  // A tiny hands-on share still shows a sliver of the action color.
  assert.equal(methodTime({ handsOnMinutes: 5, totalMinutes: 600, waitLabel: "fridge" }).handsOnPercent, 6);
});

test("per-age lines: one line for all ages, a line per age, or nothing for a missing age", () => {
  assert.equal(pickForAge("Wash the pears.", "1"), "Wash the pears.");
  const toddler = { 2: "Place the eyes.", 3: "Draw the stripes, then place the eyes." };
  assert.equal(pickForAge(toddler, "2"), "Place the eyes.");
  assert.equal(pickForAge(toddler, "3"), "Draw the stripes, then place the eyes.");
  assert.equal(pickForAge(toddler, "1"), null);
  assert.equal(pickForAge(undefined, "2"), null);
  const step3 = validateRecipeMethod(example).sections[0].steps[2];
  assert.equal(pickForAge(step3.say, "1"), null);
  assert.match(pickForAge(step3.say, "3"), /count the eyes/);
});

test("the age switch shows only when something changes with the age", () => {
  assert.equal(hasPerAgeContent(validateRecipeMethod(example)), true);
  assert.equal(hasPerAgeContent(validateRecipeMethod(minimal())), false);
  const oneAgeLine = minimal();
  oneAgeLine.sections[0].steps[0].toddler = { 1: "Hold the spoon." };
  assert.equal(hasPerAgeContent(validateRecipeMethod(oneAgeLine)), true);
});

test("steps are numbered straight through sections, and structured data follows them", () => {
  const parts = minimal();
  parts.sections = [
    { name: "Base", steps: [{ stage: "Mix", text: "Mix." }, { stage: "Shape", text: "Shape." }] },
    { name: "Topping", steps: [{ stage: "Stir", text: "Stir." }] },
    { name: "Finish", steps: [{ stage: "Spread", text: "Spread." }, { stage: "Serve", text: "Serve." }] },
  ];
  const method = validateRecipeMethod(parts);
  assert.deepEqual(numberedSections(method).map((s) => s.start), [1, 3, 4]);
  const howTo = methodHowTo(method);
  assert.equal(howTo.length, 3);
  assert.deepEqual(howTo[0], {
    "@type": "HowToSection",
    name: "Base",
    itemListElement: [
      { "@type": "HowToStep", name: "Mix", text: "Mix." },
      { "@type": "HowToStep", name: "Shape", text: "Shape." },
    ],
  });
  const flat = methodHowTo(validateRecipeMethod(example));
  assert.equal(flat.length, 4);
  assert.deepEqual(flat[0], { "@type": "HowToStep", name: "Prep the fruit", text: example.sections[0].steps[0].text });
  assert.deepEqual(methodIngredientLines(validateRecipeMethod(example)).slice(0, 2), ["3 pears", "1 cup plain yogurt"]);
  // Step photos come from the public storage folder, never from the repo.
  assert.equal(STEP_PHOTO_FOLDER, "recipe-steps/halloween");
  assert.equal(stepPhotoSrc("https://example.supabase.co/", "synthetic-snack-pops-step-coated", 192),
    "https://example.supabase.co/storage/v1/object/public/recipe-steps/halloween/synthetic-snack-pops-step-coated-192.webp");
  assert.equal(stepPhotoSrc("http://127.0.0.1:54321", "synthetic-snack-pops-step-coated", 720),
    "http://127.0.0.1:54321/storage/v1/object/public/recipe-steps/halloween/synthetic-snack-pops-step-coated-720.webp");
});

test("the safety box's Contains line keeps every allergen review state", () => {
  assert.deepEqual(allergenLine(getAllergenDisplay("unknown", ["milk", "wheat"])), { kind: "contains", text: "milk, wheat" });
  assert.deepEqual(allergenLine(getAllergenDisplay("reviewed_listed", ["tree_nuts", "milk"])), { kind: "contains", text: "tree nuts, milk" });
  assert.deepEqual(allergenLine(getAllergenDisplay("unknown", [])), { kind: "message", text: "No allergens are listed for this recipe." });
  assert.deepEqual(allergenLine(getAllergenDisplay("reviewed_no_allergens", [])), {
    kind: "message",
    text: "Reviewed: No allergens were listed for this recipe. Please check all ingredient packaging carefully.",
  });
});
