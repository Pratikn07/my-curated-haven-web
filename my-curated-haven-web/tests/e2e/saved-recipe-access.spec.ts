import { expect, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/types/database";
import {
  removeSavedRecipe,
  saveRecipe,
} from "../../src/lib/data/saved-recipes";

const userId = "00000000-0000-0000-0000-000000000001";
const recipeId = "10000000-0000-0000-0000-000000000001";

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

interface Scenario {
  single?: Record<string, QueryResult>;
  rows?: Record<string, QueryResult>;
  user?: {
    data: { user: { id: string } | null };
    error: { name?: string; message: string } | null;
  };
  writeError?: { message: string } | null;
}

function makeClient(scenario: Scenario = {}) {
  const calls: string[] = [];
  const defaultSingle: Record<string, QueryResult> = {
    recipe_catalog: { data: { id: recipeId }, error: null },
    free_recipe_slots: { data: null, error: null },
  };
  const defaultRows: Record<string, QueryResult> = {
    access_entitlements: { data: [], error: null },
    collection_recipes: { data: [], error: null },
  };

  const client = {
    from(table: string) {
      calls.push(`from:${table}`);
      const result = scenario.rows?.[table] ?? defaultRows[table] ?? {
        data: [],
        error: null,
      };
      const queryPromise = Promise.resolve(result);
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        is() {
          return query;
        },
        in() {
          return query;
        },
        limit() {
          return query;
        },
        maybeSingle() {
          return Promise.resolve(
            scenario.single?.[table] ?? defaultSingle[table] ?? {
              data: null,
              error: null,
            }
          );
        },
        upsert() {
          calls.push("upsert:saved_recipes");
          return Promise.resolve({ error: scenario.writeError ?? null });
        },
        delete() {
          calls.push("delete:saved_recipes");
          return query;
        },
        then: queryPromise.then.bind(queryPromise),
      };
      return query;
    },
    auth: {
      getUser: async () =>
        scenario.user ?? { data: { user: null }, error: null },
    },
  };

  return {
    client: client as unknown as SupabaseClient<Database>,
    calls,
  };
}

test.describe("Phase 7 save access guard", () => {
  test.beforeEach(({}, testInfo) => {
    if (testInfo.project.name !== "chromium-desktop") {
      test.skip(true, "Save access guard runs once on desktop");
    }
  });

  test("does not save a recipe when the caller has no access", async () => {
    const { client, calls } = makeClient();

    const result = await saveRecipe(client, userId, recipeId);

    expect(result).toMatchObject({
      status: "error",
      code: "recipe_access_denied",
    });
    expect(calls).toContain("from:recipe_catalog");
    expect(calls).not.toContain("upsert:saved_recipes");
  });

  test("does not save a recipe that cannot be found", async () => {
    const { client, calls } = makeClient({
      single: { recipe_catalog: { data: null, error: null } },
    });

    const result = await saveRecipe(client, userId, recipeId);

    expect(result).toMatchObject({ status: "error", code: "recipe_not_found" });
    expect(calls).not.toContain("upsert:saved_recipes");
  });

  test("does not save when recipe access cannot be checked", async () => {
    const { client, calls } = makeClient({
      single: {
        recipe_catalog: { data: null, error: { message: "catalog unavailable" } },
      },
    });

    const result = await saveRecipe(client, userId, recipeId);

    expect(result).toMatchObject({
      status: "error",
      code: "recipe_access_unavailable",
    });
    expect(calls).not.toContain("upsert:saved_recipes");
  });

  test("allows a free recipe after checking access", async () => {
    const { client, calls } = makeClient({
      single: { free_recipe_slots: { data: { slot: 1 }, error: null } },
    });

    const result = await saveRecipe(client, userId, recipeId);

    expect(result).toMatchObject({ status: "ok", isSaved: true });
    expect(calls).toContain("from:recipe_catalog");
    expect(calls).toContain("upsert:saved_recipes");
  });

  test("allows an entitled recipe after checking the caller's entitlement", async () => {
    const { client, calls } = makeClient({
      user: { data: { user: { id: userId } }, error: null },
      rows: {
        access_entitlements: {
          data: [
            {
              id: "entitlement-1",
              release_id: "release-1",
              state: "active",
              valid_from: "2025-01-01T00:00:00.000Z",
              expires_at: null,
              revoked_at: null,
            },
          ],
          error: null,
        },
        collection_recipes: {
          data: [{ release_id: "release-1" }],
          error: null,
        },
      },
    });

    const result = await saveRecipe(client, userId, recipeId);

    expect(result).toMatchObject({ status: "ok", isSaved: true });
    expect(calls).toContain("from:access_entitlements");
    expect(calls).toContain("from:collection_recipes");
    expect(calls).toContain("upsert:saved_recipes");
  });

  test("keeps removal available without rechecking recipe access", async () => {
    const { client, calls } = makeClient({
      single: {
        recipe_catalog: { data: null, error: { message: "catalog unavailable" } },
      },
    });

    const result = await removeSavedRecipe(client, userId, recipeId);

    expect(result).toMatchObject({ status: "ok", isSaved: false });
    expect(calls).toContain("delete:saved_recipes");
    expect(calls).not.toContain("from:recipe_catalog");
  });
});
