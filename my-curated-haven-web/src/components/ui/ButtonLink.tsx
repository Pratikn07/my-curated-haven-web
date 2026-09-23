import Link from "next/link";
import { ComponentProps } from "react";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: "primary" | "secondary";
};

export default function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonLinkProps) {
  const styles =
    variant === "primary"
      ? "bg-action text-action-foreground hover:bg-action-hover"
      : "border border-border-control bg-surface text-foreground hover:bg-surface-muted";

  return (
    <Link
      className={`inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-base font-semibold ${styles} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
