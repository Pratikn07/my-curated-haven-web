import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { otpRequestErrorMessage } from "../../src/lib/auth/otp-errors";
import { EMAIL_OTP_LENGTH } from "../../src/lib/auth/otp";

// Audit M11-01: parents saw Supabase's raw "Email address not authorized".
test("sign-in email errors explain what to do", () => {
  expect(
    otpRequestErrorMessage({ code: "email_address_not_authorized", message: "Email address not authorized" })
  ).toContain("free recipes don't need an account");
  expect(otpRequestErrorMessage({ message: "Email address \"x@y.z\" not authorized" })).toContain(
    "can't send sign-in codes"
  );
  expect(
    otpRequestErrorMessage({ code: "over_email_send_rate_limit", message: "email rate limit exceeded" })
  ).toContain("too many sign-in emails");

  // The per-address wait is already clear, and tests rely on its wording.
  const wait = "For security purposes, you can only request this after 42 seconds.";
  expect(otpRequestErrorMessage({ code: "over_request_rate_limit", message: wait })).toBe(wait);
});

// The sign-in form once hard-coded maxLength={6} while Supabase's
// `mailer_otp_length` was raised to 10, so every emailed code was truncated
// and no parent could sign in. The length now lives in one constant.
test("the code field length is not hard-coded away from Supabase's setting", () => {
  // Supabase allows 6-10 digits; anything else cannot be configured there.
  expect(EMAIL_OTP_LENGTH).toBeGreaterThanOrEqual(6);
  expect(EMAIL_OTP_LENGTH).toBeLessThanOrEqual(10);

  const form = readFileSync(
    join(__dirname, "../../src/components/auth/SignInForm.tsx"),
    "utf8"
  );
  expect(form).toContain("maxLength={EMAIL_OTP_LENGTH}");
  expect(form).not.toMatch(/maxLength=\{\d+\}/);
  expect(form).not.toMatch(/code\.length < \d+/);
  expect(form).not.toMatch(/\d+-digit code/);

  // The OTP specs must follow the constant too: a literal here passed CI on a
  // 6-digit project and then failed the moment production moved to 10.
  for (const spec of ["saved-recipes.spec.ts", "commerce.spec.ts"]) {
    const source = readFileSync(join(__dirname, spec), "utf8");
    expect(source, spec).not.toMatch(/toHaveLength\(\d+\)/);
    expect(source, spec).not.toMatch(/\\d\{\d+\}/);
  }
});
