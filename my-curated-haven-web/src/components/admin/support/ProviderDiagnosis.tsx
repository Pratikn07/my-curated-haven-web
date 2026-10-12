"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Result } from "@/lib/admin/contracts";
import type { ProviderObservation, SupportRead } from "@/lib/admin/support/contracts";
import { diagnoseOrderAction } from "@/lib/admin/support/actions";
import { formatUtc } from "@/lib/admin/collections/labels";
import { BLOCKER_LABELS, formatMoney } from "@/lib/admin/support/labels";

const subscribeHydration = () => () => {};

function failure(code: string, reference: string): string {
  if (code === "STALE") return "The order changed while it was being checked. Check again.";
  if (code === "RATE_LIMITED") return "Too many checks in the last minute. Wait a minute and try again.";
  if (code === "CONFLICT") return "A check of this order is already running. Try again in a moment.";
  if (code === "DENIED") return "You can no longer check provider details.";
  if (code === "DISABLED") return "Provider checks are switched off.";
  return `The check did not finish (${code}, reference ${reference}). Nothing was changed.`;
}

/**
 * What Stripe said about this order the last time anyone checked, and a way to check again. A check only reads
 * Stripe and records the answer; it never changes payments, access or the order.
 */
export default function ProviderDiagnosis({ orderId, latest, canCheck }: {
  orderId: string; latest: Result<SupportRead<ProviderObservation | null>>; canCheck: boolean;
}) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const router = useRouter();
  const [fresh, setFresh] = useState<ProviderObservation | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const shown = fresh ?? (latest.ok ? latest.value.value : null);

  async function check() {
    setPending(true);
    setStatus(null);
    const result = await diagnoseOrderAction(orderId, crypto.randomUUID());
    setPending(false);
    if (!result.ok) { setStatus(failure(result.code, result.reference)); return; }
    setFresh(result.value.value);
    setStatus(result.value.value.complete ? "Checked. Stripe's answer is recorded below." : "Checked, but Stripe's answer is incomplete.");
    router.refresh();
  }

  return (
    <section aria-labelledby="support-provider" className="admin-collection__section">
      <h2 id="support-provider">Stripe check</h2>
      {!latest.ok && fresh === null ? <p role="status">The last check is unavailable ({latest.code}). This does not mean no check exists.</p>
        : shown === null ? <p>No check recorded yet.</p>
        : <Observation observation={shown} />}
      {canCheck ? <button type="button" onClick={() => void check()} disabled={!hydrated || pending}>
        {pending ? "Checking…" : "Check provider status"}</button> : null}
      <p role="status" aria-label="Check status">{status ?? ""}</p>
    </section>
  );
}

function Observation({ observation }: { observation: ProviderObservation }) {
  const facts = observation.facts;
  const refunds = facts.refunds.length === 0 ? "None"
    : facts.refunds.map((r) => `${formatMoney(r.amountMinor, r.currency)} ${r.status.replaceAll("_", " ")}`).join(", ");
  const disputes = facts.disputes.length === 0 ? "None"
    : facts.disputes.map((d) => `${d.classification === "inquiry" ? "Inquiry" : d.classification === "formal" ? "Dispute" : "Unclassified"} (${d.status.replaceAll("_", " ")})`).join(", ");
  return (
    <>
      {observation.complete ? <p>Complete answer, checked {formatUtc(observation.verifiedAt)}.</p>
        : <div role="status">
          <p>Incomplete answer, checked {formatUtc(observation.verifiedAt)}. Treat anything below as unconfirmed:</p>
          <ul>{observation.blockers.map((b) => <li key={b}>{BLOCKER_LABELS[b] ?? b}</li>)}</ul>
        </div>}
      <dl className="admin-collection__facts">
        <div><dt>Stripe payment</dt><dd>{facts.paymentState === "paid"
          ? `Paid: ${formatMoney(facts.capturedMinor, facts.currency)}` : facts.paymentState === "unknown" ? "Unknown" : facts.paymentState}</dd></div>
        <div><dt>Stripe refunds</dt><dd>{refunds}</dd></div>
        <div><dt>Stripe disputes</dt><dd>{disputes}</dd></div>
        <div><dt>Payment id</dt><dd>{facts.paymentIntentId ?? "Unknown"}</dd></div>
        <div><dt>Mode</dt><dd>{facts.mode === "live" ? "Live" : "Test"}</dd></div>
        <div><dt>Answer fingerprint</dt><dd>{observation.materialDigest.slice(0, 12)}</dd></div>
      </dl>
    </>
  );
}
