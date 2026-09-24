import { expect, test, type Page } from "@playwright/test";

const publicRoutes = [
  { path: "/about", heading: "My Curated Haven" },
  { path: "/support", heading: "Support" },
  { path: "/privacy", heading: "Privacy Policy" },
  { path: "/terms", heading: "Terms of Service" },
] as const;

const deferredRoutes = ["/features", "/resources", "/careers", "/contact"] as const;

const deferredCopy = [
  "Modern Parents",
  "Expert-Vetted",
  "Join Our Mission",
  "Live Chat",
];

const sitemapUrls = [
  "https://mycuratedhaven.com/",
  "https://mycuratedhaven.com/recipes",
  "https://mycuratedhaven.com/about",
  "https://mycuratedhaven.com/support",
  "https://mycuratedhaven.com/privacy",
  "https://mycuratedhaven.com/terms",
];

function isDesktop(projectName: string) {
  return projectName.includes("desktop");
}

async function overflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test("homepage shows the brand and recipe promise", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("navigation")).toContainText("My Curated Haven");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Simple toddler recipes",
  );
});

test("public pages load", async ({ page }) => {
  for (const route of publicRoutes) {
    const response = await page.goto(route.path);
    expect(response?.status(), route.path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(route.heading);
  }
});

test("brand link returns home", async ({ page }) => {
  await page.goto("/about");
  await page.getByRole("navigation").getByRole("link", { name: "My Curated Haven" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("support offers the email address without a ticket form", async ({ page }) => {
  await page.goto("/support");
  const email = page.getByRole("link", { name: "support@mycuratedhaven.com" });
  await expect(email).toHaveAttribute("href", "mailto:support@mycuratedhaven.com");
  await expect(page.getByRole("link", { name: "Email support" })).toHaveAttribute(
    "href",
    "mailto:support@mycuratedhaven.com",
  );
  await expect(page.getByRole("button", { name: "Copy address" })).toBeVisible();
  await expect(page.getByText("does not create a support ticket")).toBeVisible();
});

test("header and footer links stay on this site", async ({ page }) => {
  await page.goto("/");
  const hrefs = await page
    .locator("nav a[href^='/'], footer a[href^='/']")
    .evaluateAll((links) => [
      ...new Set(
        links
          .map((link) => link.getAttribute("href"))
          .filter((href): href is string => Boolean(href)),
      ),
    ]);

  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    expect(href, "deferred or future route linked").not.toMatch(
      /^\/(features|resources|careers|contact)(\/|$)/,
    );
    const response = await page.request.get(href);
    expect(response.status(), href).toBeLessThan(400);
  }
});

test("header fits a 320px screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(1);
});

test("mobile menu opens, closes, and reaches support", async ({ page }, testInfo) => {
  test.skip(isDesktop(testInfo.project.name), "desktop uses the top navigation");

  await page.goto("/");
  const menuButton = page.getByRole("button", { name: /menu/i });
  const menuId = await menuButton.getAttribute("aria-controls");
  expect(menuId).toBeTruthy();

  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");

  await menuButton.click();
  await page.locator(`[id="${menuId}"]`).getByRole("link", { name: "Support" }).click();
  await expect(page).toHaveURL(/\/support$/);
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("desktop navigation reaches support", async ({ page }, testInfo) => {
  test.skip(!isDesktop(testInfo.project.name), "mobile uses the menu button");
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "Support" }).click();
  await expect(page).toHaveURL(/\/support$/);
});

function isKnownBrowserNoise(message: string) {
  return (
    /favicon/i.test(message) ||
    /access control checks/i.test(message)
  );
}

test("tested pages do not throw", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await page.goto("/support");

  expect(pageErrors.filter((message) => !isKnownBrowserNoise(message))).toEqual([]);
  expect(consoleErrors.filter((message) => !isKnownBrowserNoise(message))).toEqual([]);
});

test("deferred routes are unavailable", async ({ page }) => {
  for (const path of deferredRoutes) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "This page is not available",
    );
    const body = await response?.text();
    for (const phrase of deferredCopy) {
      expect(body, path).not.toContain(phrase);
    }
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Support" })).toHaveAttribute("href", "/support");
  }
});

test("homepage does not ship deferred page text", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "asset scan runs once");

  await page.goto("/");
  const html = await page.content();
  for (const phrase of deferredCopy) {
    expect(html).not.toContain(phrase);
  }

  const scriptSrcs = await page.locator("script[src]").evaluateAll((scripts) =>
    scripts
      .map((script) => script.getAttribute("src"))
      .filter((src): src is string => Boolean(src)),
  );
  for (const src of scriptSrcs) {
    const response = await page.request.get(src);
    expect(response.status(), src).toBeLessThan(400);
    const source = await response.text();
    for (const phrase of deferredCopy) {
      expect(source, src).not.toContain(phrase);
    }
  }
});

test("sitemap lists only the public pages", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();
  for (const url of sitemapUrls) {
    expect(xml).toContain(url);
  }
  for (const blocked of ["/features", "/resources", "/careers", "/contact"]) {
    expect(xml).not.toContain(`mycuratedhaven.com${blocked}`);
  }
});

test("metadata uses the official origin", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/My Curated Haven/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /^https:\/\/mycuratedhaven\.com\/?$/,
  );
});

test("the site does not link to a purchase or mobile app store", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /buy/i })).toHaveCount(0);
  await expect(page.locator("a[href*='checkout'], a[href*='apps.apple.com']")).toHaveCount(0);
});
