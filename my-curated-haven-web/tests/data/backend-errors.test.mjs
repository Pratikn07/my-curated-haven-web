// Phase 4 scenario S16 (audit R4-07): a backend error is a typed failure,
// never a successful empty result or a false "denied".
import assert from "node:assert/strict";
import test from "node:test";
import { checkRecipeAccess } from "../../src/lib/data/access.ts";
import {
  getFreeRecipeCatalog,
  getFreeRecipeSlots,
  getPublishedCatalog,
  getRecipeBySlug,
} from "../../src/lib/data/recipes.ts";

const FAILURE = { data: null, error: { message: "backend unavailable" } };
const RECIPE_ID = "10000000-0000-0000-0000-000000000009";
const CATALOG_ROW = {
  id: RECIPE_ID,
  slug: "fixture-recipe",
  title: "Fixture recipe",
  public_summary: "Synthetic",
  preview_image_path: "recipe-previews/fixture.webp",
  total_minutes: 10,
  meal_labels: [],
  diet_labels: [],
  published_at: "2026-09-25T00:00:00Z",
};

/**
 * Fake Supabase client. `tables` maps a table name to the response its query resolves to.
 * Every builder method returns the builder, so any select/eq/order chain works.
 */
function fakeClient({ tables = {}, user = { data: { user: null }, error: null }, throwOn } = {}) {
  return {
    from(table) {
      if (table === throwOn) throw new Error("network down");
      const response = tables[table] ?? { data: null, error: null };
      const builder = new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === "then") return (resolve, reject) => Promise.resolve(response).then(resolve, reject);
            return () => builder;
          },
        },
      );
      return builder;
    },
    auth: { getUser: async () => user },
  };
}

test("getRecipeBySlug returns a typed error when the catalog query fails", async () => {
  const result = await getRecipeBySlug(fakeClient({ tables: { recipe_catalog: FAILURE } }), "fixture-recipe");
  assert.deepEqual(result, { status: "error", message: "backend unavailable" });
});

test("getRecipeBySlug returns a typed error, not access_denied, when the body query fails", async () => {
  const client = fakeClient({
    tables: { recipe_catalog: { data: CATALOG_ROW, error: null }, recipe_bodies: FAILURE },
  });
  const result = await getRecipeBySlug(client, "fixture-recipe");
  assert.equal(result.status, "error");
});

test("getFreeRecipeSlots throws instead of returning an empty list", async () => {
  await assert.rejects(getFreeRecipeSlots(fakeClient({ tables: { free_recipe_slots: FAILURE } })), /backend unavailable/);
  await assert.rejects(
    getFreeRecipeSlots(fakeClient({ tables: { free_recipe_slots: { data: null, error: null } } })),
    /empty free slots response/,
  );
});

test("getFreeRecipeCatalog propagates the slot failure", async () => {
  await assert.rejects(getFreeRecipeCatalog(fakeClient({ tables: { free_recipe_slots: FAILURE } })));
});

test("getPublishedCatalog throws instead of returning an empty catalog", async () => {
  await assert.rejects(getPublishedCatalog(fakeClient({ tables: { recipe_catalog: FAILURE } })), /backend unavailable/);
});

test("checkRecipeAccess reports an error, not not_found, when the catalog query fails", async () => {
  const result = await checkRecipeAccess(fakeClient({ tables: { recipe_catalog: FAILURE } }), RECIPE_ID);
  assert.deepEqual(result, { type: "error", message: "backend unavailable" });
});

test("checkRecipeAccess reports an error, not denied, when the free-slot query fails", async () => {
  const client = fakeClient({
    tables: { recipe_catalog: { data: { id: RECIPE_ID }, error: null }, free_recipe_slots: FAILURE },
  });
  assert.equal((await checkRecipeAccess(client, RECIPE_ID)).type, "error");
});

test("checkRecipeAccess reports an error when auth fails for a reason other than a missing session", async () => {
  const client = fakeClient({
    tables: { recipe_catalog: { data: { id: RECIPE_ID }, error: null }, free_recipe_slots: { data: null, error: null } },
    user: { data: { user: null }, error: { name: "AuthApiError", message: "auth service unavailable" } },
  });
  assert.deepEqual(await checkRecipeAccess(client, RECIPE_ID), { type: "error", message: "auth service unavailable" });
});

test("checkRecipeAccess treats a missing session as denied, not as an error", async () => {
  const client = fakeClient({
    tables: { recipe_catalog: { data: { id: RECIPE_ID }, error: null }, free_recipe_slots: { data: null, error: null } },
    user: { data: { user: null }, error: { name: "AuthSessionMissingError", message: "Auth session missing!" } },
  });
  assert.deepEqual(await checkRecipeAccess(client, RECIPE_ID), { type: "denied" });
});

test("checkRecipeAccess reports an error when the entitlement query fails", async () => {
  const client = fakeClient({
    tables: {
      recipe_catalog: { data: { id: RECIPE_ID }, error: null },
      free_recipe_slots: { data: null, error: null },
      access_entitlements: FAILURE,
    },
    user: { data: { user: { id: "20000000-0000-0000-0000-000000000001" } }, error: null },
  });
  assert.equal((await checkRecipeAccess(client, RECIPE_ID)).type, "error");
});

test("checkRecipeAccess turns a thrown client error into a typed error", async () => {
  const result = await checkRecipeAccess(fakeClient({ throwOn: "recipe_catalog" }), RECIPE_ID);
  assert.deepEqual(result, { type: "error", message: "network down" });
});
