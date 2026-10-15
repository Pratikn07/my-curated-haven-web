import { ReactNode, Suspense } from "react";
import SiteFrame from "@/components/layout/SiteFrame";
import AnalyticsProvider from "@/components/analytics/AnalyticsProvider";
import CampaignCapture from "@/components/analytics/CampaignCapture";
import ClickTracker from "@/components/analytics/ClickTracker";
import PageEngagementTracker from "@/components/analytics/PageEngagementTracker";
import ViewTracker from "@/components/analytics/ViewTracker";
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
        <ClickTracker />
        <PageEngagementTracker />
        <ViewTracker />
      </AnalyticsProvider>
    </>
  );
}
