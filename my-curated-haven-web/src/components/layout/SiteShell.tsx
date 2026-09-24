import { ReactNode, Suspense } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import AnalyticsProvider from "@/components/analytics/AnalyticsProvider";

export default function SiteShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AnalyticsProvider>
        <div className="flex min-h-screen flex-col">
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </AnalyticsProvider>
    </Suspense>
  );
}
