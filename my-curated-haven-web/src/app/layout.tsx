import type { Metadata } from "next";
import { Outfit, Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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
      <body
        className={`${outfit.variable} ${inter.variable} ${cormorant.variable} antialiased font-body bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
