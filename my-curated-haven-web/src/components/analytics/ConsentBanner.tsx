"use client";

import Link from "next/link";
import { useAnalytics } from "./AnalyticsProvider";
import { ShieldCheck } from "lucide-react";

export default function ConsentBanner() {
  const { acceptConsent, declineConsent, openPreferences } = useAnalytics();

  return (
    <aside
      aria-label="Privacy and cookie choices"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 md:p-6 print:hidden pointer-events-none"
    >
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-xl pointer-events-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-action/10 text-action">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 text-sm text-text-muted leading-relaxed">
              <p className="font-semibold text-foreground">
                Your Privacy Choices on My Curated Haven
              </p>
              <p className="mt-1">
                We use privacy-friendly product analytics to understand which toddler recipes are helpful and improve our collections. We never use advertising pixels, session recordings, or child data. Learn more in our{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-action underline hover:text-action-hover"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={declineConsent}
              className="inline-flex min-h-11 flex-1 sm:flex-initial items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted transition-colors focus-visible:outline-2 focus-visible:outline-action"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={openPreferences}
              className="inline-flex min-h-11 flex-1 sm:flex-initial items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text-muted hover:text-foreground hover:bg-surface-muted transition-colors focus-visible:outline-2 focus-visible:outline-action"
            >
              Preferences
            </button>
            <button
              type="button"
              onClick={acceptConsent}
              className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-xl bg-action px-5 text-sm font-semibold text-white hover:bg-action-hover transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-action"
            >
              Accept Analytics
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
