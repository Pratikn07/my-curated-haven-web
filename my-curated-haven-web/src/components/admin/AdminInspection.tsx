import Link from "next/link";
import type { AdminContext, RecipeDetail } from "@/lib/admin/contracts";
import AdminRecipePreview from "./AdminRecipePreview";
import AdminRecipeReview from "./AdminRecipeReview";

export default function AdminInspection({
  detail,
  context,
  returnTo,
}: {
  detail: RecipeDetail;
  context: AdminContext;
  returnTo: string;
}) {
  return (
    <div>
      <Link href={returnTo}>Back to recipes</Link>
      <AdminRecipePreview snapshot={detail.active} label="Active recipe" />
      <AdminRecipeReview detail={detail} context={context} />
      <section aria-label="Readiness">
        <h2>Readiness</h2>
        <p>{detail.readiness.review}</p>
        <ul>
          {detail.readiness.checks.map((check) => (
            <li key={check.code}>
              {check.code}: {check.state} — {check.explanation}
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Usage and access">
        <h2>Usage and access</h2>
        <pre>{JSON.stringify(detail.usage, null, 2)}</pre>
      </section>
      <section aria-label="History">
        <h2>History</h2>
        <ul>
          {detail.history.events.map((event) => (
            <li key={event.id}>
              {event.action} by {event.actorId} at {event.at}
            </li>
          ))}
        </ul>
      </section>
      <p>
        {context.operator.email} · {context.stage}
      </p>
    </div>
  );
}
