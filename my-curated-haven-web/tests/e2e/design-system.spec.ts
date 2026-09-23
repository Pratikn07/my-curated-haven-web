import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const narrowPages = ["/", "/about", "/support"];

test("public pages do not scroll sideways at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of narrowPages) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});

test("homepage copy stays visible with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByText("Recipes by Tiny Soho, inside My Curated Haven", { exact: true }),
  ).toBeVisible();
});

test("public pages do not include design fixtures", async ({ page }) => {
  for (const path of ["/", "/about", "/support", "/privacy", "/terms"]) {
    const response = await page.goto(path);
    const body = await response?.text();
    expect(body, path).not.toContain("Sample oat fingers");
    expect(body, path).not.toContain("Design review fixture");
    expect(body, path).not.toContain("Price:");
  }
});

test("design review filters apply and cancel", async ({ page }) => {
  await page.goto("/design-review");
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("checkbox", { name: "Meal" }).check();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Remove Meal" })).toHaveCount(0);

  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("checkbox", { name: "Meal" }).check();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("status")).toContainText("1 sample recipe");
  await expect(page.getByRole("button", { name: "Remove Meal" })).toBeVisible();
});

test("busy example records one activation", async ({ page }) => {
  await page.goto("/design-review");
  await page.getByRole("button", { name: "Start sample action" }).click();
  await expect(page.getByTestId("busy-count")).toHaveText("1");
  await expect(page.getByRole("button", { name: "Saving sample" })).toBeDisabled();
});

test("empty and failed examples use different recovery text", async ({ page }) => {
  await page.goto("/design-review");
  await expect(page.getByText("This is an empty result, not a failed request.")).toBeVisible();
  await expect(page.getByText("The sample request failed.")).toBeVisible();
});

test("print layout keeps the sample recipe and hides navigation", async ({ page }) => {
  await page.goto("/design-review");
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
  await expect(page.getByText("1 cup rolled oats")).toBeVisible();
  await expect(page.getByText("Allergen information not reviewed")).toBeVisible();
});

test("touched public pages have no serious accessibility violations", async ({ page }) => {
  for (const path of ["/", "/about", "/support"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(serious, path).toEqual([]);
  }
});
