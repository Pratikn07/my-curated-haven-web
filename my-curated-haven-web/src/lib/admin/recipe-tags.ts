/**
 * Reviewed recipe tags. Each category is a list of vocabulary values, or one value for a single-value
 * category (texture). The database validates the same rules (private.recipe_tags_valid); this module
 * mirrors them for the import report and the editor.
 */
export type RecipeTags = Record<string, string[] | string | null>;
export type TagCategory = { category: string; multiple: boolean; values: string[] };

export const TAG_LABELS: Record<string, string> = {
  stage: "Ages", meal: "Meal", goal: "Goal", practical: "Practical", free_from: "Free from",
  occasion: "Occasion", texture: "Texture",
};

/** JSON with object keys sorted, so equal tag sets compare equal; list order is kept. */
export function canonicalTags(value: unknown): string {
  const ordered = (input: unknown): unknown => Array.isArray(input) ? input.map(ordered)
    : input !== null && typeof input === "object"
      ? Object.fromEntries(Object.keys(input).sort().map((key) => [key, ordered((input as Record<string, unknown>)[key])]))
      : input;
  return JSON.stringify(ordered(value));
}

export function tagLabel(category: string): string {
  return TAG_LABELS[category] ?? category.replaceAll("_", " ");
}

/** Problems with a tag set against the vocabulary; empty when the database would accept it. */
export function tagProblems(tags: unknown, vocabulary: TagCategory[]): string[] {
  if (tags === null || typeof tags !== "object" || Array.isArray(tags)) return ["tags are not an object"];
  const record = tags as Record<string, unknown>;
  const problems: string[] = [];
  const known = new Map(vocabulary.map((c) => [c.category, c]));
  for (const key of Object.keys(record)) if (!known.has(key)) problems.push(`unknown category ${key}`);
  for (const category of vocabulary) {
    const value = record[category.category];
    if (!(category.category in record)) { problems.push(`missing category ${category.category}`); continue; }
    if (category.multiple) {
      if (!Array.isArray(value)) { problems.push(`${category.category} is not a list`); continue; }
      if (new Set(value).size !== value.length) problems.push(`${category.category} repeats a value`);
      for (const item of value) {
        if (typeof item !== "string" || !category.values.includes(item)) problems.push(`unknown ${category.category} value ${String(item)}`);
      }
    } else if (value !== null && (typeof value !== "string" || !category.values.includes(value))) {
      problems.push(`unknown ${category.category} value ${String(value)}`);
    }
  }
  return problems;
}

export type TagSourceRecipe = { slug: string; tags: RecipeTags; sourceDigest: string };

/** Recipes and their tags from docs/implementation/recipe-collections/recipe-tags.json; `digest` is SHA-256 hex. */
export function parseTagSource(raw: unknown, digest: (text: string) => string): { sourceDigest: string; recipes: TagSourceRecipe[] } {
  const recipes = (raw as { recipes?: unknown })?.recipes;
  if (!Array.isArray(recipes)) throw new Error("recipe-tags.json has no recipes list");
  const parsed = recipes.map((recipe) => {
    const { slug, tags } = recipe as { slug?: unknown; tags?: unknown };
    if (typeof slug !== "string" || slug.length === 0) throw new Error("A recipe in recipe-tags.json has no slug");
    if (tags === null || typeof tags !== "object" || Array.isArray(tags)) throw new Error(`${slug} has no tags object`);
    return { slug, tags: tags as RecipeTags, sourceDigest: digest(canonicalTags(tags)) };
  });
  return { sourceDigest: digest(canonicalTags(parsed.map((r) => [r.slug, r.sourceDigest]))), recipes: parsed };
}

export type TagDatabaseRow = { slug: string; recipeId: string; contentVersion: number | null; currentTags: RecipeTags | null;
  openRecipeDraft: boolean; collectionDrafts: number };
export type TagImportStatus = "import" | "unchanged" | "different" | "missing_recipe" | "missing_body" | "invalid";
export type TagImportRow = { slug: string; status: TagImportStatus; problems: string[];
  openRecipeDraft: boolean; collectionDrafts: number };
export type TagImportReport = { sourceDigest: string; rows: TagImportRow[]; counts: Record<TagImportStatus, number>;
  importable: TagSourceRecipe[] };

/**
 * Compare the source tags with the database. Only recipes whose current version has no tags are imported;
 * a recipe that already has different tags changes through review instead. Importing changes a recipe's
 * active hash, so the report names open recipe drafts and collection drafts that will need to rebase.
 */
export function buildTagImportReport(input: { source: { sourceDigest: string; recipes: TagSourceRecipe[] };
  database: TagDatabaseRow[]; vocabulary: TagCategory[] }): TagImportReport {
  const bySlug = new Map(input.database.map((row) => [row.slug, row]));
  const rows: TagImportRow[] = [];
  const importable: TagSourceRecipe[] = [];
  for (const recipe of input.source.recipes) {
    const row = bySlug.get(recipe.slug);
    const problems = tagProblems(recipe.tags, input.vocabulary);
    const effect = { openRecipeDraft: row?.openRecipeDraft ?? false, collectionDrafts: row?.collectionDrafts ?? 0 };
    let status: TagImportStatus;
    if (!row) status = "missing_recipe";
    else if (row.contentVersion === null) status = "missing_body";
    else if (problems.length > 0) status = "invalid";
    else if (row.currentTags === null) status = "import";
    else status = canonicalTags(row.currentTags) === canonicalTags(recipe.tags) ? "unchanged" : "different";
    rows.push({ slug: recipe.slug, status, problems, ...effect });
    if (status === "import") importable.push(recipe);
  }
  const counts = { import: 0, unchanged: 0, different: 0, missing_recipe: 0, missing_body: 0, invalid: 0 };
  for (const row of rows) counts[row.status] += 1;
  return { sourceDigest: input.source.sourceDigest, rows, counts, importable };
}
