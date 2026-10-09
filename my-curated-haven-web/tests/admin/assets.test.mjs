import test from "node:test";
import assert from "node:assert/strict";
import { parseRecipeAsset } from "../../src/lib/admin/asset-path.ts";

const ORIGIN = "https://fixture.supabase.test";

test("asset reference cannot redirect verification outside the recipe bucket", () => {
  const result = parseRecipeAsset("https://attacker.test/recipe.webp", ORIGIN);
  assert.equal(result.ok, false);
  const traversal = parseRecipeAsset(
    "https://fixture.supabase.test/storage/v1/object/public/recipe-images/../private/x",
    ORIGIN
  );
  assert.equal(traversal.ok, false);
});

test("relative catalog paths resolve within the previews bucket", () => {
  const bare = parseRecipeAsset("synth-free-oat-bake.webp", ORIGIN);
  assert.deepEqual(bare, { ok: true, value: { objectName: "synth-free-oat-bake.webp" } });
  const prefixed = parseRecipeAsset("recipe-previews/synth-free-oat-bake.webp", ORIGIN);
  assert.deepEqual(prefixed, { ok: true, value: { objectName: "synth-free-oat-bake.webp" } });
});

test("absolute public URLs must match origin and bucket exactly", () => {
  const good = parseRecipeAsset(
    "https://fixture.supabase.test/storage/v1/object/public/recipe-previews/a.webp",
    ORIGIN
  );
  assert.deepEqual(good, { ok: true, value: { objectName: "a.webp" } });
  assert.equal(
    parseRecipeAsset("https://fixture.supabase.test/storage/v1/object/public/other/a.webp", ORIGIN)
      .ok,
    false
  );
  assert.equal(
    parseRecipeAsset("https://fixture.supabase.test/storage/v1/object/public/recipe-previews/a.webp?token=x", ORIGIN)
      .ok,
    false
  );
  assert.equal(parseRecipeAsset("/absolute/path.webp", ORIGIN).ok, false);
  assert.equal(parseRecipeAsset("recipe-previews/a%2Fb.webp", ORIGIN).ok, false);
  assert.equal(parseRecipeAsset("https://fixture.supabase.test/storage/v1/object/public/recipe-previews/a%2Fb.webp", ORIGIN).ok, false);
  assert.equal(parseRecipeAsset("", ORIGIN).ok, false);
});
