import type { Metadata } from "next";
import { pageMetadata } from "@/config/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Terms of Service",
  "Terms for using My Curated Haven, including free recipes, optional accounts and food safety.",
  "/terms",
);

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
