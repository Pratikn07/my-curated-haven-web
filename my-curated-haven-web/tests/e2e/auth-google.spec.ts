import { expect, test } from "@playwright/test";
import { oauthCallbackUrl, isOAuthProvider, AUTH_CALLBACK_PATH } from "../../src/lib/auth/oauth";
import { sanitizeReturnTo } from "../../src/lib/auth/redirects";
import { signInFailurePath } from "../../src/app/auth/callback/route";
import { validateAnalyticsEvent } from "../../src/lib/analytics/sanitize";

test("the provider round trip returns to this origin, carrying the destination", () => {
  expect(oauthCallbackUrl("https://mycuratedhaven.com", "/collections/comfort-haven-collection")).toBe(
    "https://mycuratedhaven.com/auth/callback?next=%2Fcollections%2Fcomfort-haven-collection"
  );
  // No destination is a valid start; the callback falls back to saved recipes.
  expect(oauthCallbackUrl("http://127.0.0.1:3000")).toBe(
    `http://127.0.0.1:3000${AUTH_CALLBACK_PATH}`
  );
});

test("Apple and other providers stay off the website (G7-01)", () => {
  expect(isOAuthProvider("google")).toBe(true);
  for (const provider of ["apple", "azure", "facebook", "github", "", null, undefined]) {
    expect(isOAuthProvider(provider), String(provider)).toBe(false);
  }
});

test("the callback can only send a parent to an approved local path", () => {
  // The callback sanitizes `next` before it ever reaches a Location header.
  expect(sanitizeReturnTo("/collections/comfort-haven-collection")).toBe(
    "/collections/comfort-haven-collection"
  );
  for (const hostile of [
    "https://evil.test/steal",
    "//evil.test",
    "/\\evil.test",
    "/auth/callback",
    "/sign-in",
  ]) {
    expect(sanitizeReturnTo(hostile), hostile).toBe("/account/saved-recipes");
  }
});

test("a cancelled or failed provider trip returns to sign-in with a reason", () => {
  expect(signInFailurePath("/recipes", "cancelled")).toBe(
    "/sign-in?returnTo=%2Frecipes&authError=cancelled"
  );
  expect(signInFailurePath("/account/saved-recipes", "failed")).toBe(
    "/sign-in?returnTo=%2Faccount%2Fsaved-recipes&authError=failed"
  );
});

test("the sign-in funnel records which method finished it", () => {
  for (const method of ["google", "email_code"]) {
    expect(
      validateAnalyticsEvent("sign_in_completed", { entry_point: "collection", method }).ok,
      method
    ).toBe(true);
  }

  // Method is required, bounded, and can never carry an address.
  expect(validateAnalyticsEvent("sign_in_completed", { entry_point: "collection" }).ok).toBe(false);
  expect(
    validateAnalyticsEvent("sign_in_completed", { entry_point: "collection", method: "apple" }).ok
  ).toBe(false);
  expect(
    validateAnalyticsEvent("sign_in_completed", {
      entry_point: "collection",
      method: "parent@example.com",
    }).ok
  ).toBe(false);
});
