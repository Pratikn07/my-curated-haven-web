import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "../types/database";
import { getSupabasePublicConfig } from "./env";

export async function updateSession(request: NextRequest) {
  const passthrough = NextResponse.next({ request });

  try {
    return await refreshSession(request, passthrough);
  } catch {
    return { supabaseResponse: passthrough, user: null };
  }
}

async function refreshSession(request: NextRequest, passthrough: NextResponse) {
  const config = getSupabasePublicConfig();
  if (!config) {
    return { supabaseResponse: passthrough, user: null };
  }

  let supabaseResponse = passthrough;
  const { url: supabaseUrl, key: supabaseAnonKey } = config;

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() validates the auth token against Supabase Auth authority, avoiding unverified session claims
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
