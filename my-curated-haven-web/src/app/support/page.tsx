"use client";

import { useState } from "react";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
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
    <Container reading className="py-8 sm:py-12">
      <h1 className="text-[2rem] font-semibold sm:text-5xl">Support</h1>
      <p className="mt-4 text-lg text-text-muted">
        Email is the way to reach My Curated Haven. The button below opens your email app. This website does not store the message and does not create a support ticket.
      </p>
      <section className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-2xl font-semibold">Email</h2>
        <p className="mt-3 break-all text-lg">
          <a className="font-semibold text-action underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-action px-5 font-semibold text-action-foreground"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            Email support
          </a>
          <Button variant="secondary" onClick={copyEmail}>
            Copy address
          </Button>
        </div>
        {copyState === "copied" ? <p className="mt-3" role="status">Address copied.</p> : null}
        {copyState === "failed" ? (
          <p className="mt-3" role="status">
            Copy failed. Select the address above and copy it yourself.
          </p>
        ) : null}
      </section>
      <section className="mt-8 grid gap-6">
        <div>
          <h2 className="text-2xl font-semibold">What this site offers now</h2>
          <p className="mt-2 text-text-muted">
            You can read the public pages and send an email. Recipe pages, accounts, and payments are not available. There is no live chat.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">iOS app</h2>
          <p className="mt-2 text-text-muted">
            This website does not offer an App Store download. If you already have a My Curated Haven app installed and need help with it, email support and say that the question is about the app.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Purchases</h2>
          <p className="mt-2 text-text-muted">
            There is nothing to buy here yet. Refund terms for a future recipe collection are not published because that purchase does not exist.
          </p>
        </div>
      </section>
    </Container>
  );
}
