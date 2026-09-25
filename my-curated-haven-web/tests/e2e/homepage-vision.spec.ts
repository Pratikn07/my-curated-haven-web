import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

function isDesktop(projectName: string) {
  return projectName.includes("desktop");
}

test("[homepage-vision] free-ready page points to free recipes without implying a sale", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A little more support for everyday parenting.",
  );
  await expect(page.getByText("brings together toddler recipes", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "See the recipe plan" })).toHaveCount(0);
  const recipeActions = page.getByRole("link", { name: "Explore free recipes" });
  await expect(recipeActions).toHaveCount(2);
  await expect(recipeActions.first()).toHaveAttribute("href", "/recipes");
  await expect(recipeActions.last()).toHaveAttribute("href", "/recipes");
  await expect(page.getByRole("link", { name: "See what's ahead" })).toHaveAttribute(
    "href",
    "#whats-ahead",
  );

  const recipes = page.locator("#recipes");
  await expect(recipes).toContainText("Recipes by Tiny Soho, inside My Curated Haven.");
  await expect(recipes).toContainText("read or print it without an account");
  await expect(recipes).not.toContainText("in preparation");
  // Only approved production slugs render as cards; local fixtures use synthetic slugs.
  expect(await recipes.locator("article").count()).toBeLessThanOrEqual(3);
  await expect(page.locator("#recipe-collection")).toHaveCount(0);
  await expect(page.locator("a[href*='checkout'], a[href*='buy'], a[href*='purchase']")).toHaveCount(0);
});

test("[homepage-vision] four pillars and three static previews have visible status", async ({ page }) => {
  await page.goto("/");
  const overview = page.locator("#explore-haven");
  await expect(overview.getByRole("heading", { name: "Meet My Curated Haven" })).toBeVisible();
  for (const label of ["Recipes", "Parenting Chat", "Curated Shop", "Bloom"]) {
    await expect(overview.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(overview.getByRole("link", { name: /Recipes/ })).toHaveAttribute("href", "#recipes");
  for (const [label, anchor] of [
    ["Parenting Chat", "#parenting-chat-preview"],
    ["Curated Shop", "#curated-shop-preview"],
    ["Bloom", "#bloom-preview"],
  ]) {
    await expect(overview.getByRole("link", { name: `Preview ${label}` })).toHaveAttribute("href", anchor);
  }

  for (const [id, title] of [
    ["parenting-chat-preview", "Everyday questions deserve thoughtful support."],
    ["curated-shop-preview", "Parenting products, thoughtfully gathered."],
    ["bloom-preview", "A place for the little milestones."],
  ]) {
    const preview = page.locator(`#${id}`);
    await expect(preview.getByRole("heading", { name: title })).toBeVisible();
    await expect(preview.getByText("Planned for the web", { exact: true })).toBeVisible();
    await expect(preview.getByText("Illustrative preview based on our parenting app. The final web experience will differ.")).toBeVisible();
    await expect(preview.locator("input, textarea, form, button")).toHaveCount(0);
  }
  await expect(page.locator("#parenting-chat-preview")).toContainText("Sample conversation");
  await expect(page.locator("#curated-shop-preview")).toContainText("Feeding");
  await expect(page.locator("#bloom-preview")).toContainText("Sample milestone");
  await expect(page.locator("a[href^='/chat'], a[href^='/shop'], a[href^='/bloom']")).toHaveCount(0);
  const renderedCopy = await page.locator("main").innerText();
  expect(renderedCopy).not.toMatch(/\$\s?\d|expert-vetted|clinician-approved|buy now|limited time/i);
});

test("[homepage-vision] story and free-ready FAQs use established facts", async ({ page }) => {
  await page.goto("/");
  const story = page.locator("#our-story");
  await expect(story.getByRole("heading", { name: "The story behind My Curated Haven and Tiny Soho" })).toBeVisible();
  await expect(story).toContainText("My Curated Haven is the product");
  await expect(story).toContainText("Tiny Soho grew from that work");

  const faq = page.locator("#questions");
  await expect(faq.getByRole("heading", { name: "Questions" })).toBeVisible();
  await expect(faq.getByText("These sections are sneak peeks", { exact: false })).toBeVisible();
  await expect(faq.getByText("The free recipe area is available from the Recipes page", { exact: false })).toBeVisible();
  await expect(faq.getByText("No paid collection is being presented here", { exact: false })).toBeVisible();
  await expect(faq.getByRole("link", { name: "Support" })).toHaveAttribute("href", "/support");
});

test("[homepage-vision] metadata and social image match the preparation message", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("My Curated Haven | Recipes and a glimpse of what's ahead");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /starting with toddler recipes by Tiny Soho.*planned for the web/i,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /^https:\/\/mycuratedhaven\.com\/?$/,
  );
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    "content",
    /starting with recipes.*previews/i,
  );
  const image = await request.get("/opengraph-image");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
});

test("[homepage-vision] cross-route What's ahead anchor closes the mobile menu and focuses its target", async ({ page }, testInfo) => {
  test.skip(isDesktop(testInfo.project.name), "mobile navigation behavior is covered by mobile projects");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about");
  const menu = page.getByRole("button", { name: "Open menu" });
  const menuId = await menu.getAttribute("aria-controls");
  await menu.click();
  await page.locator(`[id="${menuId}"]`).getByRole("link", { name: "What's ahead" }).click();
  await expect(page).toHaveURL(/\/#whats-ahead$/);
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#whats-ahead")).toBeFocused();
  await expect(page.locator("#whats-ahead")).toBeInViewport();
});

test("[homepage-vision] page fits the documented responsive widths", async ({ page }, testInfo) => {
  test.skip(!isDesktop(testInfo.project.name), "the width sweep runs once on desktop");
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const sizes = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(sizes.scroll - sizes.client, `${width}px horizontal overflow`).toBeLessThanOrEqual(1);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#whats-ahead")).toBeVisible();
  }
});

test("[homepage-vision] home page has no serious automated accessibility violations", async ({ page }, testInfo) => {
  test.skip(!isDesktop(testInfo.project.name), "axe scan runs once on desktop");
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.filter((issue) => ["critical", "serious"].includes(issue.impact ?? ""))).toEqual([]);
});

test("[homepage-vision] image failure leaves headings, status and descriptions readable", async ({ page }) => {
  await page.route("**/_next/image**", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#parenting-chat-preview")).toContainText("Planned for the web");
  await expect(page.locator("#curated-shop-preview")).toContainText("Planned for the web");
  await expect(page.locator("#bloom-preview")).toContainText("Planned for the web");
});
