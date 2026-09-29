"use server";

import { createClient } from "@/lib/supabase/server";
import { sanitizeReturnTo } from "@/lib/auth/redirects";
import { otpRequestErrorMessage } from "@/lib/auth/otp-errors";
import { isTurnstileEnabled } from "@/lib/auth/turnstile";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

export async function requestOtpAction(
  email: string,
  captchaToken?: string
): Promise<AuthActionResult> {
  const trimmedEmail = (email || "").trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  // Fail before spending an email when the challenge was not completed.
  // Supabase rejects it anyway; this keeps the quota and the message ours.
  if (isTurnstileEnabled() && !captchaToken) {
    // Covers both "still working on it" and "the widget never produced one",
    // so a visitor whose challenge failed is pointed somewhere that works.
    return {
      success: false,
      error:
        "We couldn't verify you're human. Please try again, or use Continue with Google.",
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
      return { success: false, error: otpRequestErrorMessage(error) };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send verification code.",
    };
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
    return { success: false, error: "Email and verification code are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: trimmedEmail,
    token: trimmedToken,
    type: "email",
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const destination = sanitizeReturnTo(returnTo);
  revalidatePath("/", "layout");
  redirect(destination);
}
