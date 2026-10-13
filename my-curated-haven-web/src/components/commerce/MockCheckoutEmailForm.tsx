"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordMockEmailAction } from "@/app/checkout/return/actions";

/**
 * Local fixtures only. A mock checkout has no Stripe page, so this stands in for the email Stripe collects. Never
 * shown for a real payment: the server action refuses anything but a local mock session.
 */
export default function MockCheckoutEmailForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await recordMockEmailAction(sessionId, email);
          if (res.success) router.refresh();
          else setError(res.error ?? "Enter a valid email.");
        });
      }}
      className="text-left"
    >
      <h1 className="text-center text-2xl font-bold text-foreground">Test checkout</h1>
      <p className="mt-2 text-center text-sm text-text-muted">Stripe would ask for the buyer&apos;s email here.</p>
      <label htmlFor="mock-email" className="mt-5 block text-sm font-semibold text-foreground">Email address</label>
      <input
        id="mock-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-2 block w-full min-h-12 rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground"
      />
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={isPending} className="mt-4 w-full min-h-12 rounded-xl bg-action px-6 py-3 font-semibold text-action-foreground disabled:opacity-50">
        Continue
      </button>
    </form>
  );
}
