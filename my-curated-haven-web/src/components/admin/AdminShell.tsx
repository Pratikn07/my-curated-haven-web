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
  const links = adminNavigation(context.operator, pathname, context.collectionStage);
  const groups = [...new Set(links.map((link) => link.group))];
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
          <nav aria-label="Admin" className="admin-console__nav">
            {groups.map((group) => (
              <div key={group} role="group" aria-labelledby={`admin-nav-${group}`} className="admin-console__nav-group">
                <p id={`admin-nav-${group}`} className="admin-console__rail-label">{group}</p>
                {links.filter((link) => link.group === group).map((link) => (
                  <Link key={link.href} href={link.href} aria-current={link.current ? "page" : undefined}
                    className={link.current ? "admin-console__nav-link admin-console__nav-link--current" : "admin-console__nav-link"}>
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <p className="admin-console__stage">Console stage: {context.stage}</p>
        </aside>
        <main id="admin-main" className="admin-console__main">{children}</main>
      </div>
    </div>
  );
}
