// Phase 4 scenario S16 (audit R4-07): a backend error is a typed failure,
// never a successful empty result or a false "denied".
import assert from "node:assert/strict";
import test from "node:test";
import { checkRecipeAccess, isRecipeAdmin } from "../../src/lib/data/access.ts";
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
function fakeClient({ tables = {}, user = { data: { user: null }, error: null }, throwOn, admin = { data: false, error: null },
  effective = { data: { type: "denied" }, error: null } } = {}) {
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
    rpc: async (name) => (name === "recipe_effective_access" ? effective : admin),
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

test("checkRecipeAccess reports an error when the access resolver fails", async () => {
  const client = fakeClient({
    tables: { recipe_catalog: { data: { id: RECIPE_ID }, error: null }, free_recipe_slots: { data: null, error: null } },
    user: { data: { user: { id: "20000000-0000-0000-0000-000000000001" } }, error: null },
    effective: FAILURE,
  });
  assert.deepEqual(await checkRecipeAccess(client, RECIPE_ID), { type: "error", message: "backend unavailable" });
});

// A database that predates the resolver (PGRST202) reads purchases the way it did before it existed.
const NO_RESOLVER = { data: null, error: { code: "PGRST202", message: "Could not find the function public.recipe_effective_access" } };

test("checkRecipeAccess reports an error when the entitlement query fails on a database without the resolver", async () => {
  const client = fakeClient({
    tables: {
      recipe_catalog: { data: { id: RECIPE_ID }, error: null },
      free_recipe_slots: { data: null, error: null },
      access_entitlements: FAILURE,
    },
    user: { data: { user: { id: "20000000-0000-0000-0000-000000000001" } }, error: null },
    effective: NO_RESOLVER,
  });
  assert.equal((await checkRecipeAccess(client, RECIPE_ID)).type, "error");
});

test("without the resolver, a held release containing the recipe grants access and nothing else does", async () => {
  const base = {
    recipe_catalog: { data: { id: RECIPE_ID }, error: null },
    free_recipe_slots: { data: null, error: null },
  };
  const held = { data: [{ release_id: "release-1", valid_from: "2026-01-01T00:00:00Z", expires_at: null }], error: null };
  const user = { data: { user: { id: "20000000-0000-0000-0000-000000000001" } }, error: null };
  const entitled = fakeClient({ user, effective: NO_RESOLVER,
    tables: { ...base, access_entitlements: held, collection_recipes: { data: [{ release_id: "release-1" }], error: null } } });
  assert.deepEqual(await checkRecipeAccess(entitled, RECIPE_ID), { type: "entitled", releaseId: "release-1" });
  const otherRecipe = fakeClient({ user, effective: NO_RESOLVER,
    tables: { ...base, access_entitlements: held, collection_recipes: { data: [], error: null } } });
  assert.deepEqual(await checkRecipeAccess(otherRecipe, RECIPE_ID), { type: "denied" });
  const expired = fakeClient({ user, effective: NO_RESOLVER, tables: { ...base,
    access_entitlements: { data: [{ release_id: "release-1", valid_from: "2026-01-01T00:00:00Z", expires_at: "2026-02-01T00:00:00Z" }], error: null },
    collection_recipes: { data: [{ release_id: "release-1" }], error: null } } });
  assert.deepEqual(await checkRecipeAccess(expired, RECIPE_ID), { type: "denied" });
});

test("checkRecipeAccess turns a thrown client error into a typed error", async () => {
  const result = await checkRecipeAccess(fakeClient({ throwOn: "recipe_catalog" }), RECIPE_ID);
  assert.deepEqual(result, { type: "error", message: "network down" });
});

const SIGNED_IN_USER = { data: { user: { id: "20000000-0000-0000-0000-000000000001" } }, error: null };

test("admin status comes from the protected role RPC, not editable metadata", async () => {
  assert.equal(await isRecipeAdmin(fakeClient({ user: SIGNED_IN_USER, admin: { data: true, error: null } })), true);
  const forgedUser = { data: { user: { ...SIGNED_IN_USER.data.user, user_metadata: { role: "admin" } } }, error: null };
  assert.equal(await isRecipeAdmin(fakeClient({ user: forgedUser })), false);
});

test("signed-out callers do not query the authenticated admin RPC", async () => {
  const client = fakeClient();
  client.rpc = () => { throw new Error("must not query roles without a user"); };
  assert.equal(await isRecipeAdmin(client), false);
});

test("role lookup failures and malformed responses fail closed", async () => {
  for (const admin of [FAILURE, { data: null, error: null }, { data: "true", error: null }]) {
    await assert.rejects(isRecipeAdmin(fakeClient({ user: SIGNED_IN_USER, admin })), /Failed to check recipe admin role/);
  }
});

test("an admin can access a draft without a free slot or purchase", async () => {
  const client = fakeClient({
    user: SIGNED_IN_USER,
    admin: { data: true, error: null },
    tables: { recipe_catalog: { data: { id: RECIPE_ID }, error: null } },
  });
  assert.deepEqual(await checkRecipeAccess(client, RECIPE_ID), { type: "admin" });
});

test("a regular signed-in user without a purchase remains denied", async () => {
  const client = fakeClient({ user: SIGNED_IN_USER, tables: { recipe_catalog: { data: { id: RECIPE_ID }, error: null } } });
  assert.deepEqual(await checkRecipeAccess(client, RECIPE_ID), { type: "denied" });
});
