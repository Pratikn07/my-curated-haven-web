import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildTagImportReport, parseTagSource, tagProblems } from "../../src/lib/admin/recipe-tags.ts";

const ROOT = new URL("../../../", import.meta.url);
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const source = JSON.parse(readFileSync(new URL("docs/implementation/recipe-collections/recipe-tags.json", ROOT), "utf8"));
const migration = readFileSync(new URL("supabase/migrations/20261008001000_admin_recipe_tags.sql", ROOT), "utf8");

/** The vocabulary the migration seeds, read from its INSERT statements. */
function seededVocabulary() {
  const categories = [...migration.matchAll(/\('([a-z_]+)',(true|false),\d+\)/g)].map(([, category, multiple]) =>
    ({ category, multiple: multiple === "true", values: [] }));
  for (const [, category, value] of migration.matchAll(/\('([a-z_]+)','([a-z0-9-]+)',\d+\)/g)) {
    categories.find((c) => c.category === category).values.push(value);
  }
  return categories;
}

test("the migration's vocabulary holds every reviewed tag in recipe-tags.json, so the import loses nothing", () => {
  const vocabulary = seededVocabulary();
  assert.equal(vocabulary.length, 7);
  const parsed = parseTagSource(source, sha256);
  assert.equal(parsed.recipes.length, 70);
  const problems = parsed.recipes.flatMap((r) => tagProblems(r.tags, vocabulary).map((p) => `${r.slug}: ${p}`));
  assert.deepEqual(problems, []);
});

test("tag validation matches the database rules", () => {
  const vocabulary = seededVocabulary();
  const tags = parseTagSource(source, sha256).recipes[0].tags;
  assert.deepEqual(tagProblems({ ...tags, texture: null }, vocabulary), []);
  assert.match(tagProblems({ ...tags, occasion: undefined, colour: [] }, vocabulary).join(), /unknown category colour/);
  assert.match(tagProblems(Object.fromEntries(Object.entries(tags).filter(([k]) => k !== "goal")), vocabulary).join(), /missing category goal/);
  assert.match(tagProblems({ ...tags, meal: ["brunch"] }, vocabulary).join(), /unknown meal value brunch/);
  assert.match(tagProblems({ ...tags, meal: ["lunch", "lunch"] }, vocabulary).join(), /repeats a value/);
  assert.match(tagProblems({ ...tags, texture: ["puree"] }, vocabulary).join(), /unknown texture value/);
});

test("the import report imports only untagged versions and names drafts that must rebase", () => {
  const vocabulary = seededVocabulary();
  const parsed = parseTagSource(source, sha256);
  const [a, b, c, d, e] = parsed.recipes;
  const row = (recipe, extra) => ({ slug: recipe.slug, recipeId: `id-${recipe.slug}`, contentVersion: 2, currentTags: null,
    openRecipeDraft: false, collectionDrafts: 0, ...extra });
  const report = buildTagImportReport({ source: { ...parsed, recipes: [a, b, c, d, e, { ...e, slug: "missing" }] },
    vocabulary, database: [row(a, { openRecipeDraft: true, collectionDrafts: 2 }), row(b, { currentTags: b.tags }),
      row(c, { currentTags: { ...c.tags, texture: null } }), row(d, { contentVersion: null }),
      row(e, {})] });
  assert.deepEqual(report.rows.map((r) => r.status), ["import", "unchanged", "different", "missing_body", "import", "missing_recipe"]);
  assert.deepEqual(report.importable.map((r) => r.slug), [a.slug, e.slug]);
  assert.equal(report.rows[0].openRecipeDraft, true);
  assert.equal(report.rows[0].collectionDrafts, 2);
  assert.equal(report.counts.import, 2);
  assert.equal(parseTagSource(source, sha256).sourceDigest, parsed.sourceDigest, "the source digest is stable");
});
