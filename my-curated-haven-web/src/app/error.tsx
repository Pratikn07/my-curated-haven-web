"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import ButtonLink from "@/components/ui/ButtonLink";
import Container from "@/components/layout/Container";

/**
 * Any page that fails while loading (a database or payment provider hiccup) shows this inside the site's own
 * header and footer, instead of the framework's plain "Application error" screen.
 */
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[site] page failed to load", error.digest ?? error.message);
  }, [error]);

  return (
    <Container reading className="py-16 text-center" trackUx="error_page">
      <h1 className="text-[2rem] font-semibold">This page didn&apos;t load</h1>
      <p className="mt-4 text-lg text-text-muted">
        Something went wrong on our side. Please try again in a moment. Your recipes and anything you bought are safe.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={() => reset()} data-track-cta="retry">Try again</Button>
        <ButtonLink href="/" variant="secondary" data-track-cta="home">
          Home
        </ButtonLink>
      </div>
    </Container>
  );
}
