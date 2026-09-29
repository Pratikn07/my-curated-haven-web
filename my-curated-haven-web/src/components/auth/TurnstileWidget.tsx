"use client";

import { useEffect, useRef } from "react";
import { TURNSTILE_SCRIPT_URL, getTurnstileSiteKey } from "@/lib/auth/turnstile";

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

/** Loads Cloudflare's script once per page, whatever mounts first. */
function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Allow a later attempt; a blocked request now may succeed on retry.
      scriptPromise = null;
      reject(new Error("Turnstile script failed to load"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
  /** Bump to discard a spent token and issue a fresh challenge. */
  resetSignal: number;
  /**
   * Called when the challenge cannot produce a token at all: the script was
   * blocked, or the widget itself errored (wrong site key, unsupported
   * browser). The parent must let the visitor proceed rather than hold the
   * button shut forever.
   */
  onUnavailable: (reason: string) => void;
}

/**
 * Renders nothing when no site key is configured, so local, CI and preview
 * builds keep the plain form. Turnstile tokens are single-use and expire, so
 * the parent resets the widget after every request it spends one on.
 */
export default function TurnstileWidget({
  onToken,
  resetSignal,
  onUnavailable,
}: TurnstileWidgetProps) {
  const siteKey = getTurnstileSiteKey();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Keep callbacks in refs so a re-render never tears down the widget itself.
  const onTokenRef = useRef(onToken);
  const onUnavailableRef = useRef(onUnavailable);

  useEffect(() => {
    onTokenRef.current = onToken;
    onUnavailableRef.current = onUnavailable;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!siteKey || !container) return;

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: siteKey,
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "timeout-callback": () => onTokenRef.current(null),
          // Turnstile reports a code here, e.g. 400020 for an invalid site key.
          // Returning true tells it we have handled the error ourselves.
          "error-callback": (code: string) => {
            onTokenRef.current(null);
            onUnavailableRef.current(String(code ?? "error"));
            return true;
          },
          // Stay out of the way unless this visitor actually has to do something.
          appearance: "interaction-only",
        });
      })
      .catch(() => {
        if (!cancelled) onUnavailableRef.current("script_blocked");
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetSignal === 0) return;
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onTokenRef.current(null);
    }
  }, [resetSignal]);

  if (!siteKey) return null;

  return <div ref={containerRef} className="flex justify-center empty:hidden" />;
}
