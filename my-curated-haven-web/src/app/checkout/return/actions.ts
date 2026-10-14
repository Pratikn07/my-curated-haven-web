"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { otpRequestErrorMessage, otpVerifyErrorMessage } from "@/lib/auth/otp-errors";
import { isTurnstileEnabled } from "@/lib/auth/turnstile";
import { claimGuestOrders, guestBuyerEmail, recordMockGuestEmail } from "@/lib/payments/guest-checkout";

export interface PurchaseCodeResult {
  success: boolean;
  error?: string;
}

const SESSION = /^cs_(live|test)_[A-Za-z0-9_]{8,200}$/;

function returnPath(sessionId: string): string {
  return `/checkout/return?session_id=${encodeURIComponent(sessionId)}`;
}

/**
 * Send the one-time code to the email the parent paid with. The email is read from the paid order, never from the
 * browser, so the code can only ever go to the buyer.
 */
export async function requestPurchaseCodeAction(sessionId: string, captchaToken?: string): Promise<PurchaseCodeResult> {
  if (!SESSION.test(sessionId)) return { success: false, error: "This payment link is not valid." };
  if (isTurnstileEnabled() && !captchaToken) {
    return { success: false, error: "We couldn't verify you're human yet. Please try again in a moment." };
  }
  const email = await guestBuyerEmail(sessionId);
  if (!email) return { success: false, error: "This purchase is already unlocked, or its payment hasn't arrived yet. Refresh the page." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, captchaToken } });
    if (error) return { success: false, error: otpRequestErrorMessage(error) };
    return { success: true };
  } catch {
    return { success: false, error: "We couldn't send the code. Please try again." };
  }
}

/**
 * Check the code, which signs the parent in as the account for that email (creating it the first time), then attach
 * the paid order to it and show "You're in".
 */
export async function verifyPurchaseCodeAction(sessionId: string, code: string): Promise<PurchaseCodeResult> {
  if (!SESSION.test(sessionId)) return { success: false, error: "This payment link is not valid." };
  const token = (code || "").trim();
  if (!token) return { success: false, error: "Enter the code from the email." };
  const email = await guestBuyerEmail(sessionId);
  if (!email) redirect(returnPath(sessionId));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) return { success: false, error: otpVerifyErrorMessage() };

  await claimGuestOrders(data.user.id);
  revalidatePath("/", "layout");
  redirect(returnPath(sessionId));
}

/** Local fixtures only: a mock checkout has no Stripe page, so the email Stripe would collect is typed here. */
export async function recordMockEmailAction(sessionId: string, email: string): Promise<PurchaseCodeResult> {
  if (!sessionId.startsWith("cs_test_mock_")) return { success: false, error: "Not available." };
  const ok = await recordMockGuestEmail(sessionId, (email || "").trim());
  return ok ? { success: true } : { success: false, error: "Enter a valid email." };
}
