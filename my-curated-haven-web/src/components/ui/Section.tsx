import { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  delay?: number;
  title?: string;
}

export default function Section({ children, className = "", id, title }: SectionProps) {
  return (
    <section id={id} className={`py-8 sm:py-12 ${className}`}>
      {title ? <h2 className="mb-4 text-2xl font-semibold sm:text-3xl">{title}</h2> : null}
      {children}
    </section>
  );
}
