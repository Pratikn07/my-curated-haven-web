"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import NoRecording from "./NoRecording";
import { isAdminPath } from "@/lib/analytics/private-paths";
import { syncAdminPrivacy } from "@/lib/analytics/posthog";

export default function AdminPrivacyBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) syncAdminPrivacy(pathname);
  }, [pathname]);

  if (!pathname || !isAdminPath(pathname)) return <>{children}</>;
  return (
    <NoRecording>
      <div data-admin-privacy="isolated">{children}</div>
    </NoRecording>
  );
}
