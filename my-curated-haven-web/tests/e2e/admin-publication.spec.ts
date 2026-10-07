import { expect, request, test } from "@playwright/test";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { createAdminFixture } from "./admin-fixtures";

test.describe.configure({ mode: "serial" });
test.setTimeout(120000);

function dbUrl(): string {
  return (
    process.env.ADMIN_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54342/postgres"
  );
}

async function withPg<T>(fn: (pg: Client) => Promise<T>): Promise<T> {
  const pg = new Client({ connectionString: dbUrl() });
  await pg.connect();
  try {
    return await fn(pg);
  } finally {
    await pg.end();
  }
}

test.beforeAll(async () => {
  await withPg(async (pg) => {
    await pg.query(
      `INSERT INTO private.admin_campaign_snapshots(deployment_revision, configuration, configuration_hash)
       VALUES ('e2e-rev-1', '{"campaigns": []}', 'e2e-hash') ON CONFLICT DO NOTHING`
    );
    await pg.query(
      "UPDATE private.admin_console_settings SET campaign_revision = 'e2e-rev-1' WHERE singleton"
    );
  });
});

test.afterAll(async () => {
  await withPg(async (pg) => {
    await pg.query("DELETE FROM private.admin_campaign_snapshots WHERE deployment_revision = 'e2e-rev-1'");
    await pg.query("UPDATE private.admin_console_settings SET campaign_revision = NULL WHERE singleton");
    await pg.query("UPDATE private.admin_console_settings SET stage = 'inspection' WHERE singleton");
  });
});

test("publish approved revision, verify public content, withdraw", async ({ page, baseURL }) => {
  const fixture = await createAdminFixture("publish-flow", ["owner"], "publication");
  const objectName = `synth-pub-${Date.now().toString(36)}.webp`;
  const objectPath = `recipe-previews/${objectName}`;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54341";
  const service = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: { persistSession: false },
  });
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  await service.storage.from("recipe-previews").upload(objectName, png, {
    contentType: "image/webp",
    upsert: true,
  });
  await withPg(async (pg) => {
    await pg.query("UPDATE public.recipe_catalog SET preview_image_path=$2 WHERE id=$1", [
      fixture.recipeId,
      objectPath,
    ]);
  });
  try {
    await fixture.login(page, "aal2");
    await page.goto(`/admin/recipes/${fixture.recipeId}/edit`);
    await page.getByLabel("Title", { exact: true }).fill("Published candidate title");
    await page.getByLabel("Reason").fill("Release pass");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved at" })).toBeVisible();
    await page.getByRole("button", { name: "Check availability" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Available, checked at" })).toBeVisible();

    await page.goto(`/admin/recipes/${fixture.recipeId}`);
    await page.getByRole("button", { name: "Submit for review", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Awaiting review" })).toBeVisible();
    await page.getByLabel("Review reason").fill("Release review");
    await page.getByRole("button", { name: "Approve this revision", exact: true }).click();
    await expect(
      page.getByText("This revision is approved and ready to publish.", { exact: true })
    ).toBeVisible();

    await page.getByRole("button", { name: "Publish this revision" }).click();
    await page.getByLabel("Reason", { exact: true }).fill("Launch release");
    await page.getByRole("button", { name: "Confirm publication", exact: true }).click();
    await expect(page.getByText("Published.", { exact: true })).toBeVisible();

    const version = await withPg(async (pg) => {
      const res = await pg.query(
        "SELECT content_version FROM public.recipe_bodies WHERE recipe_id=$1",
        [fixture.recipeId]
      );
      return res.rows[0].content_version as number;
    });
    expect(version).toBe(2);
    const publishes = await withPg(async (pg) => {
      const res = await pg.query(
        "SELECT count(*)::int AS n FROM private.admin_audit WHERE action='recipe.publish' AND recipe_id=$1",
        [fixture.recipeId]
      );
      return res.rows[0].n as number;
    });
    expect(publishes).toBe(1);

    const anon = await request.newContext({ baseURL });
    const response = await anon.get(`/recipes/${fixture.recipeSlug}`);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("Published candidate title");
    await anon.dispose();

    await page.getByLabel("Reason", { exact: true }).fill("Season over");
    await page.getByRole("button", { name: "Confirm withdrawal" }).click();
    await expect(page.getByText("Withdrawn.", { exact: true })).toBeVisible({ timeout: 30000 });

    const anon2 = await request.newContext({ baseURL });
    const withdrawn = await anon2.get(`/recipes/${fixture.recipeSlug}`);
    expect(withdrawn.status()).not.toBe(200);
    await anon2.dispose();
  } finally {
    await service.storage.from("recipe-previews").remove([objectName]);
    await fixture.dispose();
  }
});
