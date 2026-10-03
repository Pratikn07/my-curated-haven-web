import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import localFont from "next/font/local";
import SiteShell from "@/components/layout/SiteShell";
import { HOUSE_LIGHT_SCRIPT } from "@/lib/house-light";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter-source",
  subsets: ["latin"],
  display: "swap",
});

// The wordmark is the only Cormorant text, so only its letters are loaded ("My Curated Haven", about 2 KB
// per style instead of 36 KB). Any other letter falls back to Georgia through --font-brand in tokens.css.
// Subsets from Google Fonts (text=My Curated Haven), Cormorant Garamond SemiBold, SIL Open Font License.
const cormorant = localFont({
  variable: "--font-cormorant-source",
  src: [
    { path: "./fonts/cormorant-wordmark-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/cormorant-wordmark-600-italic.woff2", weight: "600", style: "italic" },
  ],
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces-source",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  // Kept preloaded: without it the headline first paints in a fallback serif and visibly
  // switches to Fraunces about 200 ms later on a phone-speed connection (measured 2026-10-03).
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
