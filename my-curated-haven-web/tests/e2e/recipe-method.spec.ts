import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

// The method layout. A made-up method (tests/fixtures/recipe-method-sample.json) is put on two seeded recipes
// for the length of this file, then the earlier values are put back.
test.describe.configure({ mode: "serial" });

const OPEN = "synth-free-veggie-frittata"; // a free recipe every visitor can open
const LOCKED = "synth-paid-golden-soup"; // a paid recipe nobody owns in the seed
const CLASSIC = "synth-free-oat-bake"; // no method content: today's layout
// Step photos are served from the public storage folder of the Supabase project the app uses.
const PHOTOS = `${(process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321").replace(/\/+$/, "")}/storage/v1/object/public/recipe-steps/halloween`;

const example = JSON.parse(
  readFileSync(join(__dirname, "../fixtures/recipe-method-sample.json"), "utf8")
);
const method = { ...example };
delete method.review;
delete method.slug;

/** The local Supabase database; refuses anything that is not loopback. */
function localDatabaseUrl(): string {
  const raw = process.env.ADMIN_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54342/postgres";
  const host = new URL(raw).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") throw new Error("Refusing a non-loopback database.");
  return raw;
}

let db: Client;
let before: { slug: string; method: unknown }[] = [];

test.beforeAll(async () => {
  db = new Client({ connectionString: localDatabaseUrl() });
  await db.connect();
  before = (
    await db.query<{ slug: string; method: unknown }>(
      `SELECT c.slug, b.method FROM public.recipe_bodies b JOIN public.recipe_catalog c ON c.id = b.recipe_id
       WHERE c.slug = ANY($1::text[])`,
      [[OPEN, LOCKED]]
    )
  ).rows;
  expect(before).toHaveLength(2);
  await db.query(
    `UPDATE public.recipe_bodies b SET method = $2::jsonb FROM public.recipe_catalog c
     WHERE c.id = b.recipe_id AND c.slug = ANY($1::text[])`,
    [[OPEN, LOCKED], JSON.stringify(method)]
  );
});

test.afterAll(async () => {
  for (const row of before) {
    await db.query(
      `UPDATE public.recipe_bodies b SET method = $2::jsonb FROM public.recipe_catalog c
       WHERE c.id = b.recipe_id AND c.slug = $1`,
      [row.slug, row.method === null ? null : JSON.stringify(row.method)]
    );
  }
  await db.end();
});

const steps = (page: Page) => page.locator("section[aria-labelledby='instructions-heading'] li.rm-step");

test("hands-on time, the safety box and the method replace the classic sections", async ({ page }) => {
  await page.goto(`/recipes/${OPEN}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Synthetic Free Veggie Frittata");

  await expect(page.getByText("Hands-on", { exact: true })).toBeVisible();
  await expect(page.getByText("15 min", { exact: true })).toBeVisible();
  await expect(page.getByText("6 pops", { exact: true })).toBeVisible();
  // No total time or waiting in the header; the wait is told inside the method, just above step 1.
  await expect(page.locator("header").getByText(/2 hr/)).toHaveCount(0);
  const methodSection = page.locator("section[aria-labelledby='instructions-heading']");
  await expect(methodSection.locator(".rm-wait-note")).toHaveText(
    "Along the way it needs 2 hr 30 min in the freezer. Nothing for you to do then."
  );

  const safety = page.locator("section[aria-labelledby='safety-heading']");
  await expect(safety.getByRole("heading", { name: "Safety for little ones" })).toBeVisible();
  await expect(safety).toContainText("Check every label for allergens before you start.");
  // Contains comes from the reviewed allergens on the body (getAllergenDisplay), not the method's own list.
  await expect(safety.locator(".rm-contains")).toHaveText("Contains: Eggs");

  await expect(page.getByRole("heading", { name: "Method", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Method & Instructions" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Allergen Information" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Storage & Preparation Notes" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tips and storage" })).toBeVisible();
  await expect(page.getByText("You’ll need")).toBeVisible();

  await expect(steps(page)).toHaveCount(4);
  await expect(steps(page).nth(1).locator(".rm-line.ready")).toHaveText("Ready whenThe coat feels dry to the touch.");
  await expect(page.getByText("While it freezes · 2 hours")).toBeVisible();

  // Tap a step to mark where you are.
  await steps(page).nth(2).click();
  await expect(steps(page).nth(2)).toHaveAttribute("aria-current", "step");
  await steps(page).nth(0).focus();
  await page.keyboard.press("Enter");
  await expect(steps(page).nth(0)).toHaveAttribute("aria-current", "step");
  await expect(steps(page).nth(2)).not.toHaveAttribute("aria-current", "step");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("the age switch changes the toddler job and is remembered on this device", async ({ page }) => {
  await page.goto(`/recipes/${OPEN}`);
  const ages = page.getByRole("group", { name: "Your child’s age" });
  const wrapStep = steps(page).nth(2);
  await expect(ages.getByRole("button", { name: "2 years" })).toHaveAttribute("aria-pressed", "true");
  await expect(wrapStep.locator(".rm-line.toddler")).toHaveText("Toddler jobPlace the eyes.");

  await ages.getByRole("button", { name: "3–4 years" }).click();
  await expect(wrapStep.locator(".rm-line.toddler")).toHaveText(
    "Toddler jobDraw the stripes with you, then place the eyes."
  );
  await expect(wrapStep.locator(".rm-line.say")).toContainText("Then count the eyes up to 12.");

  await ages.getByRole("button", { name: "1 year" }).click();
  // No toddler job for 1-year-olds on this step; the safety box and the serving line change too.
  await expect(wrapStep.locator(".rm-line.toddler")).toHaveCount(0);
  await expect(page.locator("section[aria-labelledby='safety-heading']")).toContainText(
    "For age 1, serve thin slices on a plate, without the stick."
  );
  await expect(steps(page).nth(3).locator(".rm-line.safe")).toHaveText(
    "SafetySlice it thin and serve it on a plate."
  );
  await expect(steps(page).nth(3).locator(".rm-wait")).toContainText("Hide and seek");

  await page.reload();
  await expect(page.getByRole("group", { name: "Your child’s age" }).getByRole("button", { name: "1 year" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("a ticked ingredient is struck through", async ({ page }) => {
  await page.goto(`/recipes/${OPEN}`);
  const pears = page.getByRole("checkbox", { name: "3 pears" });
  await expect(pears).not.toBeChecked();
  await pears.check();
  await expect(pears).toBeChecked();
  const label = page.locator(".rm-ing", { has: pears }).locator("input + span");
  await expect(label).toHaveCSS("text-decoration-line", "line-through");
});

test("a step photo opens on a solid viewer and closes with Close and with Esc", async ({ page }) => {
  await page.goto(`/recipes/${OPEN}`);
  const caption = example.sections[0].steps[1].photo.caption as string;
  const shot = page.getByRole("button", { name: /How it should look/ }).first();
  await expect(shot.locator("img")).toHaveAttribute("src", `${PHOTOS}/synthetic-snack-pops-step-coated-192.webp`);
  // The full-size photo is not fetched until the viewer opens.
  await expect(page.locator("img[src*='-720.webp']")).toHaveCount(0);

  await shot.click();
  const viewer = page.getByRole("dialog", { name: "Step photo" });
  await expect(viewer).toBeVisible();
  await expect(viewer).toHaveAttribute("aria-modal", "true");
  await expect(viewer.locator("img")).toHaveAttribute("src", `${PHOTOS}/synthetic-snack-pops-step-coated-720.webp`);
  // Solid: an opaque background over the whole screen, and the page under it does not scroll.
  await expect(viewer).toHaveCSS("background-color", "rgb(24, 23, 29)");
  const covers = await viewer.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top <= 0 && r.left <= 0 && r.right >= window.innerWidth && r.bottom >= window.innerHeight;
  });
  expect(covers).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe("hidden");
  // The caption is the only text besides Close: no prompts, descriptions or file names.
  expect((await viewer.innerText()).replace(/\s+/g, " ").trim()).toBe(`Close ${caption}`);
  await expect(viewer.getByRole("button", { name: "Close" })).toBeFocused();

  await viewer.getByRole("button", { name: "Close" }).click();
  await expect(viewer).toHaveCount(0);
  await expect(shot).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe("hidden");

  await shot.click();
  await expect(viewer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
  await expect(shot).toBeFocused();
});

test("we made it, structured data and print", async ({ page }) => {
  await page.goto(`/recipes/${OPEN}`);
  const made = page.getByRole("button", { name: "We made it!" });
  await made.click();
  await expect(page.getByRole("button", { name: "You made it!" })).toBeVisible();
  await expect(page.getByText("Share a photo of your Snack Pops and tag @tinysoho on Instagram.")).toBeVisible();

  const ld = JSON.parse((await page.locator("script[type='application/ld+json']").first().textContent()) ?? "{}");
  expect(ld.prepTime).toBe("PT15M");
  expect(ld.totalTime).toBe("PT165M");
  expect(ld.recipeInstructions[1]).toEqual({ "@type": "HowToStep", name: "Coat the fruit", text: example.sections[0].steps[1].text });

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("group", { name: "Your child’s age" })).toBeHidden();
  await expect(page.getByRole("button", { name: /How it should look/ }).first()).toBeHidden();
  await expect(page.getByRole("button", { name: "You made it!" })).toBeHidden();
  await expect(page.getByText("Tap a step to mark where you are.")).toBeHidden();
  await expect(page.getByRole("checkbox", { name: "3 pears" })).toBeHidden();
  await expect(steps(page).nth(2).locator(".rm-line.toddler")).toBeVisible();
});

test("a recipe without method content keeps today's layout", async ({ page }) => {
  await page.goto(`/recipes/${CLASSIC}`);
  await expect(page.getByRole("heading", { name: "Method & Instructions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Allergen Information" })).toBeVisible();
  await expect(page.getByText("Total Time", { exact: true })).toBeVisible();
  await expect(page.getByText("Hands-on", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Your child’s age" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Safety for little ones" })).toHaveCount(0);
});

test("a locked recipe still shows the buy card and never the method", async ({ page }) => {
  const response = await page.goto(`/recipes/${LOCKED}`);
  expect(response?.status()).toBe(200);
  await expect(page.locator(".recipe-lock-card").getByRole("heading", { level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ingredients" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Safety for little ones" })).toHaveCount(0);
  await expect(page.getByText("Hands-on", { exact: true })).toHaveCount(0);
  const html = await page.content();
  // Nothing of the method reaches the page: no step text, no waiting activity, no step photo.
  expect(html).not.toContain(example.sections[0].steps[1].text);
  expect(html).not.toContain("Hide and seek");
  expect(html).not.toContain("synthetic-snack-pops-step");
});
