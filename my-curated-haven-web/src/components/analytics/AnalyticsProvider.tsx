"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  type ConsentStatus,
  getStoredConsent,
  setStoredConsent,
} from "@/lib/analytics/consent";
import { parseAndRecordCampaign } from "@/lib/analytics/campaigns";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { pathToCanonicalRouteKey, toDeviceClass } from "@/lib/analytics/schema";
import ConsentBanner from "./ConsentBanner";
import ConsentPreferencesModal from "./ConsentPreferencesModal";

interface AnalyticsContextType {
  consentStatus: ConsentStatus;
  isPreferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptConsent: () => void;
  declineConsent: () => void;
  withdrawConsent: () => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export function useAnalytics(): AnalyticsContextType {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error("useAnalytics must be used within AnalyticsProvider");
  }
  return ctx;
}

function subscribeToConsent(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("mch-consent-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("mch-consent-change", callback);
    window.removeEventListener("storage", callback);
  };
}

function getConsentSnapshot(): ConsentStatus {
  return getStoredConsent().status;
}

function getServerConsentSnapshot(): ConsentStatus {
  return "unknown";
}

export default function AnalyticsProvider({ children }: { children: ReactNode }) {
  const consentStatus = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot
  );

  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse campaign params if accepted
  useEffect(() => {
    if (consentStatus === "accepted" && searchParams) {
      parseAndRecordCampaign(searchParams);
    }
  }, [consentStatus, searchParams]);

  // Track page view on route transition if consented
  useEffect(() => {
    if (consentStatus === "accepted" && pathname) {
      const routeKey = pathToCanonicalRouteKey(pathname);
      const deviceClass = typeof navigator !== "undefined"
        ? toDeviceClass(navigator.userAgent)
        : "desktop";

      trackAnalyticsEvent(
        "page_view",
        {
          route_key: routeKey,
          device_class: deviceClass,
        },
        routeKey
      );
    }
  }, [consentStatus, pathname]);

  const acceptConsent = useCallback(() => {
    setStoredConsent("accepted");
    setIsPreferencesOpen(false);

    // Initial page view after accepting
    if (pathname) {
      const routeKey = pathToCanonicalRouteKey(pathname);
      const deviceClass = typeof navigator !== "undefined"
        ? toDeviceClass(navigator.userAgent)
        : "desktop";

      trackAnalyticsEvent(
        "page_view",
        {
          route_key: routeKey,
          device_class: deviceClass,
        },
        routeKey
      );
    }
  }, [pathname]);

  const declineConsent = useCallback(() => {
    setStoredConsent("declined");
    setIsPreferencesOpen(false);
  }, []);

  const withdrawConsent = useCallback(() => {
    setStoredConsent("withdrawn");
    setIsPreferencesOpen(false);
  }, []);

  return (
    <AnalyticsContext.Provider
      value={{
        consentStatus,
        isPreferencesOpen,
        openPreferences: () => setIsPreferencesOpen(true),
        closePreferences: () => setIsPreferencesOpen(false),
        acceptConsent,
        declineConsent,
        withdrawConsent,
      }}
    >
      {children}
      {consentStatus === "unknown" && <ConsentBanner />}
      {isPreferencesOpen && <ConsentPreferencesModal />}
    </AnalyticsContext.Provider>
  );
}
