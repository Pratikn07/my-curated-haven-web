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
