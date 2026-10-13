import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("../../scripts/ts-alias-hooks.mjs", import.meta.url);
const { rowAccess, withCatalogAccess } = await import("../../src/lib/collections/visibility.ts");

const recipe = (slug, extra = {}) => ({ slug, title: slug, minutes: 10, image: "", allergens: [], freezes: null, ...extra });

test("published recipes open their page, and only free ones are called free", () => {
  const rows = withCatalogAccess(
    [recipe("berry-ghost-yogurt-bark"), recipe("witchs-broomsticks"), recipe("draft-recipe")],
    new Set(["berry-ghost-yogurt-bark", "witchs-broomsticks"]),
    new Set(["berry-ghost-yogurt-bark", "draft-recipe"]),
  );
  assert.deepEqual(rows.map(({ slug, href, free }) => ({ slug, href, free })), [
    { slug: "berry-ghost-yogurt-bark", href: "/recipes/berry-ghost-yogurt-bark", free: true },
    { slug: "witchs-broomsticks", href: "/recipes/witchs-broomsticks", free: false },
    // On the free list but not published: no page to open, so not called free either.
    { slug: "draft-recipe", href: undefined, free: false },
  ]);
});

test("a database collection's own link is kept", () => {
  const [row] = withCatalogAccess([recipe("soup", { href: "/recipes/soup" })], new Set(), new Set(["soup"]));
  assert.equal(row.href, "/recipes/soup");
  assert.equal(row.free, true);
});

test("rows read free, locked or plain; a buyer sees no marks", () => {
  assert.equal(rowAccess({ href: "/recipes/a", free: true }, false), "free");
  assert.equal(rowAccess({ href: "/recipes/a", free: false }, false), "locked");
  assert.equal(rowAccess({ href: undefined, free: false }, false), null);
  assert.equal(rowAccess({ href: "/recipes/a", free: false }, true), null);
  assert.equal(rowAccess({ href: "/recipes/a", free: true }, true), null);
});
