import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";
import { EMAIL_OTP_LENGTH } from "../../src/lib/auth/otp";

// Tracking plan PR 1 (docs/implementation/tracking/PLAN.md): the funnel events that never fired before, and an
// order that remembers the visit behind it. Events are read from the in-memory recorder (no PostHog key in tests).

const BOOK = "comfort-haven-collection";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type RecordedEvent = { event_name: string; route_key?: string; properties: Record<string, unknown> };

function recordedEvents(page: Page): Promise<RecordedEvent[]> {
  return page.evaluate(() => {
    const provider = (
      window as unknown as { __mch_analytics_provider?: { getRecordedEvents?: () => RecordedEvent[] } }
    ).__mch_analytics_provider;
    return provider?.getRecordedEvents?.() ?? [];
  });
}

async function waitForEvent(page: Page, match: (event: RecordedEvent) => boolean): Promise<RecordedEvent> {
  let found: RecordedEvent | undefined;
  await expect
    .poll(async () => {
      found = (await recordedEvents(page)).find(match);
      return Boolean(found);
    })
    .toBe(true);
  return found as RecordedEvent;
}

function databaseUrl(): string {
  const raw = process.env.COMMERCE_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  const parsed = new URL(raw);
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error("Tracking tests refuse non-loopback databases.");
  }
  return raw;
}

/** The newest sign-in code sent to this address, from the local mail inbox. */
async function getLatestOtp(email: string, timeoutMs = 20_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${MAILPIT_URL}/api/v1/messages`);
      if (res.ok) {
        const data = await res.json();
        const messages: Array<{ ID: string; Created: string; To: Array<{ Address: string }> }> = data.messages || [];
        const matching = messages
          .filter((m) => m.To.some((to) => to.Address.toLowerCase() === email.toLowerCase()))
          .sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime());
        if (matching.length > 0) {
          const detail = await (await fetch(`${MAILPIT_URL}/api/v1/message/${matching[0].ID}`)).json();
          const text = `${detail.Text || ""} ${detail.HTML || ""}`;
          const code = text.match(new RegExp(`\\b(\\d{${EMAIL_OTP_LENGTH}})\\b`));
          if (code) return code[1];
        }
      }
    } catch {
      // Retry until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Timeout waiting for OTP email to ${email}`);
}

test("the Halloween page and the bookcase record page views under their own names", async ({ page }) => {
  await page.goto("/halloween");
  await waitForEvent(page, (event) => event.event_name === "page_view" && event.properties.route_key === "halloween");

  await page.goto("/collections");
  await waitForEvent(page, (event) => event.event_name === "page_view" && event.properties.route_key === "collections");
});

test("a collection page records collection_view, and Buy records checkout_clicked from the buy box", async ({ page }) => {
  // Start on an Instagram landing page, so the session has an entry story to hand to checkout.
  await page.goto("/halloween");
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("mch_entry_story"))).toBe("halloween");

  // Hold checkout on this page: answer the request ourselves instead of going to the mock checkout.
  let checkoutBody: Record<string, unknown> | null = null;
  await page.route("**/api/checkout", async (route) => {
    checkoutBody = route.request().postDataJSON();
    await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
  });

  await page.goto(`/collections/${BOOK}`);
  const view = await waitForEvent(page, (event) => event.event_name === "collection_view");
  expect(view.properties).toMatchObject({ collection_slug: BOOK, ownership_state: "unauthenticated" });
  expect(String(view.properties.collection_release_id)).toMatch(UUID);

  await page.getByRole("button", { name: /Buy now — \$15\.00/i }).click();
  const clicked = await waitForEvent(page, (event) => event.event_name === "checkout_clicked");
  expect(clicked.properties).toMatchObject({ collection_slug: BOOK, surface: "buy_box" });
  expect(String(clicked.properties.collection_release_id)).toMatch(UUID);
  expect(clicked.route_key).toBe("collection_detail");

  // Without a PostHog key there is no visitor id to pass; the button and landing page still go along.
  await expect.poll(() => checkoutBody).not.toBeNull();
  expect((checkoutBody as unknown as { analytics: unknown }).analytics).toEqual({ surface: "buy_box", entry_story: "halloween" });
});

test("the order remembers the campaign, the post, the Buy button, the landing page and the visit", async ({ page }) => {
  const visitor = "01990000-0000-7000-8000-00000000a001";
  const session = "01990000-0000-7000-8000-00000000a002";
  await page.goto(`/collections/${BOOK}`);
  const expected = JSON.parse(
    (await page.getByRole("button", { name: /Buy now — \$15\.00/i }).getAttribute("data-checkout-expected")) ?? "null"
  );

  const res = await page.request.post("/api/checkout", {
    data: {
      collectionSlug: BOOK,
      expected,
      analyticsConsent: true,
      attribution: { utm_source: "instagram", utm_medium: "organic_social", utm_campaign: "comment_dm", utm_content: "oct16_ghost" },
      analytics: { distinct_id: visitor, session_id: session, surface: "buy_box", entry_story: "halloween" },
    },
  });
  expect(res.status()).toBe(200);
  const { supportReference } = await res.json();

  const db = new Client({ connectionString: databaseUrl() });
  await db.connect();
  try {
    const { rows } = await db.query(
      `SELECT campaign_code, campaign_content, checkout_surface, entry_story,
              analytics_distinct_id::text AS visitor, analytics_session_id::text AS session
       FROM private.purchase_orders WHERE support_reference = $1`,
      [supportReference]
    );
    expect(rows).toEqual([
      {
        campaign_code: "comment_dm",
        campaign_content: "oct16_ghost",
        checkout_surface: "buy_box",
        entry_story: "halloween",
        visitor,
        session,
      },
    ]);
  } finally {
    await db.end();
  }
});

test("malformed visit details never stop a checkout", async ({ page }) => {
  await page.goto(`/collections/${BOOK}`);
  const expected = JSON.parse(
    (await page.getByRole("button", { name: /Buy now — \$15\.00/i }).getAttribute("data-checkout-expected")) ?? "null"
  );
  const res = await page.request.post("/api/checkout", {
    data: { collectionSlug: BOOK, expected, analytics: { distinct_id: "parent@example.com", surface: "sticky_bar" } },
  });
  expect(res.status()).toBe(200);
  expect((await res.json()).checkoutUrl).toBeTruthy();
});

test("a search reports the count of its own results, not the previous ones", async ({ page }) => {
  await page.goto("/recipes");
  await waitForEvent(page, (event) => event.event_name === "recipe_list_view");

  await page.getByPlaceholder(/Search recipes/i).fill("zzqx no such recipe");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const search = await waitForEvent(page, (event) => event.event_name === "recipe_search_submit");
  expect(search.properties).toEqual({ result_count_bucket: "0", zero_results: true });
});

test("an email-code sign-in records sign_in_completed on the page it lands on", async ({ page }) => {
  const email = `tracking-${Date.now()}@synthetic.test`;
  await page.goto("/sign-in?returnTo=/recipes");
  await page.getByLabel(/Email address/i).fill(email);
  await page.getByRole("button", { name: "Continue with Email" }).click();
  await expect(page.getByRole("heading", { name: "Enter Verification Code" })).toBeVisible({ timeout: 15_000 });

  await page.getByLabel(/\d+-digit code/i).fill(await getLatestOtp(email));
  await page.getByRole("button", { name: /Verify & Sign In/i }).click();
  await expect(page).toHaveURL(/\/recipes$/);

  const done = await waitForEvent(page, (event) => event.event_name === "sign_in_completed");
  expect(done.properties).toEqual({ entry_point: "recipe", method: "email_code" });
  // The marker is read once and cleared, so a reload doesn't count the sign-in again.
  expect(await page.evaluate(() => document.cookie)).not.toContain("mch_signin_method");
});
