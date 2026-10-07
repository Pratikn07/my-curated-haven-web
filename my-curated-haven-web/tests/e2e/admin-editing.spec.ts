import { expect, test } from "@playwright/test";
import { Client } from "pg";
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
    await expect(page.getByRole("status")).toContainText("Saved at");
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
