import assert from "node:assert/strict";
import test from "node:test";
import { usableImageSrc } from "../../src/lib/recipes/format.ts";

test("recipe preview storage paths resolve to a public image URL", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54341";
  try {
    assert.equal(
      usableImageSrc("recipe-previews/folder/photo.webp"),
      "http://127.0.0.1:54341/storage/v1/object/public/recipe-previews/folder/photo.webp"
    );
    assert.equal(usableImageSrc("/images/recipe.webp"), "/images/recipe.webp");
    assert.equal(usableImageSrc("../../private"), null);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  }
});
