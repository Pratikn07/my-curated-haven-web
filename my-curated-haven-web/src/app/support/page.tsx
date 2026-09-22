"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SUPPORT_EMAIL } from "@/config/site-navigation";

export default function Support() {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 px-6 sm:px-8 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-bold text-foreground mb-6 font-heading">
            Support
          </h1>
          <p className="text-xl text-foreground/70 leading-relaxed mb-8">
            Email is the way to reach My Curated Haven. The button below opens your email app. This website does not store the message and does not create a support ticket.
          </p>

          <section className="rounded-3xl bg-white border border-primary/10 p-6 sm:p-8 mb-8">
            <h2 className="text-2xl font-bold font-heading mb-3">Email</h2>
            <p className="text-lg break-all mb-4">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-semibold text-foreground underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground rounded-sm"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-6 py-3 font-semibold text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                Email support
              </a>
              <button
                type="button"
                onClick={copyEmail}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-foreground/20 px-6 py-3 font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                Copy address
              </button>
            </div>
            {copyState === "copied" && (
              <p className="mt-4 text-sm text-foreground/70" role="status">
                Address copied.
              </p>
            )}
            {copyState === "failed" && (
              <p className="mt-4 text-sm text-foreground/70" role="status">
                Copy failed. Select the address above and copy it yourself.
              </p>
            )}
          </section>

          <section className="space-y-6 text-foreground/80 leading-relaxed">
            <div>
              <h2 className="text-2xl font-bold font-heading text-foreground mb-2">What this site offers now</h2>
              <p>
                You can read the public pages and send an email. Recipe pages, accounts, and payments are not available. There is no live chat.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-bold font-heading text-foreground mb-2">iOS app</h2>
              <p>
                This website does not offer an App Store download. If you already have a My Curated Haven app installed and need help with it, email support and say that the question is about the app.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-bold font-heading text-foreground mb-2">Purchases</h2>
              <p>
                There is nothing to buy here yet. Refund terms for a future recipe collection are not published because that purchase does not exist.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
