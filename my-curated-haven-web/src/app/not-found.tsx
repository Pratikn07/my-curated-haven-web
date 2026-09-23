import type { Metadata } from "next";
import ButtonLink from "@/components/ui/ButtonLink";
import Container from "@/components/layout/Container";

export const metadata: Metadata = {
  title: "Page not available",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Container reading className="py-16 text-center">
      <h1 className="text-[2rem] font-semibold">This page is not available</h1>
      <p className="mt-4 text-lg text-text-muted">
        That address is not part of the public site. You can go home or email support.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink href="/">Home</ButtonLink>
        <ButtonLink href="/support" variant="secondary">
          Support
        </ButtonLink>
      </div>
    </Container>
  );
}
