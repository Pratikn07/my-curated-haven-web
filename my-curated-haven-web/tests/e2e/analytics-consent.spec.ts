import { expect, test } from "@playwright/test";

test("[QA-A01:partial] analytics stays off until accepted, then one page view is recorded", async ({ page }) => {
  const captures: string[] = [];
  await page.route("**/capture/**", async (route) => {
    captures.push(route.request().url());
    await route.abort();
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Accept Analytics" })).toBeVisible();

  const before = await page.evaluate(() => localStorage.getItem("mch_browser_id"));
  expect(before).toBeNull();

  await page.getByRole("button", { name: "Accept Analytics" }).click();
  await expect(page.getByRole("button", { name: "Accept Analytics" })).toBeHidden();

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const provider = (
          window as unknown as {
            __mch_analytics_provider?: { getRecordedEvents?: () => { event_name: string }[] };
          }
        ).__mch_analytics_provider;
        return provider?.getRecordedEvents?.().filter((event) => event.event_name === "page_view").length ?? 0;
      })
    )
    .toBe(1);

  expect(captures).toEqual([]);

  await page.getByRole("button", { name: "Cookie & Analytics Preferences" }).click();
  await page.getByRole("button", { name: "Withdraw Consent" }).click();

  const after = await page.evaluate(() => ({
    browser: localStorage.getItem("mch_browser_id"),
    consent: localStorage.getItem("mch_analytics_consent"),
  }));
  expect(after.browser).toBeNull();
  expect(after.consent).toContain("withdrawn");
  expect(captures).toEqual([]);
});

test("decline stores no browser id", async ({ page }) => {
  await page.goto("/privacy");
  await page.getByRole("button", { name: "Decline" }).click();
  await page.reload();
  const stored = await page.evaluate(() => ({
    browser: localStorage.getItem("mch_browser_id"),
    consent: localStorage.getItem("mch_analytics_consent"),
  }));
  expect(stored.browser).toBeNull();
  expect(stored.consent).toContain("declined");
  await expect(page.getByRole("button", { name: "Accept Analytics" })).toHaveCount(0);
});

test("[homepage-vision] declining analytics does not record preview clicks", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Decline" }).click();

  await page
    .locator("#explore-haven")
    .getByRole("link", { name: "Preview Parenting Chat" })
    .click();
  await expect(page).toHaveURL(/#parenting-chat-preview$/);

  const events = await page.evaluate(() => {
    const provider = (
      window as unknown as {
        __mch_analytics_provider?: { getRecordedEvents?: () => { event_name: string }[] };
      }
    ).__mch_analytics_provider;
    return provider?.getRecordedEvents?.() ?? [];
  });
  expect(events.some((event) => event.event_name.startsWith("homepage_"))).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem("mch_browser_id"))).toBeNull();
});

test("[homepage-vision] accepted preview click records only fixed analytics values", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Accept Analytics" }).click();

  await page
    .locator("#explore-haven")
    .getByRole("link", { name: "Preview Parenting Chat" })
    .click();
  await expect(page).toHaveURL(/#parenting-chat-preview$/);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const provider = (
          window as unknown as {
            __mch_analytics_provider?: {
              getRecordedEvents?: () => { event_name: string }[];
            };
          }
        ).__mch_analytics_provider;
        return (
          provider?.getRecordedEvents?.().filter((event) => event.event_name === "homepage_preview_opened")
            .length ?? 0
        );
      }),
    )
    .toBe(1);

  const event = await page.evaluate(() => {
    const provider = (
      window as unknown as {
        __mch_analytics_provider?: {
          getRecordedEvents?: () => {
            event_name: string;
            properties: Record<string, unknown>;
          }[];
        };
      }
    ).__mch_analytics_provider;
    return provider?.getRecordedEvents?.().find((item) => item.event_name === "homepage_preview_opened");
  });
  expect(event?.properties).toEqual({
    feature_key: "chat",
    placement: "overview",
    content_version: "hv-2026-09-24",
  });
});

test("[homepage-vision] preview visibility is consented and recorded once", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Accept Analytics" }).click();

  const preview = page.locator("#bloom-preview");
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const provider = (
          window as unknown as {
            __mch_analytics_provider?: {
              getRecordedEvents?: () => { event_name: string; properties: Record<string, unknown> }[];
            };
          }
        ).__mch_analytics_provider;
        return (
          provider?.getRecordedEvents?.().filter(
            (event) => event.event_name === "homepage_preview_viewed" && event.properties.feature_key === "bloom",
          ).length ?? 0
        );
      }),
    )
    .toBe(1);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await preview.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1100);
  const count = await page.evaluate(() => {
    const provider = (
      window as unknown as {
        __mch_analytics_provider?: {
          getRecordedEvents?: () => { event_name: string; properties: Record<string, unknown> }[];
        };
      }
    ).__mch_analytics_provider;
    return (
      provider?.getRecordedEvents?.().filter(
        (event) => event.event_name === "homepage_preview_viewed" && event.properties.feature_key === "bloom",
      ).length ?? 0
    );
  });
  expect(count).toBe(1);
});

test("[homepage-vision] analytics provider failure does not block preview navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Accept Analytics" }).click();
  await page.evaluate(() => {
    const provider = (
      window as unknown as {
        __mch_analytics_provider?: { send?: () => Promise<void> };
      }
    ).__mch_analytics_provider;
    if (provider) provider.send = async () => { throw new Error("offline"); };
  });

  await page.locator("#explore-haven").getByRole("link", { name: "Preview Parenting Chat" }).click();
  await expect(page).toHaveURL(/#parenting-chat-preview$/);
});

test("unknown campaign query is not stored after consent", async ({ page }) => {
  await page.goto(
    "/recipes?utm_source=instagram&utm_medium=organic_social&utm_campaign=not_registered&utm_content=reel_001"
  );
  await page.getByRole("button", { name: "Accept Analytics" }).click();
  const stored = await page.evaluate(() => sessionStorage.getItem("mch_campaign_attribution"));
  expect(stored).toBeNull();
});
