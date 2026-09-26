import type { ReactNode } from "react";
import NoRecording from "@/components/analytics/NoRecording";

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return <NoRecording>{children}</NoRecording>;
}
