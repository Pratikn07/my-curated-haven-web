import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOutAction } from "./actions";
import { Bookmark, Mail, HelpCircle, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Account | My Curated Haven",
  description: "Manage your My Curated Haven account, view saved recipes, and access support.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?returnTo=/account");
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-border pb-6 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Account Overview
        </h1>
        <p className="mt-2 text-base text-text-muted">
          Manage your saved recipe collection and account settings.
        </p>
      </header>

      <div className="grid gap-8">
        {/* Account Identity Card */}
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-action">
                Verified Account
              </span>
              <p className="mt-1 flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg min-w-0">
                <Mail className="h-5 w-5 shrink-0 text-action" />
                <span className="truncate">{user.email}</span>
              </p>
            </div>

            <form action={signOutAction} className="shrink-0">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-300 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </section>

        {/* Navigation Grid */}
        <section className="grid gap-6 sm:grid-cols-2">
          <Link
            href="/account/saved-recipes"
            className="group flex flex-col justify-between rounded-[var(--radius-card)] border border-border bg-surface p-6 transition-all hover:border-action hover:shadow-sm"
          >
            <div>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-action/10 text-action">
                <Bookmark className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground group-hover:text-action transition-colors">
                Saved Recipes
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                View your private bookmarks across all your devices.
              </p>
            </div>
            <div className="mt-6 flex items-center font-semibold text-action text-sm">
              <span>View saved recipes &rarr;</span>
            </div>
          </Link>

          <Link
            href="/support"
            className="group flex flex-col justify-between rounded-[var(--radius-card)] border border-border bg-surface p-6 transition-all hover:border-action hover:shadow-sm"
          >
            <div>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-action/10 text-action">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground group-hover:text-action transition-colors">
                Support & Inquiries
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                Have questions or need assistance with your account? Reach out to our team.
              </p>
            </div>
            <div className="mt-6 flex items-center font-semibold text-action text-sm">
              <span>Contact support &rarr;</span>
            </div>
          </Link>
        </section>

        {/* Account Closure Guidance */}
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground">
                Account Closure & Data Deletion
              </h2>
              <p className="mt-1 text-sm text-text-muted break-words">
                To close your My Curated Haven account and remove your bookmarks and personal
                data, please send a message to{" "}
                <a
                  href="mailto:support@mycuratedhaven.com"
                  className="font-medium text-action underline hover:text-action-hover break-all"
                >
                  support@mycuratedhaven.com
                </a>{" "}
                from your registered email address (<span className="break-all">{user.email}</span>). Account closure is
                support-assisted to ensure identity verification and protect shared mobile app
                settings.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
