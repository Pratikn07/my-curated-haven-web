import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { sanitizeReturnTo } from "@/lib/auth/redirects";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to save recipes and manage your toddler recipe collection.",
  robots: {
    index: false,
    follow: false,
  },
};

interface SignInPageProps {
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { returnTo } = await searchParams;
  const user = await getCurrentUser();

  if (user) {
    redirect(sanitizeReturnTo(returnTo));
  }

  return (
    <div className="flex min-h-[calc(100vh-16rem)] w-full items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <SignInForm returnTo={returnTo} />
    </div>
  );
}
