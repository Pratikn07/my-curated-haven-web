import { ReactNode } from "react";

type StatePanelProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
};

export default function StatePanel({ title, children, action }: StatePanelProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-2 text-text-muted">{children}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
