import Container from "@/components/layout/Container";
import StorybookSample from "@/components/home/StorybookSample";

/** The Library is coming soon. Parents can try a sample page now; nothing is created or stored. */
export default function LibraryPreview() {
  return (
    <section id="library" aria-labelledby="library-title" className="scroll-mt-20 bg-[var(--room-library-wash)] py-14 sm:py-20">
      <Container className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-12">
        <div className="grid min-w-0 content-start gap-4">
          <p className="text-sm font-semibold tracking-wide text-[var(--room-library-accent)] uppercase">
            The Library · Coming soon
          </p>
          <h2 id="library-title" className="font-display text-[2rem] leading-[1.1] font-normal sm:text-[2.6rem]">
            A bedtime story where your child is the hero.
          </h2>
          <p className="max-w-[52ch] text-lg text-text-muted">
            When the Library opens, you&apos;ll add a few photos, pick a story and choose a style, from a real-life look to
            watercolor, cartoon or paper cut. Try a sample page now.
          </p>
          <p className="max-w-[52ch] text-text-muted">
            The sample uses a drawn child, not a real photo.
          </p>
        </div>
        <StorybookSample />
      </Container>
    </section>
  );
}
