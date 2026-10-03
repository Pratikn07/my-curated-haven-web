import type { Metadata } from "next";
import { Cormorant_Garamond, Fraunces, Inter } from "next/font/google";
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

const fraunces = Fraunces({
  variable: "--font-fraunces-source",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

// Runs before first paint: marks JavaScript as available and sets the house light from the visitor's clock.
const daypartScript = `(function(){var d=document.documentElement;d.classList.add("js");var h=new Date().getHours();d.setAttribute("data-daypart",h>=20||h<6?"night":h>=17?"evening":"day");})();`;

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
    // The inline script adds a class and data-daypart before hydration, so React must not warn about them.
    <html lang="en" className={`${inter.variable} ${cormorant.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: daypartScript }} />
      </head>
      <body className="antialiased">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
