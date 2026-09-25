import type { Metadata } from "next";
import { pageMetadata } from "@/config/page-metadata";

export const metadata: Metadata = pageMetadata(
  "About",
  "My Curated Haven is the product. Recipes by Tiny Soho, inside My Curated Haven, starting with three complete free toddler recipes.",
  "/about",
);

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
