import { expect, test } from "@playwright/test";

test("analytics stays off until accepted, then one page view is recorded", async ({ page }) => {
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

test("unknown campaign query is not stored after consent", async ({ page }) => {
  await page.goto(
    "/recipes?utm_source=instagram&utm_medium=organic_social&utm_campaign=not_registered&utm_content=reel_001"
  );
  await page.getByRole("button", { name: "Accept Analytics" }).click();
  const stored = await page.evaluate(() => sessionStorage.getItem("mch_campaign_attribution"));
  expect(stored).toBeNull();
});
