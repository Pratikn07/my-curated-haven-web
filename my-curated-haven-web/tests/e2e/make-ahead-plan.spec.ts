import { expect, test, type Page } from "@playwright/test";
import { createMakeAheadFixture, type MakeAheadFixture } from "./make-ahead-fixtures";

/**
 * The Halloween make-ahead plan, on a phone (webkit-mobile, like Instagram's in-app browser on an iPhone). The plan
 * in the database is the invented fixture (tests/fixtures/make-ahead-plan.fixture.json). Needs a loopback stack
 * with SUPABASE_SERVICE_ROLE_KEY. Set MAKE_AHEAD_SCREENSHOTS to a folder to save 390px screenshots for review.
 */

const PLAN = "/collections/halloween/plan";
const BUY_LINE = "Comes with a make-ahead plan and one shopping list for Halloween weekend.";
const SCREENSHOTS = process.env.MAKE_AHEAD_SCREENSHOTS;
/** Words only a buyer may receive: fixture task, list and tier text, and the owner-only controls. */
const PAID = [
  "Fixture shopping list",
  "Stardust yogurt",
  "Moon melons",
  "Comet Crumble",
  "Fixture start with the comets",
  "Fixture toddler job",
  "Fixture safety note",
  "Fixture a month ahead",
  "Fixture day one",
  "Fixture moon party list",
  "Copy list",
  "Toddler job",
];

async function shot(page: Page, name: string) {
  if (!SCREENSHOTS) return;
  await page.screenshot({ path: `${SCREENSHOTS}/${name}.png`, fullPage: true, animations: "disabled" });
}

/** Records what "Copy list" hands the clipboard. */
async function recordClipboard(page: Page) {
  await page.addInitScript(() => {
    const target = window as unknown as { __copied: string | null };
    target.__copied = null;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text: string) => {
          target.__copied = text;
          return Promise.resolve();
        },
      },
    });
  });
}

async function expectPreviewOnly(page: Page) {
  const response = await page.request.get(PLAN);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("Your Halloween make-ahead plan");
  expect(html).toContain("Freezer night");
  for (const paid of PAID) expect(html, paid).not.toContain(paid);

  await page.goto(PLAN);
  await expect(page.getByRole("heading", { level: 1, name: "Your Halloween make-ahead plan" })).toBeVisible();
  for (const day of ["Freezer night", "Fridge day", "Halloween"]) {
    await expect(page.getByRole("heading", { level: 3, name: day, exact: true })).toBeVisible();
  }
  await expect(page.getByText("About 45 min")).toBeVisible();
  await expect(page.getByText("Spider Cracker Bites")).toBeVisible();
  await expect(page.getByRole("heading", { name: "In the Halloween book" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Buy (now|Collection)/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "See all 20 recipes" })).toHaveAttribute("href", "/collections/halloween");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  const rendered = await page.content();
  for (const paid of PAID) expect(rendered, paid).not.toContain(paid);
}

test.describe("[make-ahead] Halloween make-ahead plan", () => {
  test.describe.configure({ mode: "serial" });
  let fixture: MakeAheadFixture;

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "webkit-mobile", "The plan is checked on a phone, in WebKit");
  });

  test.beforeAll(async ({}, testInfo) => {
    if (testInfo.project.name !== "webkit-mobile") return;
    fixture = await createMakeAheadFixture();
  });

  test.afterAll(async () => {
    await fixture?.dispose();
  });

  test("a buyer opens the plan from the book page, ticks an item that stays ticked, and copies the list", async ({ page }) => {
    await fixture.loginOwner(page);
    await recordClipboard(page);

    await page.goto("/collections/halloween");
    const card = page.getByRole("link", { name: /Your make-ahead plan/ });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Thu, Fri, Sat · one shopping list");
    await expect(page.getByText(BUY_LINE)).toHaveCount(0);
    await shot(page, "book-page-owner-390");

    await card.click();
    await expect(page).toHaveURL(PLAN);
    await expect(page.getByRole("heading", { level: 1, name: "Your Halloween make-ahead plan" })).toBeVisible();
    await expect(page.getByText("Fixture day one · freezer").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Comet Crumble" })).toHaveAttribute("href", "/recipes/mummy-banana-pops");
    await expect(page.getByRole("link", { name: "Planet Peels" })).toHaveAttribute("href", "/recipes/mandarin-orange-pumpkins");
    await expect(page.getByText("Fixture toddler job: sprinkle the stardust.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fixture: making something else?" })).toBeVisible();

    const melons = page.getByRole("checkbox", { name: /^Moon melons, 3/ });
    await expect(melons).not.toBeChecked();
    await melons.check();
    await expect(melons).toBeChecked();
    await page.reload();
    await expect(page.getByRole("checkbox", { name: /^Moon melons, 3/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /^Planet plums, 6/ })).not.toBeChecked();

    await page.getByRole("button", { name: "Copy list" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Copied." })).toHaveText("Copied. Paste it into your notes or a message.");
    const copied = await page.evaluate(() => (window as unknown as { __copied: string | null }).__copied);
    expect(copied).toContain("Fixture moon party list\n\nFIXTURE COLD AISLE\n- Stardust yogurt, 2 fixture tubs");
    expect(copied).toContain("- Moon melons, 3");

    // Never sideways on a phone.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, "plan-owner-390");
  });

  test("a visitor sees the buy-box line, and the plan page is only a preview with the way to buy", async ({ page }) => {
    await page.goto("/collections/halloween");
    await expect(page.getByText(BUY_LINE)).toBeVisible();
    await expect(page.locator("#buy").getByRole("link", { name: "See the plan" })).toHaveAttribute("href", PLAN);
    await expect(page.getByRole("link", { name: /Your make-ahead plan/ })).toHaveCount(0);

    await expectPreviewOnly(page);
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", `/sign-in?returnTo=${PLAN}`);
    await shot(page, "plan-preview-390");
  });

  test("a signed-in visitor who hasn't bought the book gets the same preview, with nothing paid in the page", async ({ page }) => {
    await fixture.loginStranger(page);
    await expectPreviewOnly(page);
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  });

  test("another book has no plan card, no buy-box line and no plan page", async ({ page }) => {
    await fixture.loginOwner(page);
    if (fixture.otherOwnedSlug) {
      await page.goto(`/collections/${fixture.otherOwnedSlug}`);
      await expect(page.getByText("You own this collection. Every recipe below is open to you.")).toBeVisible();
      await expect(page.getByRole("link", { name: /make-ahead plan/i })).toHaveCount(0);
      await expect(page.getByText(BUY_LINE)).toHaveCount(0);
      expect((await page.request.get(`/collections/${fixture.otherOwnedSlug}/plan`)).status()).toBe(404);
    }
    await page.goto("/collections/meal-prep");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /make-ahead plan/i })).toHaveCount(0);
    await expect(page.getByText(BUY_LINE)).toHaveCount(0);
    expect((await page.request.get("/collections/meal-prep/plan")).status()).toBe(404);
  });

  test("My Library has the plan link on the Halloween book only", async ({ page }) => {
    await fixture.loginOwner(page);
    await page.goto("/account/collections");
    const halloween = page.locator("#halloween");
    await expect(halloween.getByRole("heading", { name: "Halloween" })).toBeVisible();
    await expect(halloween.getByRole("link", { name: "Make-ahead plan" })).toHaveAttribute("href", PLAN);
    await expect(page.getByRole("link", { name: "Make-ahead plan" })).toHaveCount(1);

    await halloween.getByRole("link", { name: "Make-ahead plan" }).click();
    await expect(page).toHaveURL(PLAN);
    await expect(page.getByRole("heading", { name: "Fixture shopping list" })).toBeVisible();
  });
});
