import { ReactNode, Suspense } from "react";
import SiteFrame from "@/components/layout/SiteFrame";
import AnalyticsProvider from "@/components/analytics/AnalyticsProvider";
import CampaignCapture from "@/components/analytics/CampaignCapture";
import SignInCompletionTracker from "@/components/auth/SignInCompletionTracker";
import { footerLinks, headerLinks, linksFor } from "@/config/site-navigation";
import { hasShowroomCollections } from "@/lib/collections/visibility";

export default function SiteShell({ children }: { children: ReactNode }) {
  const showCollections = hasShowroomCollections();
  return (
    <>
      <AnalyticsProvider>
        <SiteFrame
          headerLinks={linksFor(headerLinks, showCollections)}
          footerLinks={linksFor(footerLinks, showCollections)}
        >{children}</SiteFrame>
        <Suspense fallback={null}>
          <CampaignCapture />
        </Suspense>
        <SignInCompletionTracker />
      </AnalyticsProvider>
    </>
  );
}
