import type { Metadata } from "next";
import { Cormorant_Garamond, Fraunces, Inter } from "next/font/google";
import SiteShell from "@/components/layout/SiteShell";
import { HOUSE_LIGHT_SCRIPT } from "@/lib/house-light";
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

const fraunces = Fraunces({
  variable: "--font-fraunces-source",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});


export const metadata: Metadata = {
  metadataBase: new URL("https://mycuratedhaven.com"),
  title: {
    default: "My Curated Haven | A calm corner for parents of little ones",
    template: "%s | My Curated Haven",
  },
  description:
    "Free toddler recipes by Tiny Soho you can read or print without an account, with storybooks and more rooms on the way.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font variables sit on <html> because tokens.css reads them on :root.
    // The inline script sets the house light from the visitor's clock before first paint
    // (a class, data attributes and --hs-* numbers), so React must not warn about them.
    <html lang="en" className={`${inter.variable} ${cormorant.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HOUSE_LIGHT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
