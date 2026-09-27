import type { ReactNode } from "react";

/**
 * PostHog session recordings replace anything inside this wrapper with a blank
 * block. Recording is also stopped on these routes; this covers the moment
 * between a client-side navigation and the stop.
 */
export default function NoRecording({ children }: { children: ReactNode }) {
  return <div className="ph-no-capture contents">{children}</div>;
}
