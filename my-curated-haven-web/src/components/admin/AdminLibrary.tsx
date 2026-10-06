import Link from "next/link";
import type { LibraryResult } from "@/lib/admin/contracts";

export default function AdminLibrary({ result }: { result: LibraryResult }) {
  return (
    <div>
      <p>
        {result.filteredTotal} matching recipes
      </p>
      {result.dependencyChecks.some((check) => check.state === "unknown") ? (
        <p role="status">Some checks need verification. Retry before making a change.</p>
      ) : null}
      <div className="hidden md:block">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>State</th>
              <th>Changed</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/admin/recipes/${row.id}`}>{row.title}</Link>
                </td>
                <td>{row.publication}</td>
                <td>{row.changedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {result.rows.map((row) => (
          <article key={row.id} aria-label={row.title}>
            <Link href={`/admin/recipes/${row.id}`}>{row.title}</Link>
            <p>
              {row.publication} · {row.changedAt}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
