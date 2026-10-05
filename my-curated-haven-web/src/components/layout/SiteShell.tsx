import { ReactNode, Suspense } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import AnalyticsProvider from "@/components/analytics/AnalyticsProvider";
import CampaignCapture from "@/components/analytics/CampaignCapture";
import SignInCompletionTracker from "@/components/auth/SignInCompletionTracker";
import { footerLinks, headerLinks, linksFor } from "@/config/site-navigation";
import { hasShowroomCollections } from "@/lib/collections/visibility";

export default function SiteShell({ children }: { children: ReactNode }) {
  const showCollections = hasShowroomCollections();
  return (
    <>
      {/* First focus stop on every page. */}
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AnalyticsProvider>
        <div className="flex min-h-screen flex-col">
          <Navbar links={linksFor(headerLinks, showCollections)} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer links={linksFor(footerLinks, showCollections)} />
        </div>
        <Suspense fallback={null}>
          <CampaignCapture />
        </Suspense>
        <SignInCompletionTracker />
      </AnalyticsProvider>
    </>
  );
}
