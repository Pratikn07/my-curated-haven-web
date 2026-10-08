"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function SecurityMfa() {
  const [enrolled, setEnrolled] = useState<{ id: string; friendlyName: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refreshFactors() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error) {
      setEnrolled(
        (data?.totp ?? [])
          .filter((f) => f.status === "verified")
          .map((f) => ({ id: f.id, friendlyName: f.friendly_name ?? null }))
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    void refreshFactors();
  }, []);

  async function startEnroll() {
    setPending(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error || !data) {
        setStatus("Could not start enrollment. Try again.");
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } finally {
      setPending(false);
    }
  }

  async function confirmEnroll(event: React.FormEvent) {
    event.preventDefault();
    if (!factorId) return;
    setPending(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) {
        setStatus("Could not start verification. Try again.");
        return;
      }
      const result = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (result.error) {
        setStatus("That code could not be verified. Check your authenticator app and try again.");
        return;
      }
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setCode("");
      setStatus("Authenticator enrolled. Admin access will ask for a code at sign-in.");
      await refreshFactors();
    } finally {
      setPending(false);
    }
  }

  async function removeFactor(id: string) {
    setPending(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (error) {
        setStatus("Could not remove the authenticator. Try again.");
        return;
      }
      setStatus("Authenticator removed.");
      await refreshFactors();
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <p>Checking authenticator status…</p>;
  }

  return (
    <div>
      {enrolled.length > 0 ? (
        <div>
          <p>
            {enrolled.length} authenticator{enrolled.length === 1 ? "" : "s"} enrolled.
          </p>
          <ul>
            {enrolled.map((f) => (
              <li key={f.id}>
                {f.friendlyName ?? "Authenticator app"}{" "}
                <button type="button" onClick={() => void removeFactor(f.id)} disabled={pending}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No authenticator enrolled. Admin access requires one.</p>
      )}

      {qrCode ? (
        <form onSubmit={(e) => void confirmEnroll(e)}>
          <p>Scan this code with your authenticator app, then enter the 6-digit code.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- QR code is a generated data URI; Image optimization does not apply */}
          <img src={qrCode} alt="Authenticator setup code" width={200} height={200} />
          {secret ? <p>Manual entry key: <code>{secret}</code></p> : null}
          <label htmlFor="mfa-enroll-code">6-digit code</label>
          <input
            id="mfa-enroll-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          <button type="submit" disabled={pending || code.trim().length === 0}>
            Confirm enrollment
          </button>
          <button
            type="button"
            onClick={() => {
              setQrCode(null);
              setSecret(null);
              setFactorId(null);
              setCode("");
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => void startEnroll()} disabled={pending}>
          {enrolled.length > 0 ? "Enroll another authenticator" : "Enroll authenticator app"}
        </button>
      )}

      {status ? (
        <p role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
    </div>
  );
}
