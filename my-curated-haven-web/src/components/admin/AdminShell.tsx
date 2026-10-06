import type { ReactNode } from "react";
import Link from "next/link";
import type { AdminContext } from "@/lib/admin/contracts";

export default function AdminShell({
  context,
  children,
}: {
  context: AdminContext;
  children: ReactNode;
}) {
  return (
    <div>
      <header>
        <nav aria-label="Admin">
          <Link href="/admin/recipes">Recipes</Link>
          {context.operator.permissions.includes("team.manage") ? (
            <Link href="/admin/team">Team</Link>
          ) : null}
        </nav>
        <p>
          {context.operator.email} · {context.stage} · {context.assurance}
        </p>
      </header>
      <main>{children}</main>
    </div>
  );
}
