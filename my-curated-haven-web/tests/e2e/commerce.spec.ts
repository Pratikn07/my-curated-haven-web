import { test, expect, type Page } from "@playwright/test";
import { EMAIL_OTP_LENGTH } from "../../src/lib/auth/otp";

// The local Supabase mail inbox; set MAILPIT_URL when the test stack runs on other ports.
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

async function overflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
}

/**
 * Polls Mailpit API to retrieve the latest sign-in code sent to a specific email.
 * The code length follows Supabase's `mailer_otp_length` via EMAIL_OTP_LENGTH.
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
            const digits = `\\d{${EMAIL_OTP_LENGTH}}`;
            const otpMatch =
              textContent.match(new RegExp(`enter the code:\\s*(${digits})`, "i")) ||
              textContent.match(new RegExp(`\\b(${digits})\\b`));
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
      await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Method & Instructions" })).toBeVisible();
      await expect(page.getByRole("button", { name: /print/i })).toBeVisible();
    }
  });

  test("V02 & V03: Anonymous nonbuyer on paid recipe sees preview but body is strictly gated", async ({ page }) => {
    await page.goto("/recipes/synth-paid-golden-soup");

    // Title and summary are public previews
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Synthetic Paid Golden Lentil Soup");

    // Locked presentation is shown. This recipe is in no configured book here, so it is not on sale and
    // points to the free recipes; saving needs access, so there is no save button.
    await expect(page.getByRole("heading", { name: "Not on sale yet" })).toBeVisible();
    await expect(page.getByText("This recipe will be part of one of our recipe books.", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse the free recipes" })).toHaveAttribute("href", "/recipes");
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute(
      "href",
      "/sign-in?returnTo=/recipes/synth-paid-golden-soup"
    );
    // The fog teaser is decoration over no recipe content: hidden from assistive tech, no section headings.
    await expect(page.locator(".recipe-fog")).toHaveAttribute("aria-hidden", "true");
    const recipeHeader = page.locator("header", { has: page.getByRole("heading", { level: 1 }) });
    await expect(recipeHeader.getByRole("button", { name: /save/i })).toHaveCount(0);

    // Protected body content is NOT in the DOM
    await expect(page.getByRole("heading", { name: "Ingredients" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Method & Instructions" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /print/i })).toHaveCount(0);

    const pageContent = await page.content();
    expect(pageContent).not.toContain("SENTINEL_PAID_GOLDEN_SOUP_PROTECTED_SECRET");
  });

  test("V06: Collection sales page shows truthful offer details and a pay-first Buy button for visitors", async ({ page }) => {
    await page.goto("/collections/comfort-haven-collection");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("The Comfort Haven Collection");
    await expect(page.getByText("$15.00", { exact: true })).toBeVisible();
    await expect(page.getByText("One-time purchase")).toBeVisible();
    await expect(page.getByText(/Includes printable recipe pages/i)).toBeVisible();

    // Pay first: visitors buy without an account; owners can still sign in.
    await expect(page.getByRole("button", { name: /Buy now — \$15\.00/i })).toBeVisible();
    const payFirstNote = page.locator("p", { hasText: "No account needed to pay" });
    await expect(payFirstNote).toBeVisible();
    await expect(payFirstNote.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", /\/sign-in\?returnTo=/);

    // Free samples are this book's own free recipes; this one has none, so the hint points to the recipe list.
    await expect(page.getByRole("heading", { name: "Try Free Sample Recipes" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Cook a free recipe first" })).toHaveAttribute("href", "/recipes");
  });

  test("V10 & V12: A signed-out checkout without the page's expectation is refused, never charged", async ({ page }) => {
    // Pay first allows guests, but only for exactly what the page showed for sale.
    const unauthRes = await page.request.post("/api/checkout", {
      data: { collectionSlug: "comfort-haven-collection" },
    });
    expect(unauthRes.status()).toBe(409);
    expect((await unauthRes.json()).code).toBe("refresh_required");
  });

  test("V07: Pay first, account after: a visitor buys, confirms their email and opens the collection", async ({ page, browser }) => {
    const buyerEmail = `guest-${Date.now()}@synthetic.test`;

    // 1. Buy without an account (local mock checkout stands in for Stripe).
    await page.goto("/collections/comfort-haven-collection");
    await page.getByRole("button", { name: /Buy now — \$15\.00/i }).click();
    await expect(page).toHaveURL(/\/checkout\/return\?session_id=cs_test_mock_/);
    const returnUrl = page.url();

    // 2. Stripe would collect the email; the mock form stands in for it.
    await page.locator("#mock-email").fill(buyerEmail);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // 3. Paid, but nothing unlocked yet: the code goes to the email that paid.
    await expect(page.getByRole("heading", { name: "One last step" })).toBeVisible();
    await expect(page.getByText(/g•••\d@synthetic\.test/)).toBeVisible();
    await page.getByRole("button", { name: "Send my code" }).click();
    const code = await getLatestOtp(buyerEmail);
    await page.getByLabel(/digit code sent to/i).fill(code);
    await page.getByRole("button", { name: "Unlock my recipes" }).click();

    // 4. Signed in as that email, the purchase is theirs.
    await expect(page.getByRole("heading", { name: "You're in." })).toBeVisible();
    await expect(page.getByText(buyerEmail).first()).toBeVisible();
    await page.goto("/account/collections");
    await expect(page.getByText("The Comfort Haven Collection")).toBeVisible();
    await expect(page.getByText("Yours to keep")).toBeVisible();

    // 5. Someone else holding the same return link cannot take it.
    const stranger = await browser.newContext();
    const strangerPage = await stranger.newPage();
    await strangerPage.goto(returnUrl);
    await expect(strangerPage.getByRole("heading", { name: "Your recipes are in your account" })).toBeVisible();
    await expect(strangerPage.getByRole("button", { name: "Send my code" })).toHaveCount(0);
    await stranger.close();
  });

  test("[QA-J19:partial] [QA-J20:partial] V11, V12, V30: rejects client price overrides; concurrent checkout reuses one session and webhook fulfills without a return", async ({ page }) => {
    const testEmail = `buyer-${Date.now()}@synthetic.test`;

    // 1. Sign in via OTP
    await page.goto("/sign-in?returnTo=/collections/comfort-haven-collection");
    await page.getByLabel(/Email address/i).fill(testEmail);
    await submitEmailWithRetry(page);

    const otpCode = await getLatestOtp(testEmail);
    const codeInput = page.getByLabel(/\d+-digit code/i);
    await codeInput.fill(otpCode);
    await page.getByRole("button", { name: /Verify & Sign In/i }).click();

    // 2. Arrives at collection sales page as authenticated nonbuyer
    await expect(page).toHaveURL(/\/collections\/comfort-haven-collection/);
    const buyButton = page.getByRole("button", { name: /Buy Collection — \$15\.00/i });
    await expect(buyButton).toBeVisible();

    const tamperedCheckout = await page.request.post("/api/checkout", {
      data: {
        collectionSlug: "comfort-haven-collection",
        userId: "00000000-0000-0000-0000-000000000001",
        amount: 1,
        currency: "eur",
      },
    });
    expect(tamperedCheckout.status()).toBe(400);
    expect(await tamperedCheckout.json()).toMatchObject({ error: "Unknown checkout field." });

    // A request without the page's sale expectation must refresh instead of charging.
    const missingExpectation = await page.request.post("/api/checkout", {
      data: { collectionSlug: "comfort-haven-collection" },
    });
    expect(missingExpectation.status()).toBe(409);
    expect(await missingExpectation.json()).toMatchObject({ code: "refresh_required" });

    // Two simultaneous requests must reserve one order and reuse one Checkout URL.
    const expected = JSON.parse((await buyButton.getAttribute("data-checkout-expected")) ?? "null");
    expect(expected).toMatchObject({ offerId: expect.any(String), sourceDigest: expect.any(String) });
    const checkoutReplies = await page.evaluate(async (expectation) => {
      const createAttempt = async () => {
        const response = await fetch("/api/checkout", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ collectionSlug: "comfort-haven-collection", expected: expectation }),
        });
        return { status: response.status, body: await response.json() };
      };
      return Promise.all([createAttempt(), createAttempt()]);
    }, expected);

    expect(checkoutReplies.map((reply) => reply.status)).toEqual([200, 200]);
    expect(checkoutReplies[0].body.supportReference).toBe(checkoutReplies[1].body.supportReference);
    expect(checkoutReplies[0].body.checkoutUrl).toBe(checkoutReplies[1].body.checkoutUrl);

    const checkoutUrl = new URL(checkoutReplies[0].body.checkoutUrl, page.url());
    const sessionId = checkoutUrl.searchParams.get("session_id");
    expect(sessionId).toMatch(/^cs_test_mock_/);

    // A local Stripe fixture arrives while the browser is still on the collection page.
    const webhookResponse = await page.request.post("/api/stripe/webhook", {
      data: {
        id: `evt_test_checkout_${Date.now()}`,
        type: "checkout.session.completed",
        livemode: false,
        data: {
          object: {
            id: sessionId,
            payment_status: "paid",
            amount_total: 1500,
            currency: "usd",
            payment_intent: `pi_${sessionId}`,
          },
        },
      },
    });
    expect(webhookResponse.status()).toBe(200);
    await expect(page).toHaveURL(/\/collections\/comfort-haven-collection/);

    // The customer can read and print the paid recipe without visiting Checkout return.
    await page.goto("/recipes/synth-paid-golden-soup");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Synthetic Paid Golden Lentil Soup");
    await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Method & Instructions" })).toBeVisible();
    await expect(page.getByRole("button", { name: /print/i })).toBeVisible();

    // The secret sentinel is now authorized and visible to the buyer
    const unlockedContent = await page.content();
    expect(unlockedContent).toContain("SENTINEL_PAID_GOLDEN_SOUP_PROTECTED_SECRET");

    // Purchased collection appears in customer library /account/collections.
    await page.goto("/account/collections");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("My Library");
    await expect(page.getByText("The Comfort Haven Collection")).toBeVisible();
    await expect(page.getByText("Yours to keep")).toBeVisible();
    // The library shows the book, not its recipe list, and sends the buyer to the book's page.
    await expect(page.getByText("Synthetic Paid Golden Lentil Soup")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open Collection" })).toHaveAttribute("href", "/collections/comfort-haven-collection");
  });

  test("[QA-J22:partial] V31: Forged or unrelated session ID reveals no private data", async ({ page }) => {
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
