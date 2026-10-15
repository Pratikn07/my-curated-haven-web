import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";
import { EMAIL_OTP_LENGTH } from "../../src/lib/auth/otp";

// Tracking plan PR 3 (docs/implementation/tracking/PLAN.md): funnel detail, sign-in, filters, FAQ, home samples
// and errors. One recorder test per new event. Events are read from the in-memory recorder (no PostHog key in
// tests). Fixtures are the local synthetic ones; no paid recipe text is used here.

const BOOK = "comfort-haven-collection";
const LOCKED_RECIPE = "synth-paid-golden-soup";
const FREE_RECIPE = "synth-free-oat-bake";
const STORY = "/stories/local-sample-breakfasts";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const KEPT_EVENTS_KEY = "pr3-kept-events";

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

async function eventsNamed(page: Page, name: string): Promise<RecordedEvent[]> {
  return (await recordedEvents(page)).filter((event) => event.event_name === name);
}

/**
 * The recorder lives in the page, so a reload empties it. This keeps a copy of every event in sessionStorage,
 * for the Buy answers that reload the page right after recording checkout_failed.
 */
async function keepEventsAcrossReloads(page: Page) {
  await page.addInitScript((key) => {
    type Provider = { send: (envelope: unknown) => Promise<void> };
    let provider: Provider | undefined;
    Object.defineProperty(window, "__mch_analytics_provider", {
      configurable: true,
      get: () => provider,
      set: (value: Provider) => {
        provider = value;
        const send = value.send.bind(value);
        value.send = (envelope: unknown) => {
          try {
            const kept = JSON.parse(sessionStorage.getItem(key) ?? "[]");
            kept.push(envelope);
            sessionStorage.setItem(key, JSON.stringify(kept));
          } catch {
            // The copy is only for the test; the event itself still goes to the recorder.
          }
          return send(envelope);
        };
      },
    });
  }, KEPT_EVENTS_KEY);
}

function keptEvents(page: Page): Promise<RecordedEvent[]> {
  return page.evaluate((key) => JSON.parse(sessionStorage.getItem(key) ?? "[]"), KEPT_EVENTS_KEY);
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

/** Signs in with an emailed code and lands on returnTo. */
async function signInWithEmail(page: Page, email: string, returnTo: string) {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel(/Email address/i).fill(email);
  await page.getByRole("button", { name: "Continue with Email" }).click();
  await expect(page.getByRole("heading", { name: "Enter Verification Code" })).toBeVisible({ timeout: 15_000 });
  await page.getByLabel(/\d+-digit code/i).fill(await getLatestOtp(email));
  await page.getByRole("button", { name: /Verify & Sign In/i }).click();
  await expect(page).toHaveURL(new RegExp(`${returnTo}$`));
}

test("a locked recipe records paywall_viewed once; a free recipe does not", async ({ page }) => {
  await page.goto(`/recipes/${LOCKED_RECIPE}`);
  await expect(page.getByRole("heading", { name: "Not on sale yet" })).toBeVisible();
  const paywall = await waitForEvent(page, (event) => event.event_name === "paywall_viewed");
  // This fixture recipe is in no configured book, so no book is named.
  expect(Object.keys(paywall.properties)).toEqual(["recipe_id"]);
  expect(String(paywall.properties.recipe_id)).toMatch(UUID);
  expect(paywall.route_key).toBe("recipe_detail");
  expect(await eventsNamed(page, "paywall_viewed")).toHaveLength(1);

  await page.goto(`/recipes/${FREE_RECIPE}`);
  await waitForEvent(page, (event) => event.event_name === "recipe_open");
  expect(await eventsNamed(page, "paywall_viewed")).toHaveLength(0);
});

test("Buy that fails without reloading records checkout_failed with a fixed reason", async ({ page }) => {
  const answers: Array<{ reason: string; answer: (route: import("@playwright/test").Route) => Promise<void>; message: RegExp }> = [
    {
      reason: "unavailable",
      answer: (route) =>
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Checkout is temporarily disabled for maintenance.", code: "CHECKOUT_DISABLED" }),
        }),
      message: /temporarily disabled/,
    },
    {
      reason: "server",
      answer: (route) => route.fulfill({ status: 500, contentType: "text/html", body: "<h1>Bad gateway</h1>" }),
      message: /couldn't start checkout/,
    },
    {
      reason: "server",
      answer: (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
      message: /couldn't start checkout/,
    },
    { reason: "network", answer: (route) => route.abort("failed"), message: /couldn't reach checkout/ },
  ];

  for (const { reason, answer, message } of answers) {
    await page.unrouteAll();
    await page.route("**/api/checkout", answer);
    await page.goto(`/collections/${BOOK}`);
    await page.getByRole("button", { name: /Buy now — \$15\.00/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: message })).toBeVisible();

    const failed = await waitForEvent(page, (event) => event.event_name === "checkout_failed");
    expect(failed.properties, reason).toEqual({ collection_slug: BOOK, surface: "buy_box", checkout_error: reason });
    expect(failed.route_key).toBe("collection_detail");
    expect(await eventsNamed(page, "checkout_failed")).toHaveLength(1);
  }
});

test("a 409 records checkout_failed before the page reloads", async ({ page }) => {
  await keepEventsAcrossReloads(page);
  for (const code of ["already_owned", "refresh_required"]) {
    await page.unrouteAll();
    await page.route("**/api/checkout", (route) =>
      route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ code, message: "x" }) })
    );
    await page.goto(`/collections/${BOOK}`);
    await page.evaluate((key) => sessionStorage.removeItem(key), KEPT_EVENTS_KEY);

    const reloaded = page.waitForEvent("load");
    await page.getByRole("button", { name: /Buy now — \$15\.00/i }).click();
    await reloaded;

    const failed = (await keptEvents(page)).filter((event) => event.event_name === "checkout_failed");
    expect(failed.map((event) => event.properties), code).toEqual([
      { collection_slug: BOOK, surface: "buy_box", checkout_error: code },
    ]);
  }
});

test("the cancel page records checkout_cancelled, naming the book only from a well-formed slug", async ({ page }) => {
  await page.goto(`/checkout/cancel?book=${BOOK}`);
  const named = await waitForEvent(page, (event) => event.event_name === "checkout_cancelled");
  expect(named.properties).toEqual({ collection_slug: BOOK });
  expect(named.route_key).toBe("checkout_cancel");

  for (const query of ["?book=Not%20A%20Book", "?book=parent%40example.com", ""]) {
    await page.goto(`/checkout/cancel${query}`);
    const plain = await waitForEvent(page, (event) => event.event_name === "checkout_cancelled");
    expect(plain.properties, query).toEqual({});
  }
});

test("a guest's purchase records purchase_claimed and purchase_confirmation_viewed with the order's reference", async ({ page }) => {
  const buyerEmail = `pr3-guest-${Date.now()}@synthetic.test`;

  await page.goto(`/collections/${BOOK}`);
  await page.getByRole("button", { name: /Buy now — \$15\.00/i }).click();
  await expect(page).toHaveURL(/\/checkout\/return\?session_id=cs_test_mock_/);
  const sessionId = new URL(page.url()).searchParams.get("session_id") ?? "";

  // The mock checkout stands in for Stripe, which would collect the email.
  await page.locator("#mock-email").fill(buyerEmail);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "One last step" })).toBeVisible();
  // Nothing is confirmed until the email is: no confirmation event yet.
  expect(await eventsNamed(page, "purchase_confirmation_viewed")).toHaveLength(0);

  await page.getByRole("button", { name: "Send my code" }).click();
  await page.getByLabel(/digit code sent to/i).fill(await getLatestOtp(buyerEmail));
  await page.getByRole("button", { name: "Unlock my recipes" }).click();
  await expect(page.getByRole("heading", { name: "You're in." })).toBeVisible();

  const claimed = await waitForEvent(page, (event) => event.event_name === "purchase_claimed");
  expect(claimed.properties).toEqual({ collection_slug: BOOK });
  expect(claimed.route_key).toBe("checkout_return");

  const viewed = await waitForEvent(page, (event) => event.event_name === "purchase_confirmation_viewed");
  expect(viewed.properties.collection_slug).toBe(BOOK);
  expect(String(viewed.properties.order_ref)).toMatch(UUID);

  // order_ref is the order's analytics reference: the same one the server's purchase_confirmed carries.
  const db = new Client({ connectionString: databaseUrl() });
  await db.connect();
  try {
    const { rows } = await db.query(
      "SELECT analytics_attempt_ref::text AS ref FROM private.purchase_orders WHERE session_id = $1",
      [sessionId]
    );
    expect(rows).toEqual([{ ref: viewed.properties.order_ref }]);
  } finally {
    await db.end();
  }

  // Nothing personal or payment-related travels with the events.
  const all = JSON.stringify(await recordedEvents(page));
  expect(all).not.toContain(buyerEmail);
  expect(all).not.toContain(sessionId);
});

test("an email sign-in records the method, the code sent and a refused code, never the address", async ({ page }) => {
  const email = `pr3-signin-${Date.now()}@synthetic.test`;
  await page.goto("/sign-in?returnTo=/recipes");
  await page.getByLabel(/Email address/i).fill(email);
  await page.getByRole("button", { name: "Continue with Email" }).click();
  await expect(page.getByRole("heading", { name: "Enter Verification Code" })).toBeVisible({ timeout: 15_000 });

  const chosen = await waitForEvent(page, (event) => event.event_name === "sign_in_method_chosen");
  expect(chosen.properties).toEqual({ method: "email_code", entry_point: "recipe" });
  expect(chosen.route_key).toBe("sign_in");
  const sent = await waitForEvent(page, (event) => event.event_name === "sign_in_code_sent");
  expect(sent.properties).toEqual({ entry_point: "recipe" });

  // A wrong code, typed well within the code's ten minutes, is invalid rather than expired.
  const real = await getLatestOtp(email);
  const wrong = real === "0".repeat(EMAIL_OTP_LENGTH) ? "1".repeat(EMAIL_OTP_LENGTH) : "0".repeat(EMAIL_OTP_LENGTH);
  await page.getByLabel(/\d+-digit code/i).fill(wrong);
  await page.getByRole("button", { name: /Verify & Sign In/i }).click();
  await expect(page.getByRole("alert").filter({ hasText: "didn't work" })).toBeVisible();

  const failed = await waitForEvent(page, (event) => event.event_name === "sign_in_failed");
  expect(failed.properties).toEqual({ sign_in_step: "verify_code", sign_in_error: "invalid_code" });
  expect(JSON.stringify(await recordedEvents(page))).not.toContain(email);
});

test("a code that can't be sent records sign_in_failed at the send step", async ({ page }) => {
  await page.goto("/sign-in?returnTo=/collections");
  // Let the form submit an address the browser would normally stop, so the server refuses it.
  await page.locator("form").first().evaluate((form) => ((form as HTMLFormElement).noValidate = true));
  await page.getByLabel(/Email address/i).fill("not-an-address");
  await page.getByRole("button", { name: "Continue with Email" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "valid email address" })).toBeVisible();

  const chosen = await waitForEvent(page, (event) => event.event_name === "sign_in_method_chosen");
  expect(chosen.properties).toEqual({ method: "email_code", entry_point: "collection" });
  const failed = await waitForEvent(page, (event) => event.event_name === "sign_in_failed");
  expect(failed.properties).toEqual({ sign_in_step: "send_code", sign_in_error: "unknown" });
  expect(await eventsNamed(page, "sign_in_code_sent")).toHaveLength(0);
  expect(JSON.stringify(await recordedEvents(page))).not.toContain("not-an-address");
});

test("Google sign-in records the method chosen, and a cancelled or failed return records why", async ({ page }) => {
  // Stop the trip to Google: a 204 answer leaves the browser on the sign-in page with its recorder.
  await page.route("**/auth/v1/authorize**", (route) => route.fulfill({ status: 204, body: "" }));
  await page.goto(`/sign-in?returnTo=/collections/${BOOK}`);
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const chosen = await waitForEvent(page, (event) => event.event_name === "sign_in_method_chosen");
  expect(chosen.properties).toEqual({ method: "google", entry_point: "collection" });

  for (const [authError, reason] of [
    ["cancelled", "cancelled"],
    ["failed", "unknown"],
  ]) {
    await page.goto(`/sign-in?returnTo=%2Frecipes&authError=${authError}`);
    const failed = await waitForEvent(page, (event) => event.event_name === "sign_in_failed");
    expect(failed.properties, authError).toEqual({ sign_in_step: "google", sign_in_error: reason });
    expect(await eventsNamed(page, "sign_in_failed")).toHaveLength(1);
  }

  // Without a reason in the address, nothing failed.
  await page.goto("/sign-in?returnTo=%2Frecipes");
  await waitForEvent(page, (event) => event.event_name === "sign_in_started");
  expect(await eventsNamed(page, "sign_in_failed")).toHaveLength(0);
});

test("Apply Filters records one recipe_filter_value_applied per value, and the count event still follows the results", async ({ page }) => {
  await page.goto("/recipes");
  await waitForEvent(page, (event) => event.event_name === "recipe_list_view");

  await page.getByRole("button", { name: /^Filters/ }).click();
  const dialog = page.getByRole("dialog", { name: "Filter Recipes" });
  await dialog.getByLabel("Breakfast").check();
  await dialog.getByLabel("Dairy-Free").check();
  await dialog.getByRole("button", { name: "Under 30 min" }).click();
  await dialog.getByRole("button", { name: "Apply Filters" }).click();

  await expect.poll(async () => (await eventsNamed(page, "recipe_filter_value_applied")).length).toBe(3);
  const values = await eventsNamed(page, "recipe_filter_value_applied");
  expect(values.map((event) => event.properties)).toEqual([
    { filter_kind: "meal", filter_value: "breakfast" },
    { filter_kind: "diet", filter_value: "dairy-free" },
    { filter_kind: "time", filter_value: "under-30-min" },
  ]);
  expect(values.every((event) => event.route_key === "recipes")).toBe(true);

  const apply = await waitForEvent(page, (event) => event.event_name === "recipe_filter_apply");
  expect(apply.properties.active_filter_count).toBe(3);
});

test("opening a question records faq_opened with its key; closing it records nothing", async ({ page }) => {
  await page.goto(`/collections/${BOOK}`);
  const question = page.locator('details[data-track-faq="subscription"] summary');
  await question.click();
  const opened = await waitForEvent(page, (event) => event.event_name === "faq_opened");
  expect(opened.properties).toEqual({ primary_ux: "faq", question_key: "subscription" });
  expect(opened.route_key).toBe("collection_detail");

  await question.click();
  await expect(page.locator('details[data-track-faq="subscription"]')).not.toHaveAttribute("open", "");
  await page.locator('details[data-track-faq="allergens"] summary').click();
  await waitForEvent(page, (event) => event.event_name === "faq_opened" && event.properties.question_key === "allergens");
  expect(await eventsNamed(page, "faq_opened")).toHaveLength(2);

  await page.goto(STORY);
  await page.locator('details[data-track-faq="account"] summary').click();
  const story = await waitForEvent(page, (event) => event.event_name === "faq_opened");
  expect(story.properties).toEqual({ primary_ux: "faq", question_key: "account" });
  expect(story.route_key).toBe("story");
});

test("closing a room records room_closed, and the nursery and shelf samples record sample_interacted", async ({ page }) => {
  const rooms = page.getByRole("list", { name: "Rooms in the house" });
  await page.goto("/");

  await rooms.getByRole("link", { name: /^Library/ }).click();
  await expect(page.locator("#room-library")).toBeVisible();
  await page.getByRole("button", { name: "Back to the house" }).click();
  await expect(page.locator("#room-library")).toBeHidden();
  const closed = await waitForEvent(page, (event) => event.event_name === "room_closed");
  expect(closed.properties).toEqual({ feature_key: "library", seconds_bucket: "under_10s" });
  expect(closed.route_key).toBe("home");

  // Stepping straight into another room closes the one before it.
  await rooms.getByRole("link", { name: /^Kitchen/ }).click();
  const others = page.getByRole("navigation", { name: "Other rooms" });
  await others.getByRole("link", { name: /^Nursery/ }).click();
  await waitForEvent(page, (event) => event.event_name === "room_closed" && event.properties.feature_key === "kitchen");

  const nursery = page.locator("#room-nursery");
  await nursery.getByRole("button", { name: "Stamp a sample keepsake" }).click();
  await nursery.getByRole("button", { name: "Stamp another sample" }).click();
  await expect.poll(async () => (await eventsNamed(page, "sample_interacted")).length).toBe(2);
  expect((await eventsNamed(page, "sample_interacted")).map((event) => event.properties)).toEqual([
    { sample: "nursery_stamp", choice: "first-word" },
    { sample: "nursery_stamp", choice: "first-food" },
  ]);

  await others.getByRole("link", { name: /^Shelf/ }).click();
  await waitForEvent(page, (event) => event.event_name === "room_closed" && event.properties.feature_key === "nursery");
  const shelf = page.locator("#room-shelf");
  await shelf.getByRole("button", { name: "See why we'd pick it" }).click();
  await shelf.getByRole("button", { name: "Hide why we'd pick it" }).click();
  await waitForEvent(page, (event) => event.event_name === "sample_interacted" && event.properties.sample === "shelf_reveal");
  // Hiding the reasons again is not a reveal.
  expect((await eventsNamed(page, "sample_interacted")).filter((event) => event.properties.sample === "shelf_reveal")).toHaveLength(1);

  await page.keyboard.press("Escape");
  await waitForEvent(page, (event) => event.event_name === "room_closed" && event.properties.feature_key === "shelf");
  expect(await eventsNamed(page, "room_closed")).toHaveLength(4);
});

test("the storybook sample records the story and style picked, never the child's name", async ({ page }) => {
  await page.goto("/");
  const library = page.locator("#library");
  await library.getByLabel(/child.s name/i).fill("Maya Rose");
  await library.getByRole("button", { name: "Bye-bye dummy" }).click();
  await library.getByRole("button", { name: "Crayon" }).click();
  // The story already showing is not a new pick.
  await library.getByRole("button", { name: "Bye-bye dummy" }).click();

  await expect.poll(async () => (await eventsNamed(page, "sample_interacted")).length).toBe(2);
  expect((await eventsNamed(page, "sample_interacted")).map((event) => event.properties)).toEqual([
    { sample: "storybook_story", choice: "dummy" },
    { sample: "storybook_style", choice: "crayon" },
  ]);
  expect(JSON.stringify(await recordedEvents(page)).toLowerCase()).not.toContain("maya");
});

test("404 pages record not_found_viewed with the kind of address only", async ({ page }) => {
  for (const [path, routeClass] of [
    ["/recipes/no-such-recipe-pr3", "recipe"],
    ["/collections/no-such-book-pr3", "collection"],
    ["/stories/no-such-post-pr3", "story"],
    ["/no-such-page-pr3", "other"],
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    const viewed = await waitForEvent(page, (event) => event.event_name === "not_found_viewed");
    expect(viewed.properties, path).toEqual({ route_class: routeClass });
    expect(JSON.stringify(viewed)).not.toContain("no-such");
    expect(await eventsNamed(page, "not_found_viewed")).toHaveLength(1);
  }
});

test("no search results, an empty bookcase and a book not on sale record empty_state_viewed", async ({ page }) => {
  await page.goto("/recipes?q=zzqx-no-such-recipe");
  await expect(page.getByRole("heading", { name: "No matching recipes found" })).toBeVisible();
  const search = await waitForEvent(page, (event) => event.event_name === "empty_state_viewed");
  expect(search.properties).toEqual({ primary_ux: "empty_state" });
  expect(search.route_key).toBe("recipes");

  await page.goto("/collections?f=breakfast,snacks,freezes,iron,protein,egg-free,dairy-free,nut-free");
  await expect(page.getByRole("heading", { name: "0 collections match" })).toBeVisible();
  const bookcase = await waitForEvent(page, (event) => event.event_name === "empty_state_viewed");
  expect(bookcase.route_key).toBe("collections");

  await page.goto("/collections/meal-prep");
  await expect(page.getByText("Opening soon")).toBeVisible();
  const soon = await waitForEvent(page, (event) => event.event_name === "empty_state_viewed");
  expect(soon.route_key).toBe("collection_detail");

  // A book on sale and a list with results are not empty.
  await page.goto(`/collections/${BOOK}`);
  await waitForEvent(page, (event) => event.event_name === "collection_view");
  expect(await eventsNamed(page, "empty_state_viewed")).toHaveLength(0);
  await page.goto("/recipes");
  await waitForEvent(page, (event) => event.event_name === "recipe_list_view");
  expect(await eventsNamed(page, "empty_state_viewed")).toHaveLength(0);
});

test("a save that never reaches the server records save_failed", async ({ page }) => {
  await signInWithEmail(page, `pr3-save-${Date.now()}@synthetic.test`, `/recipes/${FREE_RECIPE}`);

  // Drop the save request on its way out, as a dropped phone connection would.
  await page.route(`**/recipes/${FREE_RECIPE}`, (route) =>
    route.request().method() === "POST" ? route.abort("failed") : route.continue()
  );
  await page.getByRole("button", { name: "Save recipe" }).first().click();

  const failed = await waitForEvent(page, (event) => event.event_name === "save_failed");
  expect(String(failed.properties.recipe_id)).toMatch(UUID);
  expect(Object.keys(failed.properties)).toEqual(["recipe_id"]);
  await expect(page.getByRole("alert").filter({ hasText: "couldn't update your saved recipes" })).toBeVisible();
  expect(await eventsNamed(page, "recipe_save_changed")).toHaveLength(0);
});
