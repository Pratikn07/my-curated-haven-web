import { ReactNode } from "react";
import type { PrimaryUx } from "@/lib/analytics/ux";

export default function Container({
  children,
  reading = false,
  className = "",
  trackUx,
}: {
  children: ReactNode;
  reading?: boolean;
  className?: string;
  /** The page area a tap inside reports (data-track-ux), when the container is the whole module. */
  trackUx?: PrimaryUx;
}) {
  return (
    <div className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${reading ? "max-w-[65ch]" : "max-w-6xl"} ${className}`} data-track-ux={trackUx}>
      {children}
    </div>
  );
}
