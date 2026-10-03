import { BookOpen, Heart, Printer, Sprout } from "lucide-react";
import Container from "@/components/layout/Container";

const PROMISES = [
  {
    icon: Printer,
    title: "Free to read and print.",
    detail: "No account needed. Open a recipe, print it for the fridge and go.",
  },
  {
    icon: BookOpen,
    title: "Clear steps and storage notes.",
    detail: "Every recipe has its ingredients, steps and how to store leftovers in one place.",
  },
  {
    icon: Sprout,
    title: "Samples before promises.",
    detail: "Rooms that aren't open yet let you try a small sample, so you know what's coming.",
  },
  {
    icon: Heart,
    title: "No pop-ups, no countdowns, no perfect parents.",
    detail: "Real kitchens, real kids, and as much time as you need.",
  },
] as const;

export default function HavenPromises() {
  return (
    <section id="promises" aria-labelledby="promises-title" className="py-14 sm:py-20">
      <Container className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <div className="grid content-start gap-3">
          <p className="text-sm font-semibold tracking-wide text-accent-strong uppercase">Why it&apos;s a haven</p>
          <h2 id="promises-title" className="font-display text-[2rem] leading-[1.1] font-normal sm:text-[2.6rem]">
            What you can count on here.
          </h2>
        </div>
        <ul className="grid border-t border-border">
          {PROMISES.map(({ icon: Icon, title, detail }) => (
            <li key={title} className="grid grid-cols-[2.75rem_1fr] items-start gap-4 border-b border-border py-5">
              <span className="grid size-11 place-items-center rounded-full bg-[#e7eee2] text-accent-strong" aria-hidden="true">
                <Icon size={20} strokeWidth={1.6} />
              </span>
              <div>
                <h3 className="font-display text-xl font-normal">{title}</h3>
                <p className="mt-1 text-text-muted">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
