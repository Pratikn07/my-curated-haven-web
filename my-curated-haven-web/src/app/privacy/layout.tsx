import type { Metadata } from "next";
import { pageMetadata } from "@/config/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Privacy Policy",
  "How My Curated Haven handles your information: optional email sign-in, saved recipes and opt-in analytics.",
  "/privacy",
);

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
