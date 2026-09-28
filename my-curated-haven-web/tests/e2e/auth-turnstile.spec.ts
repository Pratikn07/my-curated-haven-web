import { expect, test } from "@playwright/test";
import { getTurnstileSiteKey, isTurnstileEnabled, TURNSTILE_SCRIPT_URL } from "../../src/lib/auth/turnstile";
import { otpRequestErrorMessage } from "../../src/lib/auth/otp-errors";

function withSiteKey<T>(value: string | undefined, run: () => T): T {
  const previous = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  try {
    if (value === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = value;
    return run();
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = previous;
  }
}

test("the challenge stays off until a site key is configured", () => {
  // Local, CI and preview builds have no key, and the form must still work.
  withSiteKey(undefined, () => {
    expect(isTurnstileEnabled()).toBe(false);
    expect(getTurnstileSiteKey()).toBeNull();
  });
  // A blank or whitespace value is the same as unset, not a broken widget.
  for (const blank of ["", "   "]) {
    withSiteKey(blank, () => {
      expect(isTurnstileEnabled(), JSON.stringify(blank)).toBe(false);
    });
  }
  withSiteKey("0x4AAAAAAA_example", () => {
    expect(isTurnstileEnabled()).toBe(true);
    expect(getTurnstileSiteKey()).toBe("0x4AAAAAAA_example");
  });
});

test("the widget is rendered explicitly, so it can be reset per request", () => {
  // Tokens are single-use; without render=explicit there is no handle to reset.
  expect(TURNSTILE_SCRIPT_URL).toContain("render=explicit");
  expect(TURNSTILE_SCRIPT_URL.startsWith("https://challenges.cloudflare.com/")).toBe(true);
});

test("a rejected challenge explains itself and points at Google", () => {
  expect(
    otpRequestErrorMessage({ code: "captcha_failed", message: "captcha protection: request disallowed" })
  ).toContain("Continue with Google");
  expect(
    otpRequestErrorMessage({ message: "captcha verification process failed" })
  ).toContain("verification check");

  // Unrelated errors still pass through untouched.
  const wait = "For security purposes, you can only request this after 42 seconds.";
  expect(otpRequestErrorMessage({ code: "over_request_rate_limit", message: wait })).toBe(wait);
});
