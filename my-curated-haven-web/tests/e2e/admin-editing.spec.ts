import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { createAdminFixture } from "./admin-fixtures";

test.describe.configure({ mode: "serial" });

function dbUrl(): string {
  return (
    process.env.ADMIN_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54342/postgres"
  );
}

async function catalogTitle(recipeId: string): Promise<string> {
  const pg = new Client({ connectionString: dbUrl() });
  await pg.connect();
  try {
    const res = await pg.query("SELECT title FROM public.recipe_catalog WHERE id=$1", [recipeId]);
    return res.rows[0].title as string;
  } finally {
    await pg.end();
  }
}

test("edit title, save draft, reload keeps working revision, active unchanged", async ({ page }) => {
  const fixture = await createAdminFixture("private-edit", ["owner"], "editing");
  try {
    const before = await catalogTitle(fixture.recipeId);
    await fixture.login(page, "aal2");
    await page.goto(`/admin/recipes/${fixture.recipeId}/edit`);
    await page.getByLabel("Title", { exact: true }).fill("Private revised title");
    await page.getByLabel("Reason").fill("Editorial pass");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved at" })).toBeVisible();
    expect(await catalogTitle(fixture.recipeId)).toBe(before);
    await page.reload();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Private revised title");
  } finally {
    await fixture.dispose();
  }
});

test("empty title blocks save and recipe identity stays read-only", async ({ page }) => {
  const fixture = await createAdminFixture("private-edit-guard", ["owner"], "editing");
  try {
    await fixture.login(page, "aal2");
    await page.goto(`/admin/recipes/${fixture.recipeId}/edit`);
    await expect(page.getByText(fixture.recipeId).first()).toBeVisible();
    await expect(page.getByLabel(/slug/i)).toHaveCount(0);
    await expect(page.getByLabel("Title", { exact: true })).toBeVisible();
    await page.getByLabel("Title", { exact: true }).fill("");
    await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
    await expect(page.getByRole("alert", { name: "Validation issues" })).toContainText("Title is required.");
  } finally {
    await fixture.dispose();
  }
});

test("select existing image, save, reopen keeps selection, active unchanged", async ({ page }) => {
  const fixture = await createAdminFixture("private-image", ["owner"], "editing");
  const objectName = `synth-img-${Date.now().toString(36)}.webp`;
  const objectPath = `recipe-previews/${objectName}`;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54341";
  const service = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false } }
  );
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const uploaded = await service.storage.from("recipe-previews").upload(objectName, png, {
    contentType: "image/webp",
    upsert: true,
  });
  expect(uploaded.error).toBeNull();
  const pg = new Client({ connectionString: dbUrl() });
  await pg.connect();
  try {
    await pg.query("UPDATE public.recipe_catalog SET preview_image_path=$2 WHERE id=$1", [
      fixture.recipeId,
      objectPath,
    ]);
  } finally {
    await pg.end();
  }
  try {
    await fixture.login(page, "aal2");
    await page.goto(`/admin/recipes/${fixture.recipeId}/edit`);
    await expect(page.getByLabel("Existing image")).toHaveValue(objectPath);
    await page.getByLabel("Image alt text").fill("A steaming bowl");
    await page.getByLabel("Reason").fill("Image metadata pass");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved at" })).toBeVisible();
    await page.getByRole("button", { name: "Check availability" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Available, checked at" })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Existing image")).toHaveValue(objectPath);
    await expect(page.getByLabel("Image alt text")).toHaveValue("A steaming bowl");
    const check = new Client({ connectionString: dbUrl() });
    await check.connect();
    try {
      const res = await check.query(
        "SELECT preview_image_path, preview_image_alt, preview_image_description FROM public.recipe_catalog WHERE id=$1",
        [fixture.recipeId]
      );
      expect(res.rows[0].preview_image_path).toBe(objectPath);
      expect(res.rows[0].preview_image_alt).toBeNull();
      expect(res.rows[0].preview_image_description).toBeNull();
    } finally {
      await check.end();
    }
  } finally {
    await service.storage.from("recipe-previews").remove([objectName]);
    await fixture.dispose();
  }
});
