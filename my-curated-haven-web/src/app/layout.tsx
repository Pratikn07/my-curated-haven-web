import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import SiteShell from "@/components/layout/SiteShell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter-source",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant-source",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mycuratedhaven.com"),
  title: {
    default: "My Curated Haven | Simple toddler recipes for busy families",
    template: "%s | My Curated Haven",
  },
  description:
    "Simple toddler recipes for busy families. Recipes by Tiny Soho, inside My Curated Haven. The recipe collection is in preparation.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cormorant.variable} antialiased`}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
