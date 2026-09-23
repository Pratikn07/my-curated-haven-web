import { ButtonHTMLAttributes, Ref } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  busyLabel?: string;
  variant?: "primary" | "secondary";
  ref?: Ref<HTMLButtonElement>;
};

export default function Button({
  busy = false,
  busyLabel = "Working",
  variant = "primary",
  className = "",
  children,
  disabled,
  type = "button",
  ref,
  ...props
}: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-action text-action-foreground hover:bg-action-hover"
      : "border border-border-control bg-surface text-foreground hover:bg-surface-muted";

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl px-5 py-3 text-base font-semibold ${styles} disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {busy ? busyLabel : children}
    </button>
  );
}
