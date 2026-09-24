import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/types/database";
import {
  getPublishedCatalog,
  getRecipeBySlug,
  getFreeRecipeSlots,
  getFreeRecipeCatalog,
} from "../../src/lib/data/recipes";
import { checkRecipeAccess } from "../../src/lib/data/access";

const approvedFreeRecipeSlugs = [
  "sweet-potato-and-spinach-frittata-fingers",
  "soft-baked-blueberry-and-oat-bars",
  "salmon-and-pea-fish-cakes",
] as const;

function formatSourceIngredient(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return String(value);

  const ingredient = value as Record<string, unknown>;
  return [ingredient.amount, ingredient.unit, ingredient.item]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");
}

function sourceStepText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "text" in value) {
    return String((value as { text: unknown }).text);
  }
  return String(value);
}

test.describe("Phase 4 access failures", () => {
  test("backend failure is a typed error, not a missing recipe", async () => {
    const client = createClient<Database>(
      "http://127.0.0.1:9",
      "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, signal: AbortSignal.timeout(2000) }),
        },
      }
    );

    const result = await checkRecipeAccess(
      client,
      "10000000-0000-0000-0000-000000000001"
    );

    expect(result.type).toBe("error");
    if (result.type === "error") {
      expect(result.message.length).toBeGreaterThan(0);
    }
  });
});
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

test.describe("Phase 4 typed data access layer", () => {
  // Only run once in desktop to avoid redundant API hits across all mobile viewports
  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.project.name !== "chromium-desktop") {
      test.skip(true, "Required data-access integration runs once on desktop to avoid duplicate database/auth work.");
    }
  });

  test("visitor can list published catalog, excluding draft and withdrawn", async () => {
    const client = createClient<Database>(supabaseUrl, supabaseAnonKey);
    const catalog = await getPublishedCatalog(client);

    expect(catalog.length).toBe(5);
    const slugs = catalog.map((r) => r.slug);
    expect(slugs).toContain("synth-free-oat-bake");
    expect(slugs).toContain("synth-free-veggie-frittata");
    expect(slugs).toContain("synth-free-berry-smoothie");
    expect(slugs).toContain("synth-paid-golden-soup");
    expect(slugs).toContain("synth-paid-herb-salmon");
    expect(slugs).not.toContain("synth-draft-warm-salad");
    expect(slugs).not.toContain("synth-withdrawn-bread");

    // Catalog DTO items must not leak internal or body fields
    for (const item of catalog) {
      expect(item.title).toBeTruthy();
      expect(item.publicSummary).toBeTruthy();
      expect((item as unknown as Record<string, unknown>).ingredients).toBeUndefined();
      expect((item as unknown as Record<string, unknown>).instructions).toBeUndefined();
    }
  });

  test("[QA-S13:partial] visitor can retrieve free recipe body but is denied paid recipe body", async () => {
    const client = createClient<Database>(supabaseUrl, supabaseAnonKey);

    // Free recipe returns full body
    const freeResult = await getRecipeBySlug(client, "synth-free-oat-bake");
    expect(freeResult.status).toBe("ok");
    if (freeResult.status === "ok") {
      expect(freeResult.recipe.catalog.title).toBe("Synthetic Free Oat Bake");
      expect(freeResult.recipe.body.ingredients.length).toBeGreaterThan(0);
      expect(JSON.stringify(freeResult.recipe.body.instructions)).toContain(
        "SENTINEL_FREE_OAT_BODY_SECRET_METHOD"
      );
    }

    // Paid recipe returns access_denied with catalog preview only
    const paidResult = await getRecipeBySlug(client, "synth-paid-golden-soup");
    expect(paidResult.status).toBe("access_denied");
    if (paidResult.status === "access_denied") {
      expect(paidResult.catalog.title).toBe("Synthetic Paid Golden Lentil Soup");
      expect((paidResult as unknown as Record<string, unknown>).body).toBeUndefined();
    }

    // Access status checks
    const freeRecipeId = "10000000-0000-0000-0000-000000000001";
    const paidRecipeId = "20000000-0000-0000-0000-000000000001";

    const freeAccess = await checkRecipeAccess(client, freeRecipeId);
    expect(freeAccess).toEqual({ type: "free", slot: 1 });

    const paidAccess = await checkRecipeAccess(client, paidRecipeId);
    expect(paidAccess).toEqual({ type: "denied" });
  });

  test("visitor querying draft or withdrawn returns not_found", async () => {
    const client = createClient<Database>(supabaseUrl, supabaseAnonKey);

    const draftResult = await getRecipeBySlug(client, "synth-draft-warm-salad");
    expect(draftResult.status).toBe("not_found");

    const withdrawnResult = await getRecipeBySlug(client, "synth-withdrawn-bread");
    expect(withdrawnResult.status).toBe("not_found");

    const nonexistentResult = await getRecipeBySlug(client, "non-existent-recipe");
    expect(nonexistentResult.status).toBe("not_found");
  });

  test("free slots endpoint returns exactly three published slots", async () => {
    const client = createClient<Database>(supabaseUrl, supabaseAnonKey);
    const slots = await getFreeRecipeSlots(client);

    expect(slots.length).toBe(3);
    expect(slots.map((s) => s.slot)).toEqual([1, 2, 3]);
    for (const slot of slots) {
      expect(slot.recipe.title).toBeTruthy();
      expect(slot.recipe.publicSummary).toBeTruthy();
    }
  });

  test("public free catalog follows slot order and omits published recipes without slots", async () => {
    const client = createClient<Database>(supabaseUrl, supabaseAnonKey);
    const catalog = await getFreeRecipeCatalog(client);

    expect(catalog.map((recipe) => recipe.slug)).toEqual([
      "synth-free-oat-bake",
      "synth-free-veggie-frittata",
      "synth-free-berry-smoothie",
    ]);
    expect(catalog.map((recipe) => recipe.slug)).not.toContain(
      "synth-paid-golden-soup"
    );
    expect(catalog.map((recipe) => recipe.slug)).not.toContain(
      "synth-paid-herb-salmon"
    );
  });

  test("buyer session can access entitled paid recipe body, while nonbuyer is denied", async () => {
    // 1. Nonbuyer B
    const nonbuyerClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: nonbuyerLoginError } =
      await nonbuyerClient.auth.signInWithPassword({
        email: "nonbuyer-b@synthetic.test",
        password: "password123",
      });
    expect(nonbuyerLoginError).toBeNull();

    const nonbuyerResult = await getRecipeBySlug(
      nonbuyerClient,
      "synth-paid-golden-soup"
    );
    expect(nonbuyerResult.status).toBe("access_denied");

    // 2. Buyer A
    const buyerClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: buyerLoginError } = await buyerClient.auth.signInWithPassword({
      email: "buyer-a@synthetic.test",
      password: "password123",
    });
    expect(buyerLoginError).toBeNull();

    // Buyer A has entitlement to Release 1 (which includes Paid Recipe 1)
    const buyerResult1 = await getRecipeBySlug(
      buyerClient,
      "synth-paid-golden-soup"
    );
    expect(buyerResult1.status).toBe("ok");
    if (buyerResult1.status === "ok") {
      expect(JSON.stringify(buyerResult1.recipe.body.instructions)).toContain(
        "SENTINEL_PAID_GOLDEN_SOUP_PROTECTED_SECRET"
      );
    }

    // Buyer A does NOT have entitlement to Release 2 (Paid Recipe 2)
    const buyerResult2 = await getRecipeBySlug(
      buyerClient,
      "synth-paid-herb-salmon"
    );
    expect(buyerResult2.status).toBe("access_denied");

    const access1 = await checkRecipeAccess(
      buyerClient,
      "20000000-0000-0000-0000-000000000001"
    );
    expect(access1.type).toBe("entitled");

    const access2 = await checkRecipeAccess(
      buyerClient,
      "20000000-0000-0000-0000-000000000002"
    );
    expect(access2.type).toBe("denied");
  });

  test("revoked user cannot access paid recipe body", async () => {
    const revokedClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: loginError } = await revokedClient.auth.signInWithPassword({
      email: "revoked-c@synthetic.test",
      password: "password123",
    });
    expect(loginError).toBeNull();

    const result = await getRecipeBySlug(
      revokedClient,
      "synth-paid-golden-soup"
    );
    expect(result.status).toBe("access_denied");

    const access = await checkRecipeAccess(
      revokedClient,
      "20000000-0000-0000-0000-000000000001"
    );
    expect(access.type).toBe("denied");
  });
});

test.describe("Phase 6 approved live recipe content", () => {
  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.project.name !== "chromium-desktop") {
      test.skip(true, "Approved live recipe content is checked once on desktop");
    }
  });

  test("approved free recipes render source ingredients and ordered method steps when rows exist", async ({
    page,
  }) => {
    const client = createClient<Database>(supabaseUrl, supabaseAnonKey);
    const { error: databaseHealthError } = await client
      .from("recipes")
      .select("id")
      .limit(1);
    expect(databaseHealthError, "Required product database is available").toBeNull();

    const slots = await getFreeRecipeSlots(client);
    const slotBySlug = new Map(
      slots.map(({ recipe }) => [recipe.slug, recipe.id] as const)
    );
    const missingSlugs = approvedFreeRecipeSlugs.filter(
      (slug) => !slotBySlug.has(slug)
    );

    if (missingSlugs.length > 0) {
      test.skip(
        true,
        `Approved recipe rows are absent from this local/preview seed: ${missingSlugs.join(", ")}`
      );
    }

    const recipeIds = approvedFreeRecipeSlugs.map((slug) => slotBySlug.get(slug)!);
    const { data: bodies, error } = await client
      .from("recipe_bodies")
      .select("recipe_id, ingredients, instructions, allergen_review_state, allergens")
      .in("recipe_id", recipeIds);

    expect(error).toBeNull();
    const bodyByRecipeId = new Map((bodies ?? []).map((body) => [body.recipe_id, body]));
    const missingBodies = approvedFreeRecipeSlugs.filter(
      (slug) => !bodyByRecipeId.has(slotBySlug.get(slug)!)
    );
    if (missingBodies.length > 0) {
      test.skip(
        true,
        `Approved recipe bodies are absent from this local/preview seed: ${missingBodies.join(", ")}`
      );
    }

    for (const slug of approvedFreeRecipeSlugs) {
      const recipeId = slotBySlug.get(slug)!;
      const body = bodyByRecipeId.get(recipeId)!;
      const expectedIngredients = Array.isArray(body.ingredients)
        ? body.ingredients.map(formatSourceIngredient)
        : [];
      const expectedSteps = Array.isArray(body.instructions)
        ? body.instructions.map(sourceStepText)
        : [];

      expect(expectedIngredients, `${slug} source ingredients`).not.toHaveLength(0);
      expect(expectedSteps, `${slug} source method`).not.toHaveLength(0);

      const response = await page.goto(`/recipes/${slug}`);
      expect(response?.status(), `${slug} page status`).toBe(200);
      const renderedIngredients = await page
        .locator("section[aria-labelledby='ingredients-heading'] li")
        .allTextContents();
      expect(renderedIngredients.map((line) => line.trim())).toEqual(
        expectedIngredients
      );
      const renderedSteps = await page
        .locator("section[aria-labelledby='instructions-heading'] ol > li p")
        .allTextContents();
      expect(renderedSteps.map((step) => step.trim())).toEqual(expectedSteps);

      if (slug === "soft-baked-blueberry-and-oat-bars") {
        const allergenNotice = page.locator(
          "section[aria-labelledby='allergens-heading']"
        );
        await expect(
          allergenNotice.getByText(
            "Reviewed: No allergens were listed for this recipe. Please check all ingredient packaging carefully.",
            { exact: true }
          )
        ).toBeVisible();
        await expect(allergenNotice).not.toContainText(
          /dairy, egg, nuts, soy, wheat/i
        );
      }
    }
  });
});
