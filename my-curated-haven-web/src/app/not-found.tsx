import type { Metadata } from "next";
import ButtonLink from "@/components/ui/ButtonLink";
import Container from "@/components/layout/Container";
import NotFoundTracker from "@/components/analytics/NotFoundTracker";

export const metadata: Metadata = {
  title: "Page not available",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Container reading className="py-16 text-center" trackUx="error_page">
      <NotFoundTracker />
      <h1 className="text-[2rem] font-semibold">This page is not available</h1>
      <p className="mt-4 text-lg text-text-muted">
        We couldn&apos;t find that page. It may have moved. You can go home or email support.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink href="/" data-track-cta="home">Home</ButtonLink>
        <ButtonLink href="/support" variant="secondary" data-track-cta="support">
          Support
        </ButtonLink>
      </div>
    </Container>
  );
}
