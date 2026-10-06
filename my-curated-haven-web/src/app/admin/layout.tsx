import { getAdminContext } from "@/lib/admin/context";
import AdminShell from "@/components/admin/AdminShell";
import AdminMfa from "@/components/admin/AdminMfa";
import AdminPrivacyBoundary from "@/components/analytics/AdminPrivacyBoundary";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (process.env.ADMIN_CONSOLE_ENABLED === "false") {
    redirect("/sign-in?returnTo=%2Fadmin%2Frecipes");
  }
  const context = await getAdminContext();
  if (!context.ok) {
    if (context.code === "AUTH_REQUIRED") redirect("/sign-in?returnTo=%2Fadmin%2Frecipes");
    return (
      <div>
        <h1>Admin unavailable</h1>
        <p role="status">Admin context unavailable ({context.code}). Try again.</p>
      </div>
    );
  }
  if (context.value.assurance !== "aal2") {
    return <AdminMfa onVerified={() => {}} />;
  }
  return (
    <AdminPrivacyBoundary>
      <AdminShell context={context.value}>{children}</AdminShell>
    </AdminPrivacyBoundary>
  );
}
