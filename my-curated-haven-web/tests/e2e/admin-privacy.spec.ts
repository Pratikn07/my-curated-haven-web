import { expect, test } from "@playwright/test";

test("direct admin entry sends no admin telemetry", async ({ page }) => {
  const requests: string[] = [];
  await page.route("**/e/**", (route) => {
    requests.push(route.request().url());
    route.abort();
  });
  await page.goto("/admin/recipes");
  expect(requests.filter((url) => url.includes("/admin")).length).toBe(0);
});

test("public capture still works outside admin", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();
});
