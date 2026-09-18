import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";
import { isMasterAdminEmail } from "@/lib/master-admin";
import { roleCanAdmin, roleCanEdit } from "@/lib/permissions";
import type { UserProfile, UserRole } from "@/types";

export type AuthState = {
  userId: string | null;
  email: string | null;
  profile: UserProfile | null;
  role: UserRole;
  /** Editor ou Admin — ações operacionais. */
  canEdit: boolean;
  /** Somente Admin — taxonomias, usuários, cadastros. */
  canAdmin: boolean;
  /** Alias de canAdmin (legado). Preferir canAdmin em UI nova. */
  isAdmin: boolean;
  isMasterAdmin: boolean;
};

const viewerFallback: AuthState = {
  userId: null,
  email: null,
  profile: null,
  role: "viewer",
  canEdit: false,
  canAdmin: false,
  isAdmin: false,
  isMasterAdmin: false,
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

function withRoleFlags(
  base: Omit<
    AuthState,
    "canEdit" | "canAdmin" | "isAdmin" | "isMasterAdmin" | "role"
  > & {
    role: UserRole;
  },
): AuthState {
  const master = isMasterAdminEmail(base.email);
  const role: UserRole = master ? "admin" : base.role;
  const canAdmin = roleCanAdmin(role);
  return {
    ...base,
    role,
    canEdit: roleCanEdit(role),
    canAdmin,
    isAdmin: canAdmin,
    isMasterAdmin: master,
  };
}

/** When Supabase is off (DEMO), treat session as local master admin for UX. */
export async function getAuthState(): Promise<AuthState> {
  if (!isSupabaseEnabled()) {
    return withRoleFlags({
      userId: "demo-local",
      email: "nayara.melo@caixaconsorcio.com.br",
      profile: {
        id: "demo-local",
        email: "nayara.melo@caixaconsorcio.com.br",
        fullName: "Nayara Melo",
        role: "admin",
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      role: "admin",
    });
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

  const email = data?.email || user.email || null;

  if (!data) {
    return withRoleFlags({
      userId: user.id,
      email,
      profile: null,
      role: isMasterAdminEmail(email) ? "admin" : "viewer",
    });
  }

  const profile = mapProfile(data);
  const role = profile.active ? profile.role : "viewer";

  return withRoleFlags({
    userId: user.id,
    email: profile.email || user.email || null,
    profile,
    role,
  });
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

export async function requireMasterAdmin(): Promise<
  { ok: true; auth: AuthState } | { ok: false; message: string }
> {
  const auth = await getAuthState();
  if (!auth.isMasterAdmin) {
    return {
      ok: false,
      message:
        "Permissão insuficiente. Apenas o administrador master pode executar esta ação.",
    };
  }
  return { ok: true, auth };
}

export async function listProfiles(): Promise<UserProfile[]> {
  const gate = await requireAdmin();
  if (!gate.ok) return [];

  if (!isSupabaseEnabled()) {
    return [
      gate.auth.profile!,
      {
        id: "demo-editor",
        email: "editor@caixaconsorcio.com.br",
        fullName: "Editor Demo",
        role: "editor",
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "demo-viewer",
        email: "viewer@caixaconsorcio.com.br",
        fullName: "Viewer Demo",
        role: "viewer",
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error || !data) {
    console.error("[profiles:list]", error?.message);
    return [];
  }

  return data.map(mapProfile);
}
