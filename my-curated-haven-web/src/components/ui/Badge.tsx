interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "accent" | "outline" | "neutral" | "free" | "collection";
  className?: string;
}

const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  primary: "bg-surface-muted text-foreground border-border",
  secondary: "bg-surface text-accent-strong border-accent-strong",
  accent: "bg-surface-muted text-foreground border-border",
  outline: "bg-surface text-foreground border-border-control",
  neutral: "bg-surface-muted text-foreground border-border",
  free: "bg-surface text-accent-strong border-accent-strong",
  collection: "bg-surface text-action border-action",
};

export default function Badge({ children, variant = "neutral", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
