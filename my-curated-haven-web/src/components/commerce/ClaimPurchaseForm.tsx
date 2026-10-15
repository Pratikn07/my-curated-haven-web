"use client";

import { useEffect, useState, useTransition } from "react";
import { requestPurchaseCodeAction, verifyPurchaseCodeAction } from "@/app/checkout/return/actions";
import TurnstileWidget from "@/components/auth/TurnstileWidget";
import { EMAIL_OTP_LENGTH } from "@/lib/auth/otp";
import { emailSubmitBlocked, isTurnstileEnabled } from "@/lib/auth/turnstile";
import { bookName } from "@/lib/collections/book-name";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

interface ClaimPurchaseFormProps {
  sessionId: string;
  /** The book being unlocked, for purchase_claimed. */
  collectionSlug?: string;
  maskedEmail: string;
  collectionTitle: string;
  supportReference: string;
}

/** The code step survives a reload (Instagram can reload while the parent reads the code in their mail app). */
const PENDING_MS = 10 * 60 * 1000;
const pendingKey = (sessionId: string) => `mch-claim-${sessionId}`;

function remember(sessionId: string, sent: boolean) {
  try {
    if (sent) window.sessionStorage.setItem(pendingKey(sessionId), String(Date.now()));
    else window.sessionStorage.removeItem(pendingKey(sessionId));
  } catch {
    // Storage can be blocked; the form still works, it just forgets on reload.
  }
}

function codeWasSent(sessionId: string): boolean {
  try {
    const at = Number(window.sessionStorage.getItem(pendingKey(sessionId)));
    return Number.isFinite(at) && at > 0 && Date.now() - at < PENDING_MS;
  } catch {
    return false;
  }
}

/**
 * After paying without an account: one tap sends a code to the email they paid with, and typing it unlocks the book.
 * The code proves the email is theirs, so nobody else holding the payment link can take the purchase.
 */
export default function ClaimPurchaseForm({ sessionId, collectionSlug, maskedEmail, collectionTitle, supportReference }: ClaimPurchaseFormProps) {
  const [step, setStep] = useState<"send" | "code">("send");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const [isPending, startTransition] = useTransition();

  const awaitingCaptcha = emailSubmitBlocked({ configured: isTurnstileEnabled(), token: captchaToken, widgetFailed: captchaUnavailable });
  const spendCaptchaToken = () => {
    setCaptchaToken(null);
    setCaptchaResetSignal((n) => n + 1);
  };

  useEffect(() => {
    if (!codeWasSent(sessionId)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the sent-code marker after hydration
    setStep("code");
  }, [sessionId]);

  const sendCode = (again: boolean) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await requestPurchaseCodeAction(sessionId, captchaToken ?? undefined);
      spendCaptchaToken();
      if (!res.success) {
        setError(res.error ?? "We couldn't send the code. Please try again.");
        return;
      }
      remember(sessionId, true);
      setStep("code");
      if (again) setNotice("A new code is on its way.");
    });
  };

  const unlock = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      // A correct code re-renders this page as "You're in"; forget the sent code first.
      remember(sessionId, false);
      const res = await verifyPurchaseCodeAction(sessionId, code);
      if (res.success) {
        void trackAnalyticsEvent("purchase_claimed", collectionSlug ? { collection_slug: collectionSlug } : {}, "checkout_return");
        return;
      }
      remember(sessionId, true);
      setError(res.error ?? "That code didn't work. Check it and try again.");
    });
  };

  return (
    <div className="text-left" data-track-ux="claim_form">
      <p className="text-center text-sm font-semibold uppercase tracking-wider text-action">Payment received</p>
      <h1 className="mt-2 text-center text-3xl font-extrabold text-foreground">One last step</h1>
      <p className="mx-auto mt-3 max-w-sm text-center text-base text-text-muted">
        Confirm your email to unlock <strong className="text-foreground">{bookName(collectionTitle)}</strong>.
        It also keeps your recipes in your account, so you can open them anywhere.
      </p>

      {error && (
        <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/50 dark:text-green-300">
          {notice}
        </div>
      )}

      {step === "send" ? (
        <div className="mt-6">
          <p className="text-center text-sm text-text-muted">
            We&apos;ll email a {EMAIL_OTP_LENGTH}-digit code to <strong className="text-foreground">{maskedEmail}</strong>, the email you paid with.
          </p>
          <button
            type="button"
            onClick={() => sendCode(false)}
            disabled={isPending || awaitingCaptcha}
            className="mt-4 w-full min-h-12 rounded-xl bg-action px-6 py-3 font-semibold text-action-foreground hover:bg-action-hover disabled:opacity-50"
          >
            {isPending ? "Sending..." : awaitingCaptcha ? "Checking you're human..." : "Send my code"}
          </button>
        </div>
      ) : (
        <form onSubmit={unlock} className="mt-6">
          <label htmlFor="purchase-code" className="block text-sm font-semibold text-foreground">
            {EMAIL_OTP_LENGTH}-digit code sent to {maskedEmail}
          </label>
          <input
            id="purchase-code"
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
            className="mt-2 block w-full min-h-12 rounded-xl border border-border bg-background px-4 py-3 text-center text-2xl font-bold tracking-widest text-foreground placeholder:text-text-muted focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
          />
          <button
            type="submit"
            disabled={isPending || code.length < EMAIL_OTP_LENGTH}
            className="mt-4 w-full min-h-12 rounded-xl bg-action px-6 py-3 font-semibold text-action-foreground hover:bg-action-hover disabled:opacity-50"
          >
            {isPending ? "Unlocking..." : "Unlock my recipes"}
          </button>
          <button
            type="button"
            onClick={() => sendCode(true)}
            disabled={isPending || awaitingCaptcha}
            className="mx-auto mt-3 flex min-h-11 items-center text-sm text-text-muted underline hover:text-foreground"
          >
            Didn&apos;t get it? Send a new code
          </button>
        </form>
      )}

      <TurnstileWidget
        onToken={(token) => {
          setCaptchaToken(token);
          if (token) setCaptchaUnavailable(false);
        }}
        resetSignal={captchaResetSignal}
        onUnavailable={() => setCaptchaUnavailable(true)}
      />

      <p className="mt-6 text-center text-xs text-text-muted">
        Order {supportReference}. Not your email, or no code after a few minutes? Write to{" "}
        <a href={`mailto:support@mycuratedhaven.com?subject=${encodeURIComponent(`Order ${supportReference}`)}`} className="underline">
          support@mycuratedhaven.com
        </a>{" "}
        with this order number.
      </p>
    </div>
  );
}
