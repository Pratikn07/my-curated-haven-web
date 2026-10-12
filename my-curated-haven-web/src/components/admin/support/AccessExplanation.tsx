import type { AccessExplanation as Explanation } from "@/lib/admin/support/contracts";
import { summariseSupportAccess } from "@/lib/admin/support/access";
import { formatUtc } from "@/lib/admin/collections/labels";
import { ACCESS_LABELS, SOURCE_LABELS } from "@/lib/admin/support/labels";

/** Why this person can or cannot open the collection, from the same rules their library uses. */
export default function AccessExplanation({ access }: { access: Explanation | null }) {
  const summary = summariseSupportAccess(access);
  return (
    <section aria-labelledby="support-access" className="admin-collection__section">
      <h2 id="support-access">Access</h2>
      {access === null || summary.effective === "unavailable"
        ? <p role="status">Access could not be explained right now. That is not the same as no access.</p>
        : <>
          <p>{ACCESS_LABELS[summary.effective]}: {summary.originalCount} {summary.originalCount === 1 ? "recipe" : "recipes"} bought,{" "}
            {summary.additionCount} added later{summary.heldCount ? `, ${summary.heldCount} currently withdrawn` : ""}.</p>
          <h3>Where the access comes from</h3>
          {access.sources.length === 0 ? <p>No purchase or grant is recorded for this collection.</p>
            : <ul className="admin-support__sources">
              {access.sources.map((source) => <li key={source.id}>
                {SOURCE_LABELS[source.kind]}: {source.eligible ? "gives access" : `no longer gives access (${source.reason ?? "ineligible"})`}
                {" · "}later recipes: {source.policyVersion === "additions-v1" ? "included"
                  : source.policyVersion === "original-only" ? "not included" : "not decided"}
                {" · "}from {formatUtc(source.validFrom)}{source.expiresAt ? ` until ${formatUtc(source.expiresAt)}` : ""}
              </li>)}
            </ul>}
          <p className="admin-collection__note">Explained with {access.resolverVersion}.</p>
        </>}
    </section>
  );
}
