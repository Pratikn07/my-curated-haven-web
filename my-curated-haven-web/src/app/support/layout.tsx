import type { Metadata } from "next";
import { pageMetadata } from "@/config/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Support",
  "Email support@mycuratedhaven.com for help with free recipes, signing in and saved recipes. There is no live chat.",
  "/support",
);

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
