import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const narrowPages = ["/", "/about", "/support"];

test("[QA-M01:partial] public pages do not scroll sideways at 320px", async ({ page }) => {
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
    page
      .getByRole("contentinfo")
      .getByText("Recipes by Tiny Soho, inside My Curated Haven.", { exact: true }),
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

test("[QA-M09:partial] print layout keeps the sample recipe and hides navigation", async ({ page }) => {
  await page.goto("/design-review");
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
  await expect(page.getByText("1 cup rolled oats")).toBeVisible();
  await expect(page.getByText("Allergen information not reviewed")).toBeVisible();
});

// Phase 3 audit R3-02: the original scan covered three pages and missed a contrast failure on the legal pages.
const publicPages = [
  "/",
  "/recipes",
  "/recipes/synth-free-oat-bake",
  "/about",
  "/support",
  "/privacy",
  "/terms",
  "/sign-in",
];

test("[QA-M08:partial] public pages have no serious accessibility violations", async ({ page }) => {
  for (const path of publicPages) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(serious, path).toEqual([]);
  }
});

// Phase 3 audit R3-01: next/font variables must reach :root, or every page falls back to the system font.
test("brand fonts are the computed fonts", async ({ page }) => {
  await page.goto("/");
  const fonts = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    heading: getComputedStyle(document.querySelector("h1")!).fontFamily,
    wordmark: getComputedStyle(document.querySelector("header a[href='/']")!).fontFamily,
  }));
  expect(fonts.body).toMatch(/Inter/);
  expect(fonts.heading).toMatch(/Inter/);
  expect(fonts.wordmark).toMatch(/Cormorant/);
});

// Phase 3 audit R3-03: the skip link must be the first focus stop.
test("the skip link is the first focus stop", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Safari's Tab key skips links unless the user enables full keyboard access");
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveText("Skip to content");
});

// Phase 3 audit R3-05: D06 text scaling. The homepage previews used to push the page to 459px.
test("public pages reflow at 200% text size", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/recipes", "/recipes/synth-free-oat-bake", "/support"]) {
    await page.goto(path);
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(width.scroll, path).toBeLessThanOrEqual(width.client);
  }
});

// 2026-09-26: the consent banner and preferences dialog were removed (owner decision).
test("no cookie banner or preferences link is shown", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Privacy and cookie choices" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cookie & Analytics Preferences" })).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).paddingBottom)).toBe("0px");
});
