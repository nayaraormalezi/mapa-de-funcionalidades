import { getDataMode } from "@/lib/data-mode";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** true quando DataMode === LIVE (env explícito + credenciais). */
export function isSupabaseEnabled() {
  return getDataMode() === "LIVE";
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

function getSupabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

/**
 * Cookie-free anon client — only for non-authenticated tooling.
 * Prefer createClient() for app reads/writes under RLS.
 */
export function createDataClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Cookie-aware client for authenticated SSR and server actions. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies — proxy refreshes the session.
        }
      },
    },
  });
}
