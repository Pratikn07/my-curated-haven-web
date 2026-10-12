"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { lookupSupportAction } from "@/lib/admin/support/actions";

type Kind = "email" | "support_reference" | "user_id" | "provider_id";
const subscribeHydration = () => () => {};

const FAILURES: Record<string, string> = {
  INVALID: "That doesn't look like a complete email, order reference, account id or Stripe id.",
  RATE_LIMITED: "Too many lookups this minute. Wait a moment and try again.",
  DENIED: "You don't have access to this lookup.",
  DISABLED: "Support lookups are switched off.",
  MFA_REQUIRED: "Verify with your authenticator to look up customers.",
};

/**
 * Exact lookup only: the value is sent in the action body and never placed in the address bar. A found order or
 * account opens by its internal id; other results are shown here and select nothing.
 */
export default function SupportSearch({ canInspectProvider }: { canInspectProvider: boolean }) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("email");
  const [value, setValue] = useState("");
  const [accountId, setAccountId] = useState("");
  const [mode, setMode] = useState<"live" | "test">("live");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    const query = kind === "provider_id" ? { kind, value, accountId, mode } : { kind, value };
    const result = await lookupSupportAction(query);
    setPending(false);
    if (!result.ok) {
      setStatus(FAILURES[result.code] ?? `Lookup unavailable (${result.code}, reference ${result.reference}). This is not "not found". Try again.`);
      return;
    }
    const found = result.value.value;
    if (found.status === "found") {
      setStatus("Found. Opening…");
      router.push(found.target.orderId ? `/admin/support/orders/${found.target.orderId}`
        : `/admin/support/customers/${found.target.userId ?? found.target.ownerPrincipal}`);
      return;
    }
    setStatus(found.status === "not_found" ? "No exact match. Check the spelling; nothing is matched partially."
      : found.status === "ambiguous" ? "More than one account or order matches exactly. Search by order reference or account id instead."
      : "That account's email isn't confirmed yet, so it isn't opened from an email search.");
  }

  return (
    <section aria-labelledby="support-search" className="admin-collection__section admin-support__search">
      <h2 id="support-search">Find a customer or order</h2>
      <form onSubmit={submit}>
        <label htmlFor="support-search-kind">Search by</label>
        <select id="support-search-kind" value={kind} disabled={!hydrated || pending}
          onChange={(e) => setKind(e.target.value as Kind)}>
          <option value="email">Exact email</option>
          <option value="support_reference">Order reference (MCH-…)</option>
          <option value="user_id">Account id</option>
          {canInspectProvider ? <option value="provider_id">Stripe id (advanced)</option> : null}
        </select>
        <label htmlFor="support-search-value">{kind === "email" ? "Email" : kind === "support_reference" ? "Order reference"
          : kind === "user_id" ? "Account id" : "Stripe id (checkout, payment, charge, refund or dispute)"}</label>
        <input id="support-search-value" value={value} autoComplete="off" spellCheck={false} disabled={!hydrated || pending}
          onChange={(e) => setValue(e.target.value)} />
        {kind === "provider_id" ? <>
          <label htmlFor="support-search-account">Stripe account</label>
          <input id="support-search-account" value={accountId} autoComplete="off" disabled={!hydrated || pending}
            onChange={(e) => setAccountId(e.target.value)} />
          <label htmlFor="support-search-mode">Mode</label>
          <select id="support-search-mode" value={mode} disabled={!hydrated || pending}
            onChange={(e) => setMode(e.target.value as "live" | "test")}>
            <option value="live">Live</option>
            <option value="test">Test</option>
          </select>
        </> : null}
        <button type="submit" disabled={!hydrated || pending || value.trim().length === 0}>{pending ? "Searching" : "Search"}</button>
      </form>
      <p role="status" aria-label="Lookup result">{status ?? ""}</p>
    </section>
  );
}
