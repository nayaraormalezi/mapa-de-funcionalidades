import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

function getServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    null
  );
}

export function isAdminClientConfigured() {
  return Boolean(getSupabaseUrl() && getServiceRoleKey());
}

/**
 * Server-only Supabase client with elevated privileges.
 * Never import this into client components.
 */
export function createAdminClient() {
  const key = getServiceRoleKey();
  if (!getSupabaseUrl() || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione a service_role key do projeto no ambiente do servidor.",
    );
  }

  return createSupabaseClient(getSupabaseUrl(), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
