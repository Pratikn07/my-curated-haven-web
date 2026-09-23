import type { Metadata } from "next";
import { pageMetadata } from "@/config/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Terms of Service",
  "Terms of Service for My Curated Haven. No recipe purchase is offered on this website yet.",
  "/terms",
);

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
