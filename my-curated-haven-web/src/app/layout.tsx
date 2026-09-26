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
    default: "My Curated Haven | Parenting, recipes and thoughtful ideas",
    template: "%s | My Curated Haven",
  },
  description:
    "A parenting companion starting with toddler recipes by Tiny Soho. Parenting Chat, Curated Shop and Bloom are planned for the web.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font variables sit on <html> because tokens.css reads them on :root.
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="antialiased">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
