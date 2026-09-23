import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
  highlighted?: boolean;
}

export default function Card({
  children,
  className = "",
  highlighted = false,
}: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border bg-surface p-4 text-foreground sm:p-6 ${
        highlighted ? "border-accent-strong" : "border-border"
      } ${className}`}
    >
      {children}
    </div>
  );
}
