"use server";

import { createClient } from "@/lib/supabase/server";
import { sanitizeReturnTo } from "@/lib/auth/redirects";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

export async function requestOtpAction(email: string): Promise<AuthActionResult> {
  const trimmedEmail = (email || "").trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      return { success: false, error: error.message };
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
