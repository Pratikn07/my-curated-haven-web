"use server";

import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isInAppBrowser, OPEN_IN_BROWSER_HINT } from "@/lib/auth/in-app-browser";
import { SIGN_IN_METHOD_COOKIE, signInMethodCookieOptions } from "@/lib/auth/oauth";
import { claimGuestOrders } from "@/lib/payments/guest-checkout";
import { sanitizeReturnTo } from "@/lib/auth/redirects";
import {
  OTP_SEND_FAILED,
  otpRequestErrorMessage,
  otpRequestFailure,
  otpVerifyErrorMessage,
  otpVerifyFailure,
  type SignInFailure,
} from "@/lib/auth/otp-errors";
import { isTurnstileEnabled } from "@/lib/auth/turnstile";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export interface AuthActionResult {
  success: boolean;
  error?: string;
  /** Why it failed, in sign_in_failed's fixed words (never the email or Supabase's text). */
  failure?: SignInFailure;
}

export async function requestOtpAction(
  email: string,
  captchaToken?: string
): Promise<AuthActionResult> {
  const trimmedEmail = (email || "").trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { success: false, error: "Please enter a valid email address.", failure: "unknown" };
  }

  // Fail before spending an email when the challenge was not completed.
  // Supabase rejects it anyway; this keeps the quota and the message ours.
  if (isTurnstileEnabled() && !captchaToken) {
    // Covers both "still working on it" and "the widget never produced one",
    // so a visitor whose challenge failed is pointed somewhere that works.
    // Google is no way out inside Instagram's browser, so point there to the phone's own browser.
    const inApp = isInAppBrowser((await headers()).get("user-agent"));
    return {
      success: false,
      error: inApp
        ? `We couldn't verify you're human. Please try again, or ${OPEN_IN_BROWSER_HINT} and sign in there.`
        : "We couldn't verify you're human. Please try again, or use Continue with Google.",
      failure: "bot_check",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: true,
        captchaToken,
      },
    });

    if (error) {
      return { success: false, error: otpRequestErrorMessage(error), failure: otpRequestFailure(error) };
    }

    return { success: true };
  } catch (err) {
    console.error("[sign-in] sending the code failed", err instanceof Error ? err.message : err);
    return { success: false, error: OTP_SEND_FAILED, failure: "unknown" };
  }
}

export async function verifyOtpAction(
  email: string,
  token: string,
  returnTo?: string
): Promise<AuthActionResult> {
  const trimmedEmail = (email || "").trim().toLowerCase();
  const trimmedToken = (token || "").trim();

  if (!trimmedEmail || !trimmedToken) {
    return { success: false, error: "Email and verification code are required.", failure: "unknown" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: trimmedEmail,
    token: trimmedToken,
    type: "email",
  });

  if (error) {
    return { success: false, error: otpVerifyErrorMessage(), failure: otpVerifyFailure(error) };
  }

  // Pay first: anything bought before signing in with this (now confirmed) email joins the account.
  if (data.user) await claimGuestOrders(data.user.id);

  // The redirect below means the form never hears back; the destination page records sign_in_completed.
  (await cookies()).set(SIGN_IN_METHOD_COOKIE, "email_code", signInMethodCookieOptions((await headers()).get("host")));

  const destination = sanitizeReturnTo(returnTo);
  revalidatePath("/", "layout");
  redirect(destination);
}
