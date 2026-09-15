import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";
import type { UserProfile, UserRole } from "@/types";

export type AuthState = {
  userId: string | null;
  email: string | null;
  profile: UserProfile | null;
  role: UserRole;
  canEdit: boolean;
  isAdmin: boolean;
};

const viewerFallback: AuthState = {
  userId: null,
  email: null,
  profile: null,
  role: "viewer",
  canEdit: false,
  isAdmin: false,
};

function mapProfile(row: {
  id: string;
  email: string;
  full_name: string;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role as UserRole,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** When Supabase is off (DEMO), treat session as local admin for UX. */
export async function getAuthState(): Promise<AuthState> {
  if (!isSupabaseEnabled()) {
    return {
      userId: "demo-local",
      email: "demo@local",
      profile: {
        id: "demo-local",
        email: "demo@local",
        fullName: "Usuário DEMO",
        role: "admin",
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      role: "admin",
      canEdit: true,
      isAdmin: true,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return viewerFallback;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    return {
      userId: user.id,
      email: user.email ?? null,
      profile: null,
      role: "viewer",
      canEdit: false,
      isAdmin: false,
    };
  }

  const profile = mapProfile(data);
  const role = profile.active ? profile.role : "viewer";

  return {
    userId: user.id,
    email: profile.email || user.email || null,
    profile,
    role,
    canEdit: role === "admin" || role === "editor",
    isAdmin: role === "admin",
  };
}

export async function requireCanEdit(): Promise<
  { ok: true; auth: AuthState } | { ok: false; message: string }
> {
  const auth = await getAuthState();
  if (!auth.canEdit) {
    return {
      ok: false,
      message: "Permissão insuficiente. Apenas Admin ou Editor podem alterar dados.",
    };
  }
  return { ok: true, auth };
}

export async function requireAdmin(): Promise<
  { ok: true; auth: AuthState } | { ok: false; message: string }
> {
  const auth = await getAuthState();
  if (!auth.isAdmin) {
    return {
      ok: false,
      message: "Permissão insuficiente. Apenas Admin pode executar esta ação.",
    };
  }
  return { ok: true, auth };
}
