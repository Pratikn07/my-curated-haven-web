"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/account/SignOutButton";
import type { AdminContext } from "@/lib/admin/contracts";
import { adminNavigation } from "@/lib/admin/navigation";

export default function AdminShell({
  context,
  children,
}: {
  context: AdminContext;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const links = adminNavigation(context.operator, pathname);
  return (
    <div className="admin-console">
      <header className="admin-console__header">
        <div className="admin-console__identity">
          <Link href="/" className="admin-console__brand">My Curated Haven</Link>
          <span className="admin-console__label">Admin workspace</span>
        </div>
        <div className="admin-console__operator">
          <span className="admin-console__operator-email">{context.operator.email}</span>
          <Link href="/" className="admin-console__site-link">Public site</Link>
          <SignOutButton />
        </div>
      </header>
      <div className="admin-console__body">
        <aside className="admin-console__rail" aria-label="Admin workspace navigation">
          <p className="admin-console__rail-label">Publishing</p>
          <nav aria-label="Admin" className="admin-console__nav">
            {links.map((link) => (
              <Link key={link.href} href={link.href} aria-current={link.current ? "page" : undefined}
                className={link.current ? "admin-console__nav-link admin-console__nav-link--current" : "admin-console__nav-link"}>
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="admin-console__stage">Console stage: {context.stage}</p>
        </aside>
        <main id="admin-main" className="admin-console__main">{children}</main>
      </div>
    </div>
  );
}
