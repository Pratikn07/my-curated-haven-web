import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Page not available",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-24">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-heading text-foreground mb-4">
            This page is not available
          </h1>
          <p className="text-lg text-foreground/70 leading-relaxed mb-8">
            That address is not part of the public site. You can go home or email support.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-6 py-3 font-semibold text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              Home
            </Link>
            <Link
              href="/support"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-foreground/20 px-6 py-3 font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              Support
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
