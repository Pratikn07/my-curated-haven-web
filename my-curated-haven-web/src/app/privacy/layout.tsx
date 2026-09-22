import type { Metadata } from "next";
import { pageMetadata } from "@/config/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Privacy Policy",
  "Privacy Policy for My Curated Haven. The public website does not currently offer accounts or payments.",
  "/privacy",
);

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
