import { expect, test } from "@playwright/test";
import { otpRequestErrorMessage } from "../../src/lib/auth/otp-errors";

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
