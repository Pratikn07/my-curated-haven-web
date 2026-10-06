"use client";

import { useState } from "react";
import { assignStaff, lookupStaff, revokeStaff } from "@/lib/admin/actions";

export default function AdminTeam() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [match, setMatch] = useState<{ userId: string; email: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function find(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    setMatch(null);
    const result = await lookupStaff(email);
    setPending(false);
    if (!result.ok) {
      setStatus("Lookup unavailable. Try again.");
      return;
    }
    const value = result.value as { status: string; match?: { userId: string; email: string } };
    if (value.status === "found" && value.match) {
      setMatch(value.match);
      setStatus(`Found ${value.match.email}. Confirm roles below.`);
    } else if (value.status === "ambiguous") {
      setStatus("Multiple accounts match. Ask an operator to resolve it.");
    } else if (value.status === "unconfirmed") {
      setStatus("Account is unconfirmed and cannot be assigned.");
    } else {
      setStatus("No confirmed account found for that email.");
    }
  }

  async function confirm() {
    if (!match) return;
    setPending(true);
    const result = await assignStaff({
      userId: match.userId,
      roles,
      reason: reason.trim(),
      operationId: crypto.randomUUID(),
    });
    setPending(false);
    setStatus(result.ok ? "Roles assigned" : "Assignment failed. Try again.");
  }

  return (
    <div>
      <h1>Team</h1>
      <form onSubmit={find}>
        <label htmlFor="team-email">Existing account email</label>
        <input id="team-email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit" disabled={pending}>
          Find account
        </button>
      </form>
      {match ? <p>{match.email}</p> : null}
      <div>
        {["viewer", "editor", "reviewer", "publisher"].map((role) => (
          <label key={role} htmlFor={`role-${role}`}>
            <input
              id={`role-${role}`}
              type="checkbox"
              checked={roles.includes(role)}
              onChange={(e) =>
                setRoles((prev) =>
                  e.target.checked ? [...prev, role] : prev.filter((r) => r !== role)
                )
              }
            />
            {role[0]?.toUpperCase() + role.slice(1)}
          </label>
        ))}
      </div>
      <label htmlFor="team-reason">Reason</label>
      <input id="team-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      <button
        type="button"
        onClick={confirm}
        disabled={pending || !match || roles.length === 0 || reason.trim().length === 0}
      >
        Confirm role assignment
      </button>
      {status ? (
        <p role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
    </div>
  );
}

export async function revokeUser(userId: string, reason: string) {
  return revokeStaff({ userId, reason, operationId: crypto.randomUUID() });
}
