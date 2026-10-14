// The make-ahead plan: the public preview fits the Halloween book, the paid half is checked before any page shows
// it, and the load script keeps paid content out of the repository. The plan here is an invented fixture with the
// real plan's shape; the real plan lives only in the database.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

register("../../scripts/ts-alias-hooks.mjs", import.meta.url);
const { joinMakeAheadPlan, parseMakeAheadPlanContent, shoppingItemId, shoppingListText } = await import("../../src/lib/collections/make-ahead.ts");
const { HALLOWEEN_MAKE_AHEAD_PLAN, makeAheadPlanFor } = await import("../../src/config/halloween.ts");
const { SHOWROOM_COLLECTIONS } = await import("../../src/config/collections.ts");
const { assertWriteAllowed, databaseTarget, digest, parseArgs, planFileOutsideRepo } = await import("../../scripts/load-make-ahead-plan.mjs");

const FIXTURE_PATH = new URL("../fixtures/make-ahead-plan.fixture.json", import.meta.url);
const fixture = () => JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
const preview = HALLOWEEN_MAKE_AHEAD_PLAN.preview;
const book = SHOWROOM_COLLECTIONS.find((collection) => collection.slug === "halloween");

function parseWith(change) {
  const raw = fixture();
  change(raw);
  return parseMakeAheadPlanContent(raw, preview);
}

test("only the Halloween book has a plan, and it stays reachable with no date rule", () => {
  assert.equal(makeAheadPlanFor("halloween"), HALLOWEEN_MAKE_AHEAD_PLAN);
  assert.equal(HALLOWEEN_MAKE_AHEAD_PLAN.path, "/collections/halloween/plan");
  for (const other of SHOWROOM_COLLECTIONS.filter((collection) => collection.slug !== "halloween")) {
    assert.equal(makeAheadPlanFor(other.slug), null, other.slug);
  }
  assert.equal(makeAheadPlanFor("__proto__"), null);
});

test("the preview's 6 menu dishes are recipes in the Halloween book, each with its main photo", () => {
  const bookSlugs = new Set(book.recipes.map((recipe) => recipe.slug));
  assert.equal(preview.menu.length, 6);
  assert.equal(new Set(preview.menu.map((dish) => dish.slug)).size, 6);
  for (const dish of preview.menu) {
    assert.ok(bookSlugs.has(dish.slug), `${dish.slug} is in the Halloween book`);
    assert.ok(existsSync(new URL(`../../public/images/recipes/${dish.slug}-1040.webp`, import.meta.url)), `${dish.slug} photo`);
  }
  assert.deepEqual(preview.days.map((day) => day.dom), ["29", "30", "31"]);
});

test("the preview carries no paid fields", () => {
  const allowed = new Set(["byline", "title", "lede", "menuHeading", "menu", "daysHeading", "days"]);
  assert.deepEqual(Object.keys(preview).filter((key) => !allowed.has(key)), []);
  for (const dish of preview.menu) assert.deepEqual(Object.keys(dish).sort(), ["name", "slug"]);
  for (const day of preview.days) assert.deepEqual(Object.keys(day).sort(), ["dom", "dow", "heading", "mon", "pill", "time"]);
});

test("a well-formed plan parses, and joins the preview in the preview's order", () => {
  const parsed = parseMakeAheadPlanContent(fixture(), preview);
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.errors.join("; "));
  const plan = joinMakeAheadPlan(preview, parsed.content);
  assert.equal(plan.title, preview.title);
  assert.deepEqual(plan.menu.map((dish) => dish.slug), preview.menu.map((dish) => dish.slug));
  assert.ok(plan.menu.every((dish) => dish.label.startsWith("Fixture")));
  assert.deepEqual(plan.days.map((day) => [day.heading, day.tasks.length]), [["Freezer night", 1], ["Fridge day", 1], ["Halloween", 2]]);
  const items = plan.shopping.aisles.flatMap((aisle) => aisle.items);
  assert.ok(items.length > 0, "the shopping list is not empty");
  assert.equal(items[0].id, "stardust-yogurt");
  assert.equal(shoppingItemId("100% fruit juice, no added sugar"), "100-fruit-juice-no-added-sugar");
});

test("Copy list gives aisles in capitals and one line per item", () => {
  const parsed = parseMakeAheadPlanContent(fixture(), preview);
  const text = shoppingListText(joinMakeAheadPlan(preview, parsed.content));
  assert.ok(text.startsWith("Fixture moon party list\n\nFIXTURE COLD AISLE\n- Stardust yogurt, 2 fixture tubs\n"));
  assert.ok(text.endsWith("\n\nFIXTURE CHECK YOU HAVE\n- Rocket sticks"));
  assert.equal(text.split("\n").filter((line) => line.startsWith("- ")).length, 5);
});

test("a plan that doesn't fit is refused whole, naming fields but not words", () => {
  const cases = [
    ["not an object", (raw) => Object.assign(raw, { menu: "x" })],
    ["a missing dish", (raw) => raw.menu.pop()],
    ["a dish outside the menu", (raw) => { raw.menu[0].slug = "candy-corn-parfaits"; }],
    ["an unknown pill", (raw) => { raw.menu[0].when = "oven"; }],
    ["a link to a recipe outside the menu", (raw) => { raw.days[0].tasks[0].steps[0][0].slug = "monster-energy-balls"; }],
    ["days out of order", (raw) => raw.days.reverse()],
    ["a missing day", (raw) => raw.days.pop()],
    ["an empty shopping list", (raw) => { raw.shopping.aisles = []; }],
    ["two items with one name", (raw) => raw.shopping.aisles[0].items.push({ ...raw.shopping.aisles[0].items[0] })],
    ["a blank step", (raw) => { raw.days[1].tasks[0].steps[1] = [" "]; }],
    ["an unknown field", (raw) => { raw.extra = true; }],
    ["a later version", (raw) => { raw.version = 2; }],
    ["a huge string", (raw) => { raw.freeOf = "x".repeat(5000); }],
  ];
  for (const [name, change] of cases) {
    const result = parseWith(change);
    assert.equal(result.ok, false, name);
    for (const error of result.errors) assert.ok(!error.includes("Stardust") && !error.includes("Comet"), `${name}: ${error}`);
  }
  assert.equal(parseMakeAheadPlanContent(null, preview).ok, false);
  assert.equal(parseMakeAheadPlanContent([], preview).ok, false);
});

test("the load script refuses a plan file inside the repository and a remote write without --confirm-host", () => {
  assert.throws(() => planFileOutsideRepo(FIXTURE_PATH.pathname), /inside the repository/);
  const dir = mkdtempSync(join(tmpdir(), "mch-plan-"));
  try {
    const outside = join(dir, "plan.json");
    writeFileSync(outside, "{}");
    assert.equal(planFileOutsideRepo(outside).endsWith("plan.json"), true);
    assert.throws(() => planFileOutsideRepo(join(dir, "missing.json")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  assert.throws(() => parseArgs(["--file", "x.json"]), /--db-url-env/);
  assert.throws(() => parseArgs(["--db-url-env", "X"]), /--file/);
  assert.equal(parseArgs(["--file", "x.json", "--db-url-env", "X"]).apply, false, "dry run by default");

  const local = databaseTarget("postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  const remote = databaseTarget("postgresql://user:secret@db.example.test:5432/postgres");
  assert.equal(local.local, true);
  assert.equal(remote.local, false);
  assert.ok(!remote.label.includes("secret"));
  assert.doesNotThrow(() => assertWriteAllowed(local, { apply: true }));
  assert.doesNotThrow(() => assertWriteAllowed(remote, { apply: false }));
  assert.throws(() => assertWriteAllowed(remote, { apply: true }), /--confirm-host/);
  assert.throws(() => assertWriteAllowed(remote, { apply: true, "confirm-host": "db.other.test" }), /does not match/);
  assert.doesNotThrow(() => assertWriteAllowed(remote, { apply: true, "confirm-host": "db.example.test" }));
  assert.equal(digest({ b: 1, a: [1, { d: 2, c: 3 }] }), digest({ a: [1, { c: 3, d: 2 }], b: 1 }), "key order is ignored");
});
