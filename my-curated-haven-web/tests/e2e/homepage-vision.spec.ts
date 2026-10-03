import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

function isDesktop(projectName: string) {
  return projectName.includes("desktop");
}

function roomList(page: Page) {
  return page.getByRole("list", { name: "Rooms in the house" });
}

test("[haven-house] opening offers recipes first without implying a sale", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Good enough is exactly enough.");
  await expect(page.getByText("A little room to pause.")).toBeVisible();

  const hero = page.locator("#house");
  await expect(hero.getByRole("link", { name: "Browse recipes" }).first()).toHaveAttribute("href", "/recipes");
  await expect(hero.getByRole("link", { name: "See what's coming" })).toHaveAttribute("href", "#library");

  const recipes = page.locator("#recipes");
  await expect(recipes).toContainText("The Kitchen · Recipes by Tiny Soho");
  expect(await recipes.locator("article").count()).toBeLessThanOrEqual(3);
  await expect(page.locator("#recipe-collection")).toHaveCount(0);
  await expect(page.locator("a[href*='checkout'], a[href*='buy'], a[href*='purchase']")).toHaveCount(0);
  const renderedCopy = await page.locator("main").innerText();
  expect(renderedCopy).not.toMatch(/\$\s?\d|expert-vetted|clinician-approved|buy now|limited time/i);
});

test("[haven-house] every room shows its name and status as text", async ({ page }) => {
  await page.goto("/");
  const rooms = roomList(page);
  for (const [name, holds, status] of [
    ["Kitchen", "Recipes", "Open now"],
    ["Library", "Storybooks", "Coming soon"],
    ["Nursery", "Milestones", "Later"],
    ["Shelf", "Family finds", "Later"],
  ]) {
    const room = rooms.getByRole("link", { name: new RegExp(`^${name}`) });
    await expect(room).toBeVisible();
    await expect(room).toContainText(holds);
    await expect(room).toContainText(status);
  }
  await expect(page.locator("a[href^='/chat'], a[href^='/shop'], a[href^='/bloom'], a[href^='/library']")).toHaveCount(0);
});

test("[haven-house] tapping a room opens its card and Back returns to the house", async ({ page }) => {
  await page.goto("/");
  await roomList(page).getByRole("link", { name: /^Library/ }).click();

  await expect(page).toHaveURL(/#room-library$/);
  const card = page.locator("#room-library");
  await expect(card).toBeVisible();
  await expect(card.getByRole("heading", { name: "The Library · Storybooks" })).toBeFocused();
  await expect(card.getByRole("link", { name: "Try a sample page" })).toHaveAttribute("href", "#library");
  await expect(page.locator("#room-kitchen")).toBeHidden();
  await expect(page.locator(".house-frame")).toHaveAttribute("data-active", "library");

  await page.getByRole("button", { name: "Back to the house" }).click();
  await expect(card).toBeHidden();
  await expect(page.locator(".house-frame")).not.toHaveAttribute("data-active", /.+/);

  await roomList(page).getByRole("link", { name: /^Kitchen/ }).click();
  await expect(page.locator("#room-kitchen").getByRole("link", { name: "Browse recipes" })).toHaveAttribute("href", "/recipes");
  await page.keyboard.press("Escape");
  await expect(page.locator("#room-kitchen")).toBeHidden();
});

test("[haven-house] a shared room link opens that room", async ({ page }) => {
  await page.goto("/#room-shelf");
  await expect(page.locator("#room-shelf")).toBeVisible();
  await page.locator("#room-shelf").getByRole("button", { name: "See why we'd pick it" }).click();
  await expect(page.locator("#room-shelf")).toContainText("Sample only. Not a product listing.");
});

test("[haven-house] samples in unopened rooms say nothing is saved", async ({ page }) => {
  await page.goto("/");
  await roomList(page).getByRole("link", { name: /^Nursery/ }).click();
  await page.locator("#room-nursery").getByRole("button", { name: "Stamp a sample keepsake" }).click();
  await expect(page.locator("#room-nursery")).toContainText("Sample only. Nothing is saved.");
  await expect(page.locator("#room-nursery").locator("input, textarea, form")).toHaveCount(0);
});

test.describe("[haven-house] without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every room card is listed and reachable by link", async ({ page }) => {
    await page.goto("/");
    for (const id of ["kitchen", "library", "nursery", "shelf"]) {
      await expect(page.locator(`#room-${id}`)).toBeVisible();
      await expect(roomList(page).locator(`a[href="#room-${id}"]`)).toHaveCount(1);
    }
    await expect(page.locator("html")).not.toHaveAttribute("data-daypart", /.+/);
  });
});

test("[haven-house] the storybook sample uses the typed name and stays on the page", async ({ page }) => {
  await page.goto("/");
  const library = page.locator("#library");
  await expect(library.getByRole("heading", { name: "A bedtime story where your child is the hero." })).toBeVisible();
  await expect(library).toContainText("The Library · Coming soon");
  await library.getByLabel("Try your child's name").fill("noor");
  await expect(library.locator("figcaption")).toContainText("Noor found a silver ladder");
  await library.getByRole("button", { name: "A new baby at home" }).click();
  await expect(library.getByRole("button", { name: "A new baby at home" })).toHaveAttribute("aria-pressed", "true");
  await expect(library.locator("figcaption")).toContainText("Noor got a very important new job");
  await library.getByRole("button", { name: "Paper cut" }).click();
  await expect(library.getByRole("button", { name: "Paper cut" })).toHaveAttribute("aria-pressed", "true");
  await expect(library.locator('[data-style="paper"]')).toHaveAttribute("data-on", "");
});

test.describe("[haven-house] the house light follows the visitor's clock", () => {
  test.use({ timezoneId: "UTC" });

  for (const [time, daypart] of [
    ["2026-10-02T09:00:00Z", "day"],
    ["2026-10-02T18:30:00Z", "evening"],
    ["2026-10-02T21:00:00Z", "night"],
    ["2026-10-03T05:30:00Z", "night"],
  ] as const) {
    test(`${time} is ${daypart}`, async ({ page }) => {
      await page.clock.setFixedTime(new Date(time));
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-daypart", daypart);
      // Light is atmosphere only: statuses read the same at any hour.
      await expect(roomList(page)).toContainText("Open now");
    });
  }
});

test.describe("[haven-house] the painted house", () => {
  test.use({ timezoneId: "UTC" });

  async function houseImagesAt(page: Page, time: string) {
    const requested: string[] = [];
    page.on("request", (request) => {
      const match = request.url().match(/\/images\/house\/(house-[a-z]+)[-.]/);
      if (match) requested.push(match[1]);
    });
    await page.clock.setFixedTime(new Date(time));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    return new Set(requested);
  }

  test("a daytime visit downloads only the day painting", async ({ page }) => {
    const images = await houseImagesAt(page, "2026-10-02T12:00:00Z");
    expect([...images]).toEqual(["house-day"]);
    await expect(page.locator(".hs-fireflies")).toBeHidden();
  });

  test("a late-night visit downloads the night painting and lamp glow, and the fireflies come out", async ({ page }) => {
    const images = await houseImagesAt(page, "2026-10-02T23:00:00Z");
    expect(images.has("house-night")).toBe(true);
    expect(images.has("house-glow")).toBe(true);
    expect(images.has("house-day")).toBe(false);
    await expect(page.locator(".hs-fireflies")).toBeVisible();
  });

  test("reduced motion keeps the scene still but still lit for the hour", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.setFixedTime(new Date("2026-10-02T23:00:00Z"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-house-night", "");
    await expect(page.locator(".hs-fireflies")).toBeHidden();
    await expect(page.locator(".hs-glow-breath")).toHaveCSS("animation-name", "none");
    const frame = page.locator(".house-frame");
    await frame.hover({ position: { x: 20, y: 20 } });
    await page.waitForTimeout(300);
    await expect(page.locator('[data-depth="near"]')).not.toHaveAttribute("style", /translate/);
  });
});

test("[haven-house] moving over the house gives it depth", async ({ page }, testInfo) => {
  test.skip(!isDesktop(testInfo.project.name), "pointer depth is checked with a mouse on desktop");
  await page.goto("/");
  const frame = page.locator(".house-frame");
  await frame.hover({ position: { x: 20, y: 20 } });
  await expect(page.locator('[data-depth="near"]')).toHaveAttribute("style", /translate/);
});

test("[haven-house] FAQ names the company and points to support", async ({ page }) => {
  await page.goto("/");
  const faq = page.locator("#questions");
  await expect(faq.getByRole("heading", { name: "Questions" })).toBeVisible();
  await expect(faq).toContainText("read or print it without an account");
  await expect(faq).toContainText("Nibble & Nurture, our small company");
  await expect(faq).toContainText("no paid collection is being presented here");
  await expect(faq.getByRole("link", { name: "Support" })).toHaveAttribute("href", "/support");
});

test("[haven-house] metadata and social image use the My Curated Haven brand", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("My Curated Haven | A calm corner for parents of little ones");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /toddler recipes by Tiny Soho/i);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https:\/\/mycuratedhaven\.com\/?$/);
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "My Curated Haven");
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /My Curated Haven.*Tiny Soho/);
  const image = await request.get("/opengraph-image");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
});

test("[haven-house] The house link closes the mobile menu and focuses the house", async ({ page }, testInfo) => {
  test.skip(isDesktop(testInfo.project.name), "mobile navigation behavior is covered by mobile projects");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about");
  const menu = page.getByRole("button", { name: "Open menu" });
  const menuId = await menu.getAttribute("aria-controls");
  await menu.click();
  await page.locator(`[id="${menuId}"]`).getByRole("link", { name: "The house" }).click();
  await expect(page).toHaveURL(/\/#house$/);
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#house")).toBeFocused();
  await expect(page.locator("#house")).toBeInViewport();
});

test("[haven-house] a phone sees the headline, Browse recipes and the house on the first screen", async ({ page }, testInfo) => {
  test.skip(isDesktop(testInfo.project.name), "first-screen check runs on phone projects");
  // An iPhone screen minus Instagram's in-app browser bars.
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  await expect(page.locator("#house").getByRole("link", { name: "Browse recipes" }).first()).toBeInViewport();
  await expect(page.locator(".house-frame")).toBeInViewport({ ratio: 0.5 });
});

test("[haven-house] page fits the documented responsive widths", async ({ page }, testInfo) => {
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
    await expect(page.locator(".house-frame")).toBeVisible();
  }
});

test("[haven-house] home page has no serious automated accessibility violations", async ({ page }, testInfo) => {
  test.skip(!isDesktop(testInfo.project.name), "axe scan runs once on desktop");
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.filter((issue) => ["critical", "serious"].includes(issue.impact ?? ""))).toEqual([]);
});

test("[haven-house] image failure leaves headings and room status readable", async ({ page }) => {
  await page.route("**/_next/image**", (route) => route.abort());
  await page.route("**/images/house/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(roomList(page)).toContainText("Coming soon");
});
