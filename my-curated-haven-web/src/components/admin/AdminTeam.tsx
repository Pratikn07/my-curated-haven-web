"use client";

import { useState, useSyncExternalStore } from "react";
import { assignStaff, listStaff, lookupStaff, revokeStaff } from "@/lib/admin/actions";
import type { StaffRow } from "@/lib/admin/contracts";

const ROLE_DESCRIPTIONS = [
  { role: "viewer", label: "Viewer", description: "Read recipe workspace evidence." },
  { role: "editor", label: "Editor", description: "Prepare and save private recipe revisions." },
  { role: "reviewer", label: "Reviewer", description: "Review an exact saved revision." },
  { role: "publisher", label: "Publisher", description: "Publish an approved revision and withdraw a recipe." },
];
const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

export default function AdminTeam({ initialStaff }: { initialStaff: StaffRow[] }) {
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  const [staff, setStaff] = useState(initialStaff);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [match, setMatch] = useState<{ userId: string; email: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<StaffRow | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  async function refreshStaff() {
    const result = await listStaff();
    if (result.ok) setStaff(result.value);
    return result.ok;
  }

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
    if (result.ok) await refreshStaff();
    setPending(false);
    setStatus(result.ok ? "Roles assigned" : "Assignment failed. Try again.");
  }

  async function confirmRevoke() {
    if (!revokeTarget || !revokeReason.trim()) return;
    setPending(true);
    const result = await revokeStaff({ userId: revokeTarget.userId, reason: revokeReason.trim(), operationId: crypto.randomUUID() });
    if (result.ok) await refreshStaff();
    setPending(false);
    setStatus(result.ok ? "Access revoked" : "Revocation failed. Review access and retry.");
    if (result.ok) {
      setRevokeTarget(null);
      setRevokeReason("");
    }
  }

  return (
    <div className="admin-team">
      <h1>Team</h1>
      <p>Find a confirmed existing account, assign only the required recipe role, and record why access changes.</p>
      {!hydrated ? <p>Preparing team controls…</p> : null}
      <form onSubmit={find}>
        <label htmlFor="team-email">Existing account email</label>
        <input id="team-email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!hydrated} />
        <button type="submit" disabled={pending || !hydrated}>
          Find account
        </button>
      </form>
      {match ? <p>{match.email}</p> : null}
      <div className="admin-team__roles">
        {ROLE_DESCRIPTIONS.map(({ role, label, description }) => (
          <label key={role} htmlFor={`role-${role}`}>
            <input
              id={`role-${role}`}
              type="checkbox"
              disabled={!hydrated}
              checked={roles.includes(role)}
              onChange={(e) =>
                setRoles((prev) =>
                  e.target.checked ? [...prev, role] : prev.filter((r) => r !== role)
                )
              }
            />
            <span><strong>{label}</strong><small>{description}</small></span>
          </label>
        ))}
      </div>
      <label htmlFor="team-reason">Reason</label>
      <input id="team-reason" value={reason} onChange={(e) => setReason(e.target.value)} disabled={!hydrated} />
      <button
        type="button"
        onClick={confirm}
        disabled={!hydrated || pending || !match || roles.length === 0 || reason.trim().length === 0}
      >
        Confirm role assignment
      </button>
      {status ? (
        <p role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
      <section className="admin-team__list" aria-label="Current team">
        <h2>Current team</h2>
        <div className="admin-team__table-wrap"><table>
          <thead><tr><th scope="col">Account</th><th scope="col">Roles</th><th scope="col">State</th><th scope="col">Change record</th><th scope="col">Action</th></tr></thead>
          <tbody>{staff.map((row) => <tr key={row.userId}>
            <th scope="row">{row.email}</th>
            <td>{row.roles.length ? row.roles.map((role) => role[0].toUpperCase() + role.slice(1)).join(", ") : "None"}</td>
            <td>{row.active ? "Active" : "Revoked"}</td>
            <td>{row.active ? `Granted ${row.grantedAt} by ${row.grantedBy}` : `Revoked ${row.revokedAt ?? "unknown"} by ${row.revokedBy ?? "unknown"}`}</td>
            <td>{row.active && !row.roles.includes("owner") ? <button type="button" disabled={pending || !hydrated} onClick={() => { setRevokeTarget(row); setRevokeReason(""); }}>Revoke access</button> : null}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
      {revokeTarget ? <section className="admin-team__revoke" aria-label="Confirm access revocation">
        <h2>Revoke {revokeTarget.email}</h2>
        <p>This removes their current recipe workspace roles. The owner role cannot be revoked here.</p>
        <label htmlFor="team-revoke-reason">Reason for revocation</label>
        <input id="team-revoke-reason" value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} disabled={!hydrated} />
        <button type="button" onClick={confirmRevoke} disabled={pending || !hydrated || !revokeReason.trim()}>Confirm revocation</button>
        <button type="button" onClick={() => setRevokeTarget(null)} disabled={pending || !hydrated}>Cancel</button>
      </section> : null}
    </div>
  );
}

export async function revokeUser(userId: string, reason: string) {
  return revokeStaff({ userId, reason, operationId: crypto.randomUUID() });
}
