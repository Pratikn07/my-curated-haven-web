"use client";

import { useEffect, useRef } from "react";
import { useAnalytics } from "./AnalyticsProvider";
import { X, Shield, CheckCircle, Info } from "lucide-react";

export default function ConsentPreferencesModal() {
  const {
    consentStatus,
    closePreferences,
    acceptConsent,
    declineConsent,
    withdrawConsent,
  } = useAnalytics();

  const modalRef = useRef<HTMLDivElement>(null);
  // The provider passes a new closePreferences each render; read the latest one so
  // the focus effect below runs only when the dialog opens and closes.
  const closeRef = useRef(closePreferences);
  useEffect(() => {
    closeRef.current = closePreferences;
  }, [closePreferences]);

  // Dialog focus contract (Phase 3 D09): focus moves in on open, Tab stays inside,
  // Escape closes, and focus returns to the control that opened the dialog.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () =>
      Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    focusable()[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = modalRef.current?.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preferences-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-action" aria-hidden="true" />
            <h2 id="preferences-modal-title" className="text-xl font-bold text-foreground">
              Privacy & Cookie Preferences
            </h2>
          </div>
          <button
            type="button"
            onClick={closePreferences}
            aria-label="Close preferences"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm text-text-muted leading-relaxed">
          <p>
            We believe in honest, transparent privacy defaults. You control whether optional measurement is active on your device.
          </p>

          {/* Essential services */}
          <div className="rounded-xl border border-border bg-surface-muted/50 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-action" />
                  Essential Site Features
                </h3>
                <p className="mt-1 text-xs">
                  Required for secure OTP sign-in, saving recipe bookmarks, recipe access verification, and Stripe checkout. Cannot be disabled.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-surface border border-border px-2 py-0.5 text-xs font-semibold text-action">
                Always Active
              </span>
            </div>
          </div>

          {/* Optional analytics */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-action" />
                  Optional Recipe Analytics
                </h3>
                <p className="mt-1 text-xs">
                  Helps us know if recipes are easy to cook and if collection printables are useful.
                  Uses a random identifier stored in your browser until you withdraw consent or clear your browser data. No advertising pixels, no child health profiling, and no session recordings.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs font-semibold capitalize text-foreground">
                {consentStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={closePreferences}
            className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted transition-colors"
          >
            Cancel
          </button>

          {consentStatus === "accepted" ? (
            <button
              type="button"
              onClick={withdrawConsent}
              className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
            >
              Withdraw Consent
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={declineConsent}
                className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted transition-colors"
              >
                Decline All
              </button>
              <button
                type="button"
                onClick={acceptConsent}
                className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-xl bg-action px-5 text-sm font-semibold text-white hover:bg-action-hover transition-colors shadow-sm"
              >
                Accept Analytics
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
