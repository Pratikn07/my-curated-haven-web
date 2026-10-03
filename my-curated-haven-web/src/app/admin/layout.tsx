import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import NoRecording from "@/components/analytics/NoRecording";
import { requireAdminPage } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Recipe admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAdminPage("/admin/recipes");

  return (
    <NoRecording>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <nav
          aria-label="Admin"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"
        >
          <Link href="/admin/recipes" className="text-lg font-semibold text-foreground hover:underline">
            Recipe admin
          </Link>
          <p className="min-w-0 truncate text-sm text-text-muted">Signed in as {user.email}</p>
        </nav>
        {children}
      </div>
    </NoRecording>
  );
}
