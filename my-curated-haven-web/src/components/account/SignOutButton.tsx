"use client";

import { resetAnalyticsClient } from "@/lib/analytics/client";
import { signOutAction } from "@/app/account/actions";

export default function SignOutButton() {
  const handleSignOut = async () => {
    resetAnalyticsClient();
    await signOutAction();
  };

  return (
    <form action={handleSignOut} className="shrink-0">
      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-300 transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}
