import type { ReactNode } from "react";

export default function AdminRecordFrame({
  title,
  identifier,
  liveState,
  workingState,
  checkedAt,
  actions,
  children,
}: {
  title: string;
  identifier?: string;
  liveState: string;
  workingState: string;
  checkedAt: string;
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="admin-record">
      <header className="admin-record__header">
        <p className="admin-record__eyebrow">Recipe workspace</p>
        <h1>{title}</h1>
        {identifier ? <p className="admin-record__identifier">{identifier}</p> : null}
        <dl className="admin-record__states">
          <div><dt>Live</dt><dd>{liveState}</dd></div>
          <div><dt>Working revision</dt><dd>{workingState}</dd></div>
        </dl>
        <p className="admin-record__checked">Checked at {checkedAt}</p>
      </header>
      <div className="admin-record__layout">
        <aside className="admin-record__actions" aria-label="Next action">
          <h2>Next action</h2>
          {actions}
        </aside>
        <div className="admin-record__evidence">{children}</div>
      </div>
    </article>
  );
}
