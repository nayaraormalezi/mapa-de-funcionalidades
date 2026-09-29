"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticated, requireCanEdit } from "@/lib/auth";
import {
  validateFeatureUserProfileInput,
} from "@/lib/feature-user-profiles";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";
import { invalidateDatabaseCache } from "@/services/db";
import type { FeatureUserProfile } from "@/types";

export type ActionResult = {
  ok: boolean;
  message: string;
  id?: string;
};

export type ProfileSearchHit = {
  id: string;
  fullName: string;
  email: string;
};

function revalidateFeature(featureId: string) {
  invalidateDatabaseCache();
  revalidatePath("/", "layout");
  revalidatePath(`/funcionalidades/${featureId}`);
  revalidatePath("/mapa");
}

function newId() {
  return `fup-${crypto.randomUUID().slice(0, 8)}`;
}

function mapRow(row: {
  id: string;
  feature_id: string;
  user_id: string | null;
  profile_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
}): FeatureUserProfile {
  const isRegistered = Boolean(row.user_id);
  const fullName = row.profiles?.full_name?.trim() || null;
  const email = row.profiles?.email?.trim() || null;
  const manualName = row.profile_name?.trim() || null;
  return {
    id: row.id,
    featureId: row.feature_id,
    kind: isRegistered ? "REGISTERED_USER" : "MANUAL_PROFILE",
    userId: row.user_id,
    profileName: isRegistered ? null : manualName,
    displayName: isRegistered
      ? fullName || email || "Usuário"
      : manualName || "Perfil",
    email: isRegistered ? email : null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Lista perfis de usuário de uma Feature (leitura — autenticado). */
export async function listFeatureUserProfiles(
  featureId: string,
): Promise<{ ok: true; profiles: FeatureUserProfile[] } | ActionResult> {
  const gated = await requireAuthenticated();
  if (!gated.ok) return gated;

  const id = String(featureId ?? "").trim();
  if (!id) return { ok: false, message: "Funcionalidade inválida." };

  if (!isSupabaseEnabled()) {
    return { ok: true, profiles: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_user_profiles")
    .select(
      "id, feature_id, user_id, profile_name, created_by, created_at, updated_at, profiles(full_name, email)",
    )
    .eq("feature_id", id)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    profiles: (data ?? []).map((row) => mapRow(row as Parameters<typeof mapRow>[0])),
  };
}

/** Autocomplete de usuários cadastrados (qualquer autenticado que visualiza). */
export async function searchFeatureProfileUsers(
  query: string,
): Promise<{ ok: true; users: ProfileSearchHit[] } | ActionResult> {
  const gated = await requireAuthenticated();
  if (!gated.ok) return gated;

  const q = String(query ?? "").trim();

  if (!isSupabaseEnabled()) {
    const demo: ProfileSearchHit[] = [
      {
        id: "demo-local",
        fullName: "Nayara Melo",
        email: "nayara.melo@caixaconsorcio.com.br",
      },
      {
        id: "demo-editor",
        fullName: "Editor Demo",
        email: "editor@caixaconsorcio.com.br",
      },
      {
        id: "demo-viewer",
        fullName: "Viewer Demo",
        email: "viewer@caixaconsorcio.com.br",
      },
    ].filter((u) => {
      if (!q) return true;
      const hay = `${u.fullName} ${u.email}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
    return { ok: true, users: demo.slice(0, 8) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_mentionable_profiles", {
    q,
    lim: 8,
  });

  if (error) return { ok: false, message: error.message };

  const users: ProfileSearchHit[] = (data ?? []).map(
    (u: { id: string; full_name: string; email: string }) => ({
      id: String(u.id),
      fullName: String(u.full_name ?? ""),
      email: String(u.email ?? ""),
    }),
  );
  return { ok: true, users };
}

/** Adiciona perfil (usuário cadastrado ou manual). Editor/Admin. */
export async function addFeatureUserProfile(input: {
  featureId: string;
  kind: "REGISTERED_USER" | "MANUAL_PROFILE";
  userId?: string;
  profileName?: string;
}): Promise<ActionResult> {
  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message:
        "Modo demonstração: alterações não são gravadas. Ative o Supabase para persistir.",
    };
  }

  const gate = await requireCanEdit();
  if (!gate.ok) return { ok: false, message: gate.message };

  const featureId = String(input.featureId ?? "").trim();
  if (!featureId) return { ok: false, message: "Funcionalidade inválida." };

  const validated = validateFeatureUserProfileInput({
    kind: input.kind,
    userId: input.userId,
    profileName: input.profileName,
  });
  if (!validated.ok) return validated;

  const supabase = await createClient();

  const { data: feature, error: featureError } = await supabase
    .from("features")
    .select("id")
    .eq("id", featureId)
    .eq("active", true)
    .maybeSingle();

  if (featureError || !feature) {
    return { ok: false, message: "Funcionalidade não encontrada." };
  }

  if (validated.kind === "REGISTERED_USER" && validated.userId) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", validated.userId)
      .eq("active", true)
      .maybeSingle();

    if (profileError || !profile) {
      return { ok: false, message: "Usuário cadastrado não encontrado." };
    }

    const { data: dup } = await supabase
      .from("feature_user_profiles")
      .select("id")
      .eq("feature_id", featureId)
      .eq("user_id", validated.userId)
      .maybeSingle();

    if (dup) {
      return {
        ok: false,
        message: "Este usuário já está associado a esta funcionalidade.",
      };
    }
  }

  if (validated.kind === "MANUAL_PROFILE" && validated.profileName) {
    const { data: existing } = await supabase
      .from("feature_user_profiles")
      .select("id, profile_name")
      .eq("feature_id", featureId)
      .is("user_id", null);

    const key = validated.profileName.trim().toLowerCase().replace(/\s+/g, " ");
    const dup = (existing ?? []).some(
      (row) =>
        String(row.profile_name ?? "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ") === key,
    );
    if (dup) {
      return {
        ok: false,
        message: "Este perfil manual já está associado a esta funcionalidade.",
      };
    }
  }

  const id = newId();
  const { error } = await supabase.from("feature_user_profiles").insert({
    id,
    feature_id: featureId,
    user_id: validated.userId,
    profile_name: validated.profileName,
    created_by: gate.auth.userId,
  });

  if (error) {
    if (/unique|duplicate/i.test(error.message)) {
      return {
        ok: false,
        message: "Este perfil já está associado a esta funcionalidade.",
      };
    }
    return { ok: false, message: error.message };
  }

  revalidateFeature(featureId);
  return { ok: true, message: "Perfil adicionado.", id };
}

/** Remove perfil da Feature. Editor/Admin. */
export async function removeFeatureUserProfile(input: {
  id: string;
  featureId: string;
}): Promise<ActionResult> {
  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message:
        "Modo demonstração: alterações não são gravadas. Ative o Supabase para persistir.",
    };
  }

  const gate = await requireCanEdit();
  if (!gate.ok) return { ok: false, message: gate.message };

  const id = String(input.id ?? "").trim();
  const featureId = String(input.featureId ?? "").trim();
  if (!id || !featureId) {
    return { ok: false, message: "Dados inválidos para remoção." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("feature_user_profiles")
    .delete()
    .eq("id", id)
    .eq("feature_id", featureId);

  if (error) return { ok: false, message: error.message };

  revalidateFeature(featureId);
  return { ok: true, message: "Perfil removido." };
}
