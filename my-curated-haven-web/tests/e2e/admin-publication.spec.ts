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
       VALUES ('e2e-rev-1', '{"campaigns": []}', 'e2e-hash'),
              ('e2e-rev-2', '{"campaigns": []}', 'e2e-hash-2') ON CONFLICT DO NOTHING`
    );
    await pg.query(
      "UPDATE private.admin_console_settings SET campaign_revision = 'e2e-rev-1' WHERE singleton"
    );
  });
});

test.afterAll(async () => {
  await withPg(async (pg) => {
    await pg.query("DELETE FROM private.admin_campaign_snapshots WHERE deployment_revision IN ('e2e-rev-1','e2e-rev-2')");
    await pg.query("UPDATE private.admin_console_settings SET campaign_revision = NULL WHERE singleton");
    await pg.query("UPDATE private.admin_console_settings SET stage = 'inspection' WHERE singleton");
  });
});

test("final effect page requires a saved approved revision and publication authority", async ({ page }) => {
  const owner = await createAdminFixture("effect-owner", ["owner"], "publication");
  const viewer = await createAdminFixture("effect-viewer", ["viewer"], "publication");
  try {
    await owner.login(page, "aal2");
    await page.goto(`/admin/recipes/${owner.recipeId}/publish`);
    await expect(page.getByRole("heading", { name: "Review exact effect" })).toBeVisible();
    await expect(page.getByText("Publication requires an approved working revision.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish this revision" })).toHaveCount(0);

    await viewer.login(page, "aal2");
    await page.goto(`/admin/recipes/${viewer.recipeId}/publish`);
    await expect(page.getByText("Publication access required.")).toBeVisible();
    await expect(page.getByText((await viewer.active()).catalog.title)).toHaveCount(0);
  } finally {
    await viewer.dispose();
    await owner.dispose();
  }
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
    await expect(page.getByRole("status", { name: "" }).filter({ hasText: "Editor ready" })).toBeVisible();
    await page.getByLabel("Title", { exact: true }).fill("Published candidate title");
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Published candidate title");
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

    await page.goto(`/admin/recipes/${fixture.recipeId}/publish`);
    await expect(page.getByRole("heading", { name: "Review exact effect" })).toBeVisible();
    await withPg(async (pg) => {
      await pg.query("UPDATE private.admin_console_settings SET campaign_revision='e2e-rev-2' WHERE singleton");
    });
    await page.getByRole("button", { name: "Publish this revision" }).click();
    await expect(page.getByText(/Impact changed since this page loaded/)).toBeVisible();
    expect(await withPg(async (pg) => {
      const res = await pg.query("SELECT count(*)::int AS n FROM private.admin_audit WHERE action='recipe.publish' AND recipe_id=$1", [fixture.recipeId]);
      return res.rows[0].n as number;
    })).toBe(0);
    await withPg(async (pg) => {
      await pg.query("UPDATE private.admin_console_settings SET campaign_revision='e2e-rev-1' WHERE singleton");
    });
    await page.reload();
    await page.getByRole("button", { name: "Publish this revision" }).click();
    await page.getByLabel("Reason", { exact: true }).fill("Launch release");
    let droppedResponse = false;
    await page.route(`**/admin/recipes/${fixture.recipeId}/publish`, async (route) => {
      if (route.request().method() !== "POST" || droppedResponse) return route.continue();
      droppedResponse = true;
      await route.fetch();
      await route.abort("failed");
    });
    await page.getByRole("button", { name: "Confirm publication", exact: true }).click();
    await expect(page.getByText(/Publication outcome unconfirmed/)).toBeVisible();
    expect(droppedResponse).toBe(true);
    await page.unroute(`**/admin/recipes/${fixture.recipeId}/publish`);
    await page.getByRole("button", { name: "Check committed operation and refresh display" }).click();
    await expect(page.getByText(/published · version 2/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Committed receipt" })).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Committed; display refresh unconfirmed/)).toBeVisible();

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

    await page.goto(`/admin/recipes/${fixture.recipeId}`);
    await page.getByLabel("Reason", { exact: true }).fill("Season over");
    await page.getByRole("button", { name: "Confirm withdrawal" }).click();
    await expect(page.getByText(/withdrawn · version 2/i)).toBeVisible({ timeout: 30000 });

    const anon2 = await request.newContext({ baseURL });
    const withdrawn = await anon2.get(`/recipes/${fixture.recipeSlug}`);
    expect(withdrawn.status()).not.toBe(200);
    await anon2.dispose();
  } finally {
    await service.storage.from("recipe-previews").remove([objectName]);
    await fixture.dispose();
  }
});

test("campaign-only promise is named and requires a fresh owner acknowledgement", async ({ page }) => {
  const fixture = await createAdminFixture("campaign-withdraw", ["owner"], "publication");
  try {
    await withPg(async (pg) => {
      await pg.query("UPDATE public.recipe_catalog SET publication_state='published' WHERE id=$1", [fixture.recipeId]);
      await pg.query(
        `INSERT INTO private.admin_campaign_snapshots(deployment_revision, configuration, configuration_hash)
         VALUES ('e2e-named-promise', $1::jsonb, 'e2e-named-hash') ON CONFLICT DO NOTHING`,
        [JSON.stringify({ campaigns: [{ slug: "named-campaign-promise", status: "published", recipes: [{ slug: fixture.recipeSlug }] }] })]
      );
      await pg.query("UPDATE private.admin_console_settings SET campaign_revision='e2e-named-promise' WHERE singleton");
    });
    await fixture.login(page, "aal2");
    await page.goto(`/admin/recipes/${fixture.recipeId}`);
    await expect(page.getByText("Affected campaigns: named-campaign-promise.")).toBeVisible();
    await expect(page.getByText("No free recipe slots reference this recipe.")).toBeVisible();
    await page.getByLabel("Reason", { exact: true }).fill("Campaign is ending");
    await expect(page.getByRole("button", { name: "Confirm withdrawal" })).toBeDisabled();
    await page.getByLabel(/I acknowledge the named campaign/).check();
    await withPg(async (pg) => {
      await pg.query("UPDATE private.admin_console_settings SET campaign_revision='e2e-rev-2' WHERE singleton");
    });
    await page.getByRole("button", { name: "Confirm withdrawal" }).click();
    await expect(page.getByText(/Impact changed since this page loaded/)).toBeVisible();
    const stillPublished = await withPg(async (pg) => {
      const row = await pg.query("SELECT publication_state FROM public.recipe_catalog WHERE id=$1", [fixture.recipeId]);
      return row.rows[0].publication_state as string;
    });
    expect(stillPublished).toBe("published");
    await withPg(async (pg) => {
      await pg.query("UPDATE private.admin_console_settings SET campaign_revision='e2e-named-promise' WHERE singleton");
    });
    await page.reload();
    await page.getByLabel("Reason", { exact: true }).fill("Campaign is ending");
    await page.getByLabel(/I acknowledge the named campaign/).check();
    await page.getByRole("button", { name: "Confirm withdrawal" }).click();
    await expect(page.getByText(/withdrawn · version 1/i)).toBeVisible();
  } finally {
    await withPg(async (pg) => {
      await pg.query("UPDATE private.admin_console_settings SET campaign_revision='e2e-rev-1' WHERE singleton");
      await pg.query("DELETE FROM private.admin_campaign_snapshots WHERE deployment_revision='e2e-named-promise'");
    });
    await fixture.dispose();
  }
});
