import type { Metadata } from "next";
import { pageMetadata } from "@/config/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Support",
  "Email support@mycuratedhaven.com. This website does not offer live chat, accounts, or purchases yet.",
  "/support",
);

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
