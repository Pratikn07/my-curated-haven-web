import assert from "node:assert/strict";
import test from "node:test";
import { classifyHomepageRecipeLoadFailure } from "../../src/lib/data/homepage-recipes.ts";

test("homepage recipe diagnostics use bounded categories without forwarding error messages", () => {
  assert.equal(
    classifyHomepageRecipeLoadFailure(new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")),
    "supabase_configuration",
  );
  assert.equal(
    classifyHomepageRecipeLoadFailure(new Error("Failed to fetch free slots: permission denied")),
    "free_slot_query",
  );
  assert.equal(classifyHomepageRecipeLoadFailure(new Error("fetch failed")), "upstream_unavailable");
  assert.equal(classifyHomepageRecipeLoadFailure({ message: "raw private value" }), "unexpected");
  assert.equal(classifyHomepageRecipeLoadFailure(new Error("unexpected failure")), "unexpected");
});
