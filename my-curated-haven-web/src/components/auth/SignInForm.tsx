"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { requestOtpAction, verifyOtpAction } from "@/app/sign-in/actions";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { coarseEntryPoint } from "@/lib/analytics/schema";

interface SignInFormProps {
  returnTo?: string;
}

export default function SignInForm({ returnTo }: SignInFormProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      const res = await requestOtpAction(email);
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
          { entry_point: coarseEntryPoint(returnTo) },
          "sign_in"
        );
      } else {
        setError(res.error || "Invalid or expired verification code.");
      }
    });
  };

  const handleResend = () => {
    setError(null);
    setResendNotice(null);

    startTransition(async () => {
      const res = await requestOtpAction(email);
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
            disabled={isPending}
            className="w-full min-h-12 rounded-xl bg-action px-6 py-3 font-semibold text-action-foreground hover:bg-action-hover focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Sending code..." : "Continue with Email"}
          </button>

        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Enter Verification Code
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              We sent a 6-digit code to <strong className="text-foreground">{email}</strong>.
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
              6-digit code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              disabled={isPending}
              className="mt-2 block w-full min-h-12 tracking-widest text-center text-2xl font-bold rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-text-muted focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || code.length < 6}
            className="w-full min-h-12 rounded-xl bg-action px-6 py-3 font-semibold text-action-foreground hover:bg-action-hover focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Verifying..." : "Verify & Sign In"}
          </button>

          <div className="flex flex-col items-center gap-2 pt-2 text-sm text-text-muted">
            <button
              type="button"
              onClick={handleResend}
              disabled={isPending}
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
    </div>
  );
}
