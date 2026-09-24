"use client";

import { useAnalytics } from "./AnalyticsProvider";

export default function ManageConsentButton() {
  const { openPreferences } = useAnalytics();

  return (
    <button
      type="button"
      onClick={openPreferences}
      className="inline-flex min-h-11 items-center font-semibold text-text-muted hover:text-foreground text-left transition-colors"
    >
      Cookie & Analytics Preferences
    </button>
  );
}
