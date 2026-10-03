import { test, expect, type Page } from "@playwright/test";
import { EMAIL_OTP_LENGTH } from "../../src/lib/auth/otp";

const MAILPIT_URL = "http://127.0.0.1:54324";
const EDITOR_EMAIL = "editor-e@synthetic.test";
const PARENT_EMAIL = "nonbuyer-b@synthetic.test";

// 1x1 PNG: enough for the browser to decode, resize and upload.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
  "base64"
);

/** Newest sign-in code sent to `email` after `since`. */
async function getOtpSince(email: string, since: number, timeoutMs = 20_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/messages`).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      const messages: Array<{ ID: string; Created: string; To: Array<{ Address: string }> }> = data.messages || [];
      const newest = messages
        .filter((m) => m.To.some((to) => to.Address.toLowerCase() === email) && Date.parse(m.Created) >= since - 1000)
        .sort((a, b) => Date.parse(b.Created) - Date.parse(a.Created))[0];
      if (newest) {
        const detail = await (await fetch(`${MAILPIT_URL}/api/v1/message/${newest.ID}`)).json();
        const match = `${detail.Text || ""} ${detail.HTML || ""}`.match(new RegExp(`\\b(\\d{${EMAIL_OTP_LENGTH}})\\b`));
        if (match) return match[1];
      }
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timeout waiting for OTP email to ${email}`);
}

async function signIn(page: Page, email: string, returnTo: string) {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel(/email address/i).fill(email);
  const requestedAt = Date.now();
  const codeHeading = page.getByRole("heading", { name: "Enter Verification Code" });
  for (let attempt = 0; attempt < 3 && !(await codeHeading.isVisible()); attempt++) {
    await page.getByRole("button", { name: "Continue with Email" }).click();
    await codeHeading.waitFor({ timeout: 4000 }).catch(() => page.waitForTimeout(1200));
  }
  await expect(codeHeading).toBeVisible();
  await page.getByLabel(/\d+-digit code/i).fill(await getOtpSince(email, requestedAt));
  await page.getByRole("button", { name: "Verify & Sign In" }).click();
}

test.describe("Recipe admin", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.project.name !== "chromium-desktop") {
      test.skip(true, "Signed-in admin tests share local auth and Mailpit state, so they run once on desktop.");
    }
  });

  test("signed-out visitors are sent to sign in", async ({ page }) => {
    const response = await page.goto("/admin/recipes");
    expect(page.url()).toContain("/sign-in?returnTo=%2Fadmin%2Frecipes");
    expect(response?.status()).toBeLessThan(400);
  });

  test("a signed-in parent who is not an admin gets a not-found page", async ({ page }) => {
    await signIn(page, PARENT_EMAIL, "/admin/recipes");
    await page.waitForURL(/\/admin\/recipes$/);
    await expect(page.getByRole("heading", { name: "This page is not available" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recipes" })).toHaveCount(0);
  });

  test("an admin creates, publishes and takes down a recipe", async ({ page }) => {
    test.setTimeout(90_000);
    const title = `Playwright Pear Muffins ${Date.now()}`;
    const slug = title.toLowerCase().replace(/\s+/g, "-");

    await signIn(page, EDITOR_EMAIL, "/admin/recipes");
    await page.waitForURL(/\/admin\/recipes$/);
    await expect(page.getByRole("heading", { name: "Recipes", level: 1 })).toBeVisible();
    await expect(page.getByText("Synthetic Draft Warm Potato Salad")).toBeVisible();

    // A draft needs only a name.
    await page.getByRole("link", { name: "New recipe" }).click();
    await page.getByLabel("Recipe name").fill(title);
    await expect(page.getByLabel("Web address")).toHaveValue(slug);
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.waitForURL(/\/admin\/recipes\/[0-9a-f-]+\?done=saved$/);
    await expect(page.getByRole("status")).toHaveText("Saved.");
    await expect(page.getByText("Before it can go live:")).toBeVisible();
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();

    // Publishing an incomplete recipe keeps it a draft.
    await page.getByRole("button", { name: "Save and publish" }).click();
    await page.waitForURL(/done=saved-not-ready$/);
    await expect(page.getByText("Add a photo.")).toBeVisible();

    // Fill everything in.
    await page.getByLabel("Short summary").fill("Soft pear muffins for small hands.");
    await page.locator('input[type="file"]').setInputFiles({ name: "pear.png", mimeType: "image/png", buffer: TINY_PNG });
    await expect(page.getByText("Change photo")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('input[name="imageUrl"]')).toHaveValue(
      /\/storage\/v1\/object\/public\/recipe-previews\/admin\/[0-9a-f-]+\.(webp|jpg)$/
    );
    await page.getByLabel("Total time (minutes)").fill("30");
    await page.getByLabel("Makes").fill("12 mini muffins");
    await page.getByRole("checkbox", { name: "Snack" }).check();
    await page.getByLabel("Ingredient 1", { exact: true }).fill("ripe pears, grated");
    await page.getByLabel("Amount").first().fill("2");
    await page.getByRole("button", { name: "Add ingredient" }).click();
    await page.getByLabel("Ingredient 2", { exact: true }).fill("rolled oats");
    await page.getByLabel("Step 1", { exact: true }).fill("Mix the pears and oats.");
    await page.getByRole("button", { name: "Add step" }).click();
    await page.getByLabel("Step 2", { exact: true }).fill("Bake for 20 minutes.");

    // "Contains allergens" with nothing ticked is caught, and the typed recipe survives.
    await page.getByRole("radio", { name: "Contains allergens" }).check();
    await page.getByRole("button", { name: "Save and publish" }).click();
    await expect(page.getByText(/Tick the allergens this recipe contains/)).toBeVisible();
    await expect(page.getByLabel("Step 2", { exact: true })).toHaveValue("Bake for 20 minutes.");

    await page.getByRole("radio", { name: /No major allergens/ }).check();
    await page.getByRole("button", { name: "Save and publish" }).click();
    await page.waitForURL(/done=published$/);
    await expect(page.getByRole("status")).toHaveText("Published. Parents can now open it.");
    await expect(page.getByText("Live", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Web address")).toHaveAttribute("readonly", "");
    await expect(page.getByLabel("Step 2", { exact: true })).toHaveValue("Bake for 20 minutes.");
    const editUrl = page.url().split("?")[0];

    // Parents can now open it.
    const live = await page.goto(`/recipes/${slug}`);
    expect(live?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();

    // Take it down again.
    await page.goto(editUrl);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Take off the site" }).click();
    await page.waitForURL(/done=withdrawn$/);
    await expect(page.getByText("Taken down", { exact: true })).toBeVisible();

    const gone = await page.goto(`/recipes/${slug}`);
    expect(gone?.status()).toBe(404);
  });

  test("a free homepage recipe cannot be taken down from the admin area", async ({ page }) => {
    await signIn(page, EDITOR_EMAIL, "/admin/recipes?state=published");
    await page.waitForURL(/\/admin\/recipes\?state=published$/);
    await page.getByRole("link", { name: /Synthetic Free Oat Bake/ }).click();
    await page.waitForURL(/\/admin\/recipes\/[0-9a-f-]+$/);
    await expect(page.getByText(/Free recipe 1 of 3/)).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Take off the site" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "one of the three free recipes" })).toBeVisible();

    const stillLive = await page.goto("/recipes/synth-free-oat-bake");
    expect(stillLive?.status()).toBe(200);
  });

  test("the account page links admins to the recipe admin", async ({ page }) => {
    await signIn(page, EDITOR_EMAIL, "/account");
    await page.waitForURL(/\/account$/);
    await expect(page.getByRole("link", { name: /Recipe admin/ })).toHaveAttribute("href", "/admin/recipes");
  });
});
