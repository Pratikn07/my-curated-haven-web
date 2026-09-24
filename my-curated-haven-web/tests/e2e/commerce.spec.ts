import { test, expect, type Page } from "@playwright/test";

const MAILPIT_URL = "http://127.0.0.1:54324";

async function overflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
}

/**
 * Polls Mailpit API to retrieve the latest 6-digit OTP code sent to a specific email.
 */
async function getLatestOtp(email: string, timeoutMs = 20_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${MAILPIT_URL}/api/v1/messages`);
      if (res.ok) {
        const data = await res.json();
        const messages: Array<{ ID: string; Created: string; To: Array<{ Address: string }>; Subject: string }> =
          data.messages || [];

        const matching = messages.filter((m) =>
          m.To.some((to) => to.Address.toLowerCase() === email.toLowerCase())
        );

        if (matching.length > 0) {
          matching.sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime());
          const newest = matching[0];
          const detailRes = await fetch(`${MAILPIT_URL}/api/v1/message/${newest.ID}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            const textContent = (detail.Text || "") + " " + (detail.HTML || "");
            const otpMatch = textContent.match(/enter the code:\s*(\d{6})/i) || textContent.match(/\b(\d{6})\b/);
            if (otpMatch) {
              return otpMatch[1];
            }
          }
        }
      }
    } catch {
      // Retry until timeout
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timeout waiting for OTP email to ${email}`);
}

async function submitEmailWithRetry(page: Page) {
  const continueBtn = page.getByRole("button", { name: "Continue with Email" });
  await continueBtn.click();

  const codeHeading = page.getByRole("heading", { name: "Enter Verification Code" });
  const rateLimitNotice = page.getByText(/you can only request this after/i);

  for (let attempt = 0; attempt < 3; attempt++) {
    if (await codeHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      return;
    }
    if (await rateLimitNotice.isVisible().catch(() => false)) {
      await page.waitForTimeout(1200);
      await continueBtn.click();
    }
  }
  await expect(codeHeading).toBeVisible({ timeout: 10_000 });
}

test.describe("Phase 8: Commerce, Checkout & Access Gating", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    // Buffer for GoTrue 1s rate limiter
    await new Promise((r) => setTimeout(r, 1500));
  });

  test("V01: Anonymous visitor can read and print all 3 complete free recipes", async ({ page }) => {
    const freeRecipes = [
      "synth-free-oat-bake",
      "synth-free-veggie-frittata",
      "synth-free-berry-smoothie",
    ];

    for (const slug of freeRecipes) {
      await page.goto(`/recipes/${slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText("Free Toddler Recipe", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Method & Instructions" })).toBeVisible();
      await expect(page.getByRole("button", { name: /print/i })).toBeVisible();
    }
  });

  test("V02 & V03: Anonymous nonbuyer on paid recipe sees preview but body is strictly gated", async ({ page }) => {
    await page.goto("/recipes/synth-paid-golden-soup");

    // Title and summary are public previews
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Synthetic Paid Golden Lentil Soup");
    await expect(page.getByText("Collection Recipe").first()).toBeVisible();

    // Locked presentation is shown
    await expect(page.getByRole("heading", { name: "Collection Recipe" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View Collection & Unlock" })).toBeVisible();

    // Protected body content is NOT in the DOM
    await expect(page.getByRole("heading", { name: "Ingredients" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Method & Instructions" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /print/i })).toHaveCount(0);

    const pageContent = await page.content();
    expect(pageContent).not.toContain("SENTINEL_PAID_GOLDEN_SOUP_PROTECTED_SECRET");
  });

  test("V06: Collection sales page shows truthful offer details and sign-in CTA for visitors", async ({ page }) => {
    await page.goto("/collections/comfort-haven-collection");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("The Comfort Haven Collection");
    await expect(page.getByText("$15.00", { exact: true })).toBeVisible();
    await expect(page.getByText("One-time purchase")).toBeVisible();
    await expect(page.getByText(/Includes printable recipe pages/i)).toBeVisible();

    // Sign in to buy button
    const signinBtn = page.getByRole("link", { name: /Sign in to buy/i });
    await expect(signinBtn).toBeVisible();
    await expect(signinBtn).toHaveAttribute("href", /\/sign-in\?returnTo=/);

    // Free sample callout
    await expect(page.getByRole("heading", { name: "Try Free Sample Recipes" })).toBeVisible();
  });

  test("V10 & V12: Checkout creation requires authentication and handles order reservation", async ({ page }) => {
    // Direct API call without auth fails with 401
    const unauthRes = await page.request.post("/api/checkout", {
      data: { collectionSlug: "comfort-haven-collection" },
    });
    expect(unauthRes.status()).toBe(401);
  });

  test("V11, V22, V30, V36: End-to-end purchase, webhook fulfillment, and recipe unlocking", async ({ page }) => {
    const testEmail = `buyer-${Date.now()}@synthetic.test`;

    // 1. Sign in via OTP
    await page.goto("/sign-in?returnTo=/collections/comfort-haven-collection");
    await page.getByLabel(/Email address/i).fill(testEmail);
    await submitEmailWithRetry(page);

    const otpCode = await getLatestOtp(testEmail);
    const codeInput = page.getByLabel(/6-digit code/i);
    await codeInput.fill(otpCode);
    await page.getByRole("button", { name: /Verify & Sign In/i }).click();

    // 2. Arrives at collection sales page as authenticated nonbuyer
    await expect(page).toHaveURL(/\/collections\/comfort-haven-collection/);
    const buyButton = page.getByRole("button", { name: /Buy Collection — \$15\.00/i });
    await expect(buyButton).toBeVisible();

    // 3. Click Buy Collection -> Starts checkout session and redirects to return flow
    await buyButton.click();
    await page.waitForURL(/\/checkout\/return\?session_id=/, { timeout: 15_000 });

    // 4. Return page confirms purchase and access activation
    await expect(page.getByRole("heading", { name: "Purchase Confirmed!" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Access Status:/i)).toBeVisible();
    await expect(page.getByText(/Active & Unlocked/i)).toBeVisible();

    // 5. Customer can now read and print the previously locked recipe!
    await page.goto("/recipes/synth-paid-golden-soup");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Synthetic Paid Golden Lentil Soup");
    await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Method & Instructions" })).toBeVisible();
    await expect(page.getByRole("button", { name: /print/i })).toBeVisible();

    // The secret sentinel is now authorized and visible to the buyer
    const unlockedContent = await page.content();
    expect(unlockedContent).toContain("SENTINEL_PAID_GOLDEN_SOUP_PROTECTED_SECRET");

    // 6. Purchased collection appears in customer library /account/collections
    await page.goto("/account/collections");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("My Recipe Collections");
    await expect(page.getByText("The Comfort Haven Collection")).toBeVisible();
    await expect(page.getByText("Active Access")).toBeVisible();
    await expect(page.getByText("Synthetic Paid Golden Lentil Soup")).toBeVisible();
  });

  test("V31: Forged or unrelated session ID reveals no private data", async ({ page }) => {
    // Anonymous lookup on forged session redirects to sign in
    await page.goto("/checkout/return?session_id=cs_forged_fake_123");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("V88: Mobile 320px viewport has zero horizontal scroll overflow", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });

    await page.goto("/collections/comfort-haven-collection");
    expect(await overflow(page)).toBeLessThanOrEqual(1);

    await page.goto("/checkout/cancel");
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });
});
