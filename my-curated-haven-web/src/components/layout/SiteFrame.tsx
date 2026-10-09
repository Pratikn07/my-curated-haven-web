"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import type { NavLink } from "@/config/site-navigation";
import { isAdminPath } from "@/lib/analytics/private-paths";

export default function SiteFrame({
  children,
  headerLinks,
  footerLinks,
}: {
  children: ReactNode;
  headerLinks: NavLink[];
  footerLinks: NavLink[];
}) {
  const pathname = usePathname();
  const isAdmin = pathname !== null && isAdminPath(pathname);

  return (
    <>
      <a className="skip-link" href={isAdmin ? "#admin-main" : "#main"}>
        Skip to content
      </a>
      <div className="flex min-h-screen flex-col">
        {isAdmin ? children : (
          <>
            <Navbar links={headerLinks} />
            <main id="main" className="flex-1">{children}</main>
            <Footer links={footerLinks} />
          </>
        )}
      </div>
    </>
  );
}
