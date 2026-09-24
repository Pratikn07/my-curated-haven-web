"use client";

import Link from "next/link";
import { useAnalytics } from "./AnalyticsProvider";

export default function ConsentBanner() {
  const { acceptConsent, declineConsent, openPreferences } = useAnalytics();

  return (
    <aside
      aria-label="Privacy and cookie choices"
      className="border-b border-border bg-surface px-4 py-3 print:hidden"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-sm leading-relaxed text-text-muted">
          <span className="font-semibold text-foreground">Optional recipe analytics. </span>
          No ads, no session recordings, no child data.{" "}
          <Link href="/privacy" className="font-medium text-action underline hover:text-action-hover">
            privacy notice
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={declineConsent}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={openPreferences}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text-muted hover:text-foreground"
          >
            Preferences
          </button>
          <button
            type="button"
            onClick={acceptConsent}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-4 text-sm font-semibold text-white hover:bg-action-hover"
          >
            Accept Analytics
          </button>
        </div>
      </div>
    </aside>
  );
}
