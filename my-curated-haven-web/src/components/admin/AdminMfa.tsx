"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function AdminMfa({ onVerified }: { onVerified: () => void }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) {
        setStatus("Unable to start verification. Try again.");
        return;
      }
      const verified = factors?.totp?.find((f) => f.status === "verified") ?? factors?.totp?.[0];
      if (!verified) {
        setStatus("No authenticator enrolled. Enroll in account settings first.");
        return;
      }
      const challenge = await supabase.auth.mfa.challenge({ factorId: verified.id });
      if (challenge.error) {
        setStatus("Unable to start verification. Try again.");
        return;
      }
      const result = await supabase.auth.mfa.verify({
        factorId: verified.id,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (result.error) {
        setStatus("That code could not be verified. Try again.");
        return;
      }
      onVerified();
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <h1>Verify your admin access</h1>
      <p>Enter the 6-digit code from your authenticator app.</p>
      <form onSubmit={verify}>
        <label htmlFor="admin-mfa-code" className="block text-sm font-semibold text-foreground">Authenticator code</label>
        <input
          id="admin-mfa-code"
          className="mt-2 block w-full max-w-xs min-h-12 rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-text-muted focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <button type="submit" disabled={pending || code.trim().length === 0} className="mt-3 min-h-12 rounded-xl bg-action px-6 py-3 font-semibold text-action-foreground hover:bg-action-hover focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2 disabled:opacity-50 transition-colors">
          Verify
        </button>
      </form>
      {status ? (
        <p role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
    </div>
  );
}
