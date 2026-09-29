"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { requestOtpAction, verifyOtpAction } from "@/app/sign-in/actions";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { coarseEntryPoint } from "@/lib/analytics/schema";
import { createClient } from "@/lib/supabase/browser";
import { oauthCallbackUrl } from "@/lib/auth/oauth";
import { EMAIL_OTP_LENGTH } from "@/lib/auth/otp";
import { isTurnstileEnabled } from "@/lib/auth/turnstile";
import TurnstileWidget from "@/components/auth/TurnstileWidget";

const CALLBACK_MESSAGES: Record<string, string> = {
  cancelled: "Google sign-in was cancelled. You can try again or use your email instead.",
  failed: "We couldn't finish signing you in with Google. Please try again, or use your email instead.",
};

interface SignInFormProps {
  returnTo?: string;
  authError?: string;
}

function GoogleMark() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.2 13.2 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 7l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.4z" />
      <path fill="#FBBC05" d="M10.4 28.7a14.6 14.6 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.8-3.7-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function SignInForm({ returnTo, authError }: SignInFormProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(
    authError ? (CALLBACK_MESSAGES[authError] ?? CALLBACK_MESSAGES.failed) : null
  );
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);

  const captchaRequired = isTurnstileEnabled();
  // A token is spent by the request that uses it, so every send needs a new one.
  const spendCaptchaToken = () => {
    setCaptchaToken(null);
    setCaptchaResetSignal((n) => n + 1);
  };
  const awaitingCaptcha = captchaRequired && !captchaToken && !captchaUnavailable;
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const startedTrackedRef = useRef(false);

  useEffect(() => {
    if (startedTrackedRef.current) return;
    startedTrackedRef.current = true;
    trackAnalyticsEvent(
      "sign_in_started",
      { entry_point: coarseEntryPoint(returnTo) },
      "sign_in"
    );
  }, [returnTo]);

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendNotice(null);

    startTransition(async () => {
      const res = await requestOtpAction(email, captchaToken ?? undefined);
      spendCaptchaToken();
      if (res.success) {
        setStep("code");
      } else {
        setError(res.error || "Failed to send verification code. Please try again.");
      }
    });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await verifyOtpAction(email, code, returnTo);
      if (res.success) {
        trackAnalyticsEvent(
          "sign_in_completed",
          { entry_point: coarseEntryPoint(returnTo), method: "email_code" },
          "sign_in"
        );
      } else {
        setError(res.error || "Invalid or expired verification code.");
      }
    });
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setResendNotice(null);
    setIsGooglePending(true);

    try {
      const { error: oauthError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: oauthCallbackUrl(window.location.origin, returnTo),
        },
      });
      if (oauthError) throw oauthError;
      // The browser is navigating to Google; leave the button busy.
    } catch {
      setError("We couldn't open Google sign-in. Please use your email instead.");
      setIsGooglePending(false);
    }
  };

  const handleResend = () => {
    setError(null);
    setResendNotice(null);

    startTransition(async () => {
      const res = await requestOtpAction(email, captchaToken ?? undefined);
      spendCaptchaToken();
      if (res.success) {
        setResendNotice("A fresh verification code has been sent.");
      } else {
        setError(res.error || "Could not resend code. Please try again later.");
      }
    });
  };

  return (
    <div className="w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-sm sm:p-8">
      {step === "email" ? (
        <form onSubmit={handleRequestOtp} className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Sign In
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              Enter your email to receive a one-time verification code. If you enter a new
              email address, we&apos;ll create a My Curated Haven account for you. Sign in to
              save recipes and access them across all your devices. By continuing, you agree
              to our{" "}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-foreground"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              disabled={isPending}
              className="mt-2 block w-full min-h-12 rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-text-muted focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || awaitingCaptcha}
            className="w-full min-h-12 rounded-xl bg-action px-6 py-3 font-semibold text-action-foreground hover:bg-action-hover focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {isPending
              ? "Sending code..."
              : awaitingCaptcha
                ? "Checking you're human..."
                : "Continue with Email"}
          </button>

          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              or
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isPending || isGooglePending}
            aria-busy={isGooglePending}
            className="inline-flex w-full min-h-12 items-center justify-center gap-3 rounded-xl border border-border bg-surface px-6 py-3 font-semibold text-foreground hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {isGooglePending ? (
              <span>Opening Google...</span>
            ) : (
              <>
                <GoogleMark />
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Enter Verification Code
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              We sent a {EMAIL_OTP_LENGTH}-digit code to{" "}
              <strong className="text-foreground">{email}</strong>.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {resendNotice && (
            <div
              role="status"
              className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/50 dark:text-green-300"
            >
              {resendNotice}
            </div>
          )}

          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-semibold text-foreground"
            >
              {EMAIL_OTP_LENGTH}-digit code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={EMAIL_OTP_LENGTH}
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder={"1".repeat(EMAIL_OTP_LENGTH)}
              disabled={isPending}
              className="mt-2 block w-full min-h-12 tracking-widest text-center text-2xl font-bold rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-text-muted focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || code.length < EMAIL_OTP_LENGTH}
            className="w-full min-h-12 rounded-xl bg-action px-6 py-3 font-semibold text-action-foreground hover:bg-action-hover focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Verifying..." : "Verify & Sign In"}
          </button>

          <div className="flex flex-col items-center gap-2 pt-2 text-sm text-text-muted">
            <button
              type="button"
              onClick={handleResend}
              disabled={isPending || awaitingCaptcha}
              className="hover:text-foreground underline min-h-11 inline-flex items-center"
            >
              Didn&apos;t receive a code? Resend
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
                setResendNotice(null);
              }}
              disabled={isPending}
              className="hover:text-foreground underline min-h-11 inline-flex items-center"
            >
              Use a different email
            </button>
          </div>
        </form>
      )}

      <TurnstileWidget
        onToken={setCaptchaToken}
        resetSignal={captchaResetSignal}
        onUnavailable={() => setCaptchaUnavailable(true)}
      />

      {captchaUnavailable && (
        <p className="mt-4 text-sm text-text-muted" role="status">
          We couldn&apos;t load the human check, which usually means a browser
          extension blocked it. Continue with Google works without it.
        </p>
      )}
    </div>
  );
}
