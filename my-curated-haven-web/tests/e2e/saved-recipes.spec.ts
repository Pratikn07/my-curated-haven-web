import { test, expect, type Page } from "@playwright/test";
import { sanitizeReturnTo } from "../../src/lib/auth/redirects";

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

async function clearMailpit() {
  try {
    await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" });
  } catch {
    // Ignore if mailpit is unreachable
  }
}

test.describe("Phase 7: Return Path Sanitization Unit Checks", () => {
  test("allows valid local recipe and account paths", () => {
    expect(sanitizeReturnTo("/recipes")).toBe("/recipes");
    expect(sanitizeReturnTo("/recipes/synth-free-oat-bake")).toBe("/recipes/synth-free-oat-bake");
    expect(sanitizeReturnTo("/account")).toBe("/account");
    expect(sanitizeReturnTo("/account/saved-recipes")).toBe("/account/saved-recipes");
  });

  test("rejects open redirects, protocol-relative URLs, and loops", () => {
    const fallback = "/account/saved-recipes";
    expect(sanitizeReturnTo("https://evil.com")).toBe(fallback);
    expect(sanitizeReturnTo("//evil.com")).toBe(fallback);
    expect(sanitizeReturnTo("/\\evil.com")).toBe(fallback);
    expect(sanitizeReturnTo("javascript:alert(1)")).toBe(fallback);
    expect(sanitizeReturnTo("/sign-in")).toBe(fallback);
    expect(sanitizeReturnTo("/sign-in?returnTo=/recipes")).toBe(fallback);
    expect(sanitizeReturnTo("/auth/callback")).toBe(fallback);
    expect(sanitizeReturnTo("/recipes\nmalicious")).toBe(fallback);
    expect(sanitizeReturnTo(null)).toBe(fallback);
    expect(sanitizeReturnTo("")).toBe(fallback);
  });
});

test.describe("Phase 7: Unauthenticated Experience & Protection", () => {
  test("unauthenticated visitor to /account redirects to /sign-in", async ({ page }) => {
    const response = await page.goto("/account");
    expect(page.url()).toContain("/sign-in");
    expect(page.url()).toContain("returnTo=%2Faccount");
    expect(response?.status()).toBeLessThan(400);
  });

  test("unauthenticated visitor to /account/saved-recipes redirects to /sign-in", async ({ page }) => {
    await page.goto("/account/saved-recipes");
    expect(page.url()).toContain("/sign-in");
    expect(page.url()).toContain("returnTo=%2Faccount%2Fsaved-recipes");
  });

  test("/sign-in page meets disclosure and accessibility standards", async ({ page }) => {
    await page.goto("/sign-in");

    // Title and heading
    await expect(page.getByRole("heading", { name: "Sign In", level: 1 })).toBeVisible();

    // Disclosure and description
    await expect(
      page.getByText(/sign in to save recipes and access them across all your devices/i)
    ).toBeVisible();

    // Legal links visible and pointing to Terms and Privacy
    const termsLink = page.getByRole("link", { name: /terms of service/i });
    const privacyLink = page.getByRole("link", { name: /privacy policy/i });
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveAttribute("href", "/terms");
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveAttribute("href", "/privacy");

    // Email input has explicit label
    const emailInput = page.getByLabel(/email address/i);
    await expect(emailInput).toBeVisible();

    // Zero horizontal overflow at 320px
    await page.setViewportSize({ width: 320, height: 600 });
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test("clicking Save while unauthenticated redirects to /sign-in with returnTo", async ({ page }) => {
    await page.goto("/recipes");

    // Find first recipe card's save button
    const firstCard = page.locator("article").first();
    const saveButton = firstCard.getByRole("button", { name: /save recipe/i });
    await expect(saveButton).toBeVisible();

    await saveButton.click();
    await page.waitForURL(/\/sign-in\?returnTo=/);
    expect(page.url()).toMatch(/\/sign-in\?returnTo=%2Frecipes%2F[a-z0-9-]+/);
  });

  test("recipe detail page retains 100% anonymous reading and printing", async ({ page }) => {
    await page.goto("/recipes/synth-free-oat-bake");

    // Title and content are complete
    await expect(page.getByRole("heading", { name: "Synthetic Free Oat Bake", level: 1 })).toBeVisible();
    await expect(page.getByText("Free Toddler Recipe", { exact: true })).toBeVisible();
    await expect(page.getByText("rolled oats")).toBeVisible();
    await expect(page.getByRole("button", { name: /print/i })).toBeVisible();

    // Save button separate from title link
    const saveButton = page.locator(".recipe-print-root header").getByRole("button", { name: /save recipe/i });
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    await page.waitForURL(/\/sign-in\?returnTo=%2Frecipes%2Fsynth-free-oat-bake/);
  });
});

test.describe("Phase 7: Authenticated Account & Saved Recipes Workflow", () => {
  // Run serially on desktop to ensure stable single-user state against local DB & Mailpit
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.project.name !== "chromium-desktop") {
      test.skip();
    }
    await clearMailpit();
  });

  test("Buyer A can sign in via OTP code and view account overview", async ({ page }) => {
    await page.goto("/sign-in?returnTo=/account");

    const emailInput = page.getByLabel(/email address/i);
    await emailInput.fill("buyer-a@synthetic.test");
    await page.getByRole("button", { name: "Continue with Email" }).click();

    // Code step appears
    await expect(page.getByRole("heading", { name: "Enter Verification Code" })).toBeVisible();
    await expect(page.getByText("buyer-a@synthetic.test")).toBeVisible();

    // Retrieve OTP from Mailpit
    const otp = await getLatestOtp("buyer-a@synthetic.test");
    expect(otp).toHaveLength(6);

    // Enter code and submit
    const codeInput = page.getByLabel(/6-digit code/i);
    await codeInput.fill(otp);
    await page.getByRole("button", { name: "Verify & Sign In" }).click();

    // Navigated to /account
    await page.waitForURL(/\/account$/);
    await expect(page.getByRole("heading", { name: "Account Overview", level: 1 })).toBeVisible();

    // Verified email displayed
    await expect(page.getByText("buyer-a@synthetic.test").first()).toBeVisible();

    // Saved Recipes card link
    const savedLink = page.getByRole("link", { name: /Saved Recipes/i });
    await expect(savedLink).toBeVisible();
    await expect(savedLink).toHaveAttribute("href", "/account/saved-recipes");

    // Account closure support instructions
    await expect(page.getByText(/Account Closure & Data Deletion/i)).toBeVisible();
    await expect(page.getByText(/support@mycuratedhaven.com/i)).toBeVisible();

    // Responsive check at 320px
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test("Buyer A can view saved recipes, including unavailable item placeholder", async ({ page }) => {
    // 1. Sign in as Buyer A
    await page.goto("/sign-in?returnTo=/account/saved-recipes");
    await page.getByLabel(/email address/i).fill("buyer-a@synthetic.test");
    await page.getByRole("button", { name: "Continue with Email" }).click();
    await expect(page.getByRole("heading", { name: "Enter Verification Code" })).toBeVisible();

    const otp = await getLatestOtp("buyer-a@synthetic.test");
    await page.getByLabel(/6-digit code/i).fill(otp);
    await page.getByRole("button", { name: "Verify & Sign In" }).click();

    await page.waitForURL(/\/account\/saved-recipes$/);

    // Heading and count
    await expect(page.getByRole("heading", { name: "Saved Recipes", level: 1 })).toBeVisible();
    await expect(page.getByText("2 recipes saved")).toBeVisible();

    // 1. Available recipe is rendered with title and preview
    await expect(page.getByText("Synthetic Free Oat Bake")).toBeVisible();

    // 2. Unavailable recipe is rendered with neutral label and no leaked secrets
    await expect(page.getByText("Unavailable")).toBeVisible();
    await expect(page.getByText("Recipe no longer available")).toBeVisible();
    // Must NOT leak withdrawn title or body
    await expect(page.getByText("Synthetic Withdrawn Seed Bread")).not.toBeVisible();
    await expect(page.getByText("SENTINEL_WITHDRAWN_SECRET_BODY")).not.toBeVisible();

    // 320px overflow check
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test("Buyer A can bookmark a recipe on /recipes and see it updated", async ({ page }) => {
    // 1. Sign in as Buyer A
    await page.goto("/sign-in?returnTo=/recipes");
    await page.getByLabel(/email address/i).fill("buyer-a@synthetic.test");
    await page.getByRole("button", { name: "Continue with Email" }).click();
    await expect(page.getByRole("heading", { name: "Enter Verification Code" })).toBeVisible();

    const otp = await getLatestOtp("buyer-a@synthetic.test");
    await page.getByLabel(/6-digit code/i).fill(otp);
    await page.getByRole("button", { name: "Verify & Sign In" }).click();

    await page.waitForURL(/\/recipes$/);

    // Save Veggie Frittata
    const frittataArticle = page.locator("article").filter({ hasText: "Synthetic Free Veggie Frittata" });
    const saveBtn = frittataArticle.getByRole("button", { name: /save recipe/i });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toHaveAttribute("aria-pressed", "false");

    await saveBtn.click();

    // Should now show Saved with aria-pressed="true"
    await expect(frittataArticle.getByRole("button", { name: /saved/i })).toHaveAttribute("aria-pressed", "true");

    // Visit /account/saved-recipes: count should now be 3
    await page.goto("/account/saved-recipes");
    await expect(page.getByText("3 recipes saved")).toBeVisible();
    await expect(page.getByText("Synthetic Free Veggie Frittata")).toBeVisible();

    // Remove Veggie Frittata from saved page
    const frittataSavedCard = page.locator("article").filter({ hasText: "Synthetic Free Veggie Frittata" }).locator("..");
    const removeBtn = frittataSavedCard.getByRole("button", { name: /saved/i });
    await removeBtn.click();

    // Upon revalidation, Veggie Frittata is removed from the list and count returns to 2
    await expect(page.getByText("Synthetic Free Veggie Frittata")).not.toBeVisible();
    await expect(page.getByText("2 recipes saved")).toBeVisible();

    // Reload page: Veggie Frittata confirms persistence
    await page.reload();
    await expect(page.getByText("Synthetic Free Veggie Frittata")).not.toBeVisible();
    await expect(page.getByText("2 recipes saved")).toBeVisible();
  });

  test("Nonbuyer B sees isolated empty state and cannot see Buyer A's saved recipes", async ({ page }) => {
    // Sign in as Nonbuyer B
    await page.goto("/sign-in?returnTo=/account/saved-recipes");
    await page.getByLabel(/email address/i).fill("nonbuyer-b@synthetic.test");
    await page.getByRole("button", { name: "Continue with Email" }).click();
    await expect(page.getByRole("heading", { name: "Enter Verification Code" })).toBeVisible();

    const otp = await getLatestOtp("nonbuyer-b@synthetic.test");
    await page.getByLabel(/6-digit code/i).fill(otp);
    await page.getByRole("button", { name: "Verify & Sign In" }).click();

    await page.waitForURL(/\/account\/saved-recipes$/);

    // Empty state rendered
    await expect(page.getByText("0 recipes saved")).toBeVisible();
    await expect(page.getByRole("heading", { name: "No saved recipes yet" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse Free Recipes" })).toBeVisible();

    // Buyer A's saved items must NOT appear
    await expect(page.getByText("Synthetic Free Oat Bake")).not.toBeVisible();
    await expect(page.getByText("Unavailable")).not.toBeVisible();
  });

  test("Sign out clears session and prevents account access", async ({ page }) => {
    // 1. Sign in as Buyer A
    await page.goto("/sign-in?returnTo=/account");
    await page.getByLabel(/email address/i).fill("buyer-a@synthetic.test");
    await page.getByRole("button", { name: "Continue with Email" }).click();
    await expect(page.getByRole("heading", { name: "Enter Verification Code" })).toBeVisible();

    const otp = await getLatestOtp("buyer-a@synthetic.test");
    await page.getByLabel(/6-digit code/i).fill(otp);
    await page.getByRole("button", { name: "Verify & Sign In" }).click();

    await page.waitForURL(/\/account$/);

    // 2. Click Sign out
    const signOutBtn = page.getByRole("button", { name: "Sign out" });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // 3. Redirected to /recipes
    await page.waitForURL(/\/recipes$/);

    // Navbar shows Sign In
    await expect(page.locator("header").getByRole("link", { name: "Sign In" })).toBeVisible();

    // 4. Visiting /account now redirects back to /sign-in
    await page.goto("/account");
    await page.waitForURL(/\/sign-in\?returnTo=%2Faccount/);
  });
});
