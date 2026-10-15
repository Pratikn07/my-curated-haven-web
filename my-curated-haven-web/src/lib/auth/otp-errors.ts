/** Shown when sending a code fails for a reason we don't recognise; Supabase's own text is never shown. */
export const OTP_SEND_FAILED = "We couldn't send a code just now. Please try again in a minute.";

/**
 * Turns Supabase sign-in email errors into messages a parent can act on.
 * Unknown errors get a plain retry message.
 */
export function otpRequestErrorMessage(error: { code?: string; message: string }): string {
  const code = error.code ?? "";
  const message = error.message.toLowerCase();

  // Supabase's built-in sender only mails the project's team (audit M11-01).
  if (code === "email_address_not_authorized" || message.includes("not authorized")) {
    return "We can't send sign-in codes to new email addresses yet. The free recipes don't need an account, so you can keep reading and printing them.";
  }

  // Supabase also uses over_email_send_rate_limit for the per-address
  // cooldown. Preserve its wait message before applying the hourly fallback.
  if (
    (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") &&
    /only request this after \d+ seconds?/.test(message)
  ) {
    return error.message;
  }

  // Project-wide hourly email limit, not the per-address 60-second wait.
  if (code === "over_email_send_rate_limit" || message.includes("email rate limit exceeded")) {
    return "We've sent too many sign-in emails in the last hour. Please try again later. The free recipes don't need an account.";
  }

  // Turnstile rejected the token, or it was reused or had expired.
  if (code === "captcha_failed" || message.includes("captcha")) {
    // No Google suggestion: Google sign-in does not work inside Instagram's browser, where most parents arrive.
    return "That verification check didn't go through. Please wait a moment and try again.";
  }

  return OTP_SEND_FAILED;
}

/** A code that was wrong, expired or already used, in words a parent can act on. */
export function otpVerifyErrorMessage(): string {
  return "That code didn't work or has expired. Check it, or ask for a new code.";
}

// Tracking PR 3: why a sign-in step failed, in the fixed words sign_in_failed reports. Never the email, never
// Supabase's own text.

export type SignInFailure = "invalid_code" | "expired_code" | "rate_limited" | "bot_check" | "cancelled" | "unknown";

/** The emailed code's lifetime: Supabase's otp_expiry, 600 seconds here and in production. */
export const OTP_CODE_LIFETIME_MS = 10 * 60 * 1000;

function isRateLimited(code: string, message: string): boolean {
  return (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    message.includes("rate limit") ||
    /only request this after \d+ seconds?/.test(message)
  );
}

/** Why sending the code failed, using the same rules as otpRequestErrorMessage. */
export function otpRequestFailure(error: { code?: string; message: string }): SignInFailure {
  const code = error.code ?? "";
  const message = error.message.toLowerCase();
  if (isRateLimited(code, message)) return "rate_limited";
  if (code === "captcha_failed" || message.includes("captcha")) return "bot_check";
  return "unknown";
}

/**
 * Why checking the code failed. Supabase answers a wrong code and an expired one the same way (otp_expired), so
 * both start as invalid_code; signInCodeFailure tells them apart by the code's age.
 */
export function otpVerifyFailure(error: { code?: string; message: string }): SignInFailure {
  const code = error.code ?? "";
  const message = error.message.toLowerCase();
  if (isRateLimited(code, message)) return "rate_limited";
  if (code === "otp_expired" || message.includes("expired or is invalid")) return "invalid_code";
  return "unknown";
}

/** A code refused after its lifetime had run out was expired, not mistyped. */
export function signInCodeFailure(failure: SignInFailure, codeSentAt: number | null, now = Date.now()): SignInFailure {
  if (failure !== "invalid_code" || codeSentAt === null) return failure;
  return now - codeSentAt >= OTP_CODE_LIFETIME_MS ? "expired_code" : "invalid_code";
}
