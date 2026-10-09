import type { Result, Usage } from "@/lib/admin/contracts";

export default function AdminRecipeUsage({ usage }: { usage: Result<Usage> }) {
  if (!usage.ok) {
    return <section aria-label="Usage and access"><h2>Usage and access</h2><p role="status">Usage check unavailable. Retry before changing publication.</p></section>;
  }
  const value = usage.value;
  return (
    <section aria-label="Usage and access" className="admin-usage">
      <h2>Usage and access</h2>
      <p>Checked at {new Date(value.checkedAt).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })}</p>
      <section><h3>Free recipe slots</h3>
        {value.freeSlots.length ? <p>Referenced by slots {value.freeSlots.join(", ")}.</p> : <p>No free recipe slots reference this recipe.</p>}
      </section>
      <section><h3>Collection releases</h3>
        {value.releases.length ? <ul>{value.releases.map((release) => <li key={release.id}>{release.title} · version {release.version} · {release.state}{release.sealed ? " · sealed" : ""}</li>)}</ul> : <p>No collection releases reference this recipe.</p>}
      </section>
      <section><h3>Campaign references</h3>
        {value.sourceRevision === null ? <p role="status">Campaign usage check unavailable. Retry before publication or withdrawal.</p> : value.campaigns.length ? <ul>{value.campaigns.map((campaign) => <li key={campaign.slug}>{campaign.slug} · {campaign.status} · promises {campaign.promisedCount} recipes</li>)}</ul> : <p>No campaign references were found in the checked source.</p>}
      </section>
      <p className="admin-usage__source">Source revision: {value.sourceRevision ?? "unavailable"}. This is recipe usage, not a customer access decision.</p>
    </section>
  );
}
