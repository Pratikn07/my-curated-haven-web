"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function signOutAction() {
  const supabase = await createClient();
  // Local sign-out scope preserves native sessions on shared auth project
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/recipes");
}
