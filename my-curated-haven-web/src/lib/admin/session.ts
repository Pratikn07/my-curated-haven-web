import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isRecipeAdmin } from "./recipes";

export type AdminSession =
  | { status: "admin"; supabase: Awaited<ReturnType<typeof createClient>>; user: User }
  | { status: "signed_out" }
  | { status: "not_admin" };

/**
 * The signed-in user and their admin status, checked against the database
 * once per request. The database functions check again on every call, so this
 * only decides what to show.
 */
export const getAdminSession = cache(async (): Promise<AdminSession> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { status: "signed_out" };

  return (await isRecipeAdmin(supabase))
    ? { status: "admin", supabase, user }
    : { status: "not_admin" };
});

/** For admin pages: send signed-out visitors to sign in, and show 404 to everyone else who isn't an admin. */
export async function requireAdminPage(returnTo: string) {
  const session = await getAdminSession();
  if (session.status === "signed_out") {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }
  if (session.status === "not_admin") notFound();
  return session;
}
