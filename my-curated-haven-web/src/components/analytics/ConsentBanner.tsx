"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useAnalytics } from "./AnalyticsProvider";

export default function ConsentBanner() {
  const { acceptConsent, declineConsent, openPreferences } = useAnalytics();
  const bannerRef = useRef<HTMLElement>(null);

  // Reserve the banner's height at the end of the page so it never hides the footer
  // or a focused control (WCAG 2.4.11). Growing the bottom padding shifts nothing above it.
  useEffect(() => {
    const banner = bannerRef.current;
    if (!banner) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty("--consent-banner-height", `${banner.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(banner);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--consent-banner-height");
    };
  }, []);

  // Fixed to the bottom so the banner never pushes page content when fonts load (Phase 3 audit, CLS).
  return (
    <aside
      ref={bannerRef}
      aria-label="Privacy and cookie choices"
      className="fixed inset-x-0 bottom-0 z-[var(--z-header)] border-t border-border bg-surface px-4 py-3 shadow-[0_-4px_16px_rgba(61,64,91,0.08)] print:hidden"
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
