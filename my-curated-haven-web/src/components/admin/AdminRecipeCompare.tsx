"use client";

import { useState } from "react";
import type { RecipeSnapshot } from "@/lib/admin/contracts";
import { diffSnapshots, mergePaths } from "@/lib/admin/snapshot";

export default function AdminRecipeCompare({
  active,
  stored,
  candidate,
  onApply,
}: {
  active: RecipeSnapshot;
  stored: RecipeSnapshot;
  candidate: RecipeSnapshot;
  onApply: (snapshot: RecipeSnapshot) => void;
}) {
  const diff = diffSnapshots(stored, candidate);
  const [choices, setChoices] = useState<Record<string, "stored" | "candidate">>(() =>
    Object.fromEntries(diff.map((d) => [d.field, "candidate" as const]))
  );
  if (diff.length === 0) {
    return <p role="status">No local changes to compare.</p>;
  }
  return (
    <section aria-label="Compare changes">
      <h2>Compare changes</h2>
      <ul>
        {diff.map((d) => (
          <li key={d.field}>
            <span>{d.field}</span>
            <label>
              <input
                type="radio"
                name={d.field}
                checked={(choices[d.field] ?? "candidate") === "stored"}
                onChange={() => setChoices((prev) => ({ ...prev, [d.field]: "stored" }))}
              />
              Stored: {JSON.stringify(d.before)}
            </label>
            <label>
              <input
                type="radio"
                name={d.field}
                checked={(choices[d.field] ?? "candidate") === "candidate"}
                onChange={() => setChoices((prev) => ({ ...prev, [d.field]: "candidate" }))}
              />
              Candidate: {JSON.stringify(d.after)}
            </label>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onApply(mergePaths(stored, candidate, choices))}>
        Apply selected changes
      </button>
      <details>
        <summary>Active public content (read-only reference)</summary>
        <pre>{JSON.stringify(active.catalog.title)}</pre>
      </details>
    </section>
  );
}
