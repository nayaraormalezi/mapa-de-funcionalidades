"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticated, requireCanEdit } from "@/lib/auth";
import {
  isDuplicateManualResponsible,
  joinResponsibleDisplayNames,
  validateWorkResponsibleInput,
} from "@/lib/work-responsibles";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";
import { invalidateDatabaseCache } from "@/services/db";
import type { WorkResponsible } from "@/types";

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

type OwnerKind = "FCC" | "EVOLUTION";

function revalidateOwner(owner: {
  kind: OwnerKind;
  featureId?: string | null;
}) {
  invalidateDatabaseCache();
  revalidatePath("/", "layout");
  revalidatePath("/roadmap");
  revalidatePath("/mapa");
  if (owner.featureId) {
    revalidatePath(`/funcionalidades/${owner.featureId}`);
  }
}

function newId(prefix: "fcr" | "evr") {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function mapRow(
  ownerKind: OwnerKind,
  ownerId: string,
  row: {
    id: string;
    user_id: string | null;
    responsible_name: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    profiles?:
      | { full_name?: string | null; email?: string | null }
      | { full_name?: string | null; email?: string | null }[]
      | null;
  },
): WorkResponsible {
  const isRegistered = Boolean(row.user_id);
  const profileJoin = Array.isArray(row.profiles)
    ? row.profiles[0]
    : row.profiles;
  const fullName = profileJoin?.full_name?.trim() || null;
  const email = profileJoin?.email?.trim() || null;
  const manualName = row.responsible_name?.trim() || null;
  return {
    id: row.id,
    ownerKind,
    ownerId,
    kind: isRegistered ? "REGISTERED_USER" : "MANUAL",
    userId: row.user_id,
    responsibleName: isRegistered ? null : manualName,
    displayName: isRegistered
      ? fullName || email || "Usuário"
      : manualName || "Responsável",
    email: isRegistered ? email : null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const FCC_SELECT =
  "id, feature_channel_context_id, user_id, responsible_name, created_by, created_at, updated_at, profiles!feature_channel_context_responsibles_user_id_fkey(full_name, email)";

const EVO_SELECT =
  "id, feature_evolution_id, user_id, responsible_name, created_by, created_at, updated_at, profiles!feature_evolution_responsibles_user_id_fkey(full_name, email)";

async function syncFccResponsibleText(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fccId: string,
) {
  const { data } = await supabase
    .from("feature_channel_context_responsibles")
    .select(
      "user_id, responsible_name, profiles!feature_channel_context_responsibles_user_id_fkey(full_name, email)",
    )
    .eq("feature_channel_context_id", fccId)
    .order("created_at", { ascending: true });

  const names = (data ?? []).map((row) => {
    if (row.user_id) {
      const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return (
        (p as { full_name?: string | null; email?: string | null } | null)
          ?.full_name?.trim() ||
        (p as { full_name?: string | null; email?: string | null } | null)
          ?.email?.trim() ||
        "Usuário"
      );
    }
    return String(row.responsible_name ?? "").trim() || "Responsável";
  });

  await supabase
    .from("feature_channel_contexts")
    .update({
      responsible: joinResponsibleDisplayNames(names),
      updated_at: new Date().toISOString(),
    })
    .eq("id", fccId);
}

async function syncEvolutionResponsibleText(
  supabase: Awaited<ReturnType<typeof createClient>>,
  evolutionId: string,
) {
  const { data } = await supabase
    .from("feature_evolution_responsibles")
    .select(
      "user_id, responsible_name, profiles!feature_evolution_responsibles_user_id_fkey(full_name, email)",
    )
    .eq("feature_evolution_id", evolutionId)
    .order("created_at", { ascending: true });

  const names = (data ?? []).map((row) => {
    if (row.user_id) {
      const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return (
        (p as { full_name?: string | null; email?: string | null } | null)
          ?.full_name?.trim() ||
        (p as { full_name?: string | null; email?: string | null } | null)
          ?.email?.trim() ||
        "Usuário"
      );
    }
    return String(row.responsible_name ?? "").trim() || "Responsável";
  });

  await supabase
    .from("feature_evolutions")
    .update({
      responsible: joinResponsibleDisplayNames(names),
      updated_at: new Date().toISOString(),
    })
    .eq("id", evolutionId);
}

async function resolveFeatureIdForFcc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fccId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("feature_channel_contexts")
    .select("feature_id")
    .eq("id", fccId)
    .maybeSingle();
  return data?.feature_id ? String(data.feature_id) : null;
}

async function resolveFeatureIdForEvolution(
  supabase: Awaited<ReturnType<typeof createClient>>,
  evolutionId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("feature_evolutions")
    .select("feature_channel_context_id")
    .eq("id", evolutionId)
    .maybeSingle();
  if (!data?.feature_channel_context_id) return null;
  return resolveFeatureIdForFcc(
    supabase,
    String(data.feature_channel_context_id),
  );
}

/** Autocomplete de usuários cadastrados (leitura autenticada). */
export async function searchWorkResponsibleUsers(
  query: string,
): Promise<{ ok: true; users: ProfileSearchHit[] } | ActionResult> {
  const gated = await requireAuthenticated();
  if (!gated.ok) return gated;

  const q = String(query ?? "").trim();
  if (q.length < 1) return { ok: true, users: [] };

  if (!isSupabaseEnabled()) {
    return { ok: true, users: [] };
  }

  const supabase = await createClient();
  const pattern = `%${q.replace(/%/g, "\\%")}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("active", true)
    .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
    .order("full_name", { ascending: true })
    .limit(12);

  if (error) return { ok: false, message: error.message };

  return {
    ok: true,
    users: (data ?? []).map((u) => ({
      id: String(u.id),
      fullName: String(u.full_name ?? "").trim() || String(u.email ?? ""),
      email: String(u.email ?? ""),
    })),
  };
}

export async function listFccResponsibles(
  featureChannelContextId: string,
): Promise<{ ok: true; responsibles: WorkResponsible[] } | ActionResult> {
  const gated = await requireAuthenticated();
  if (!gated.ok) return gated;

  const id = String(featureChannelContextId ?? "").trim();
  if (!id) return { ok: false, message: "Implementação inválida." };

  if (!isSupabaseEnabled()) return { ok: true, responsibles: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_channel_context_responsibles")
    .select(FCC_SELECT)
    .eq("feature_channel_context_id", id)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    responsibles: (data ?? []).map((row) =>
      mapRow("FCC", id, row as Parameters<typeof mapRow>[2]),
    ),
  };
}

export async function listEvolutionResponsibles(
  featureEvolutionId: string,
): Promise<{ ok: true; responsibles: WorkResponsible[] } | ActionResult> {
  const gated = await requireAuthenticated();
  if (!gated.ok) return gated;

  const id = String(featureEvolutionId ?? "").trim();
  if (!id) return { ok: false, message: "Evolução inválida." };

  if (!isSupabaseEnabled()) return { ok: true, responsibles: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_evolution_responsibles")
    .select(EVO_SELECT)
    .eq("feature_evolution_id", id)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    responsibles: (data ?? []).map((row) =>
      mapRow("EVOLUTION", id, row as Parameters<typeof mapRow>[2]),
    ),
  };
}

export async function addFccResponsible(input: {
  featureChannelContextId: string;
  kind: "REGISTERED_USER" | "MANUAL";
  userId?: string;
  responsibleName?: string;
}): Promise<ActionResult & { responsible?: WorkResponsible }> {
  const blocked = await requireCanEdit();
  if (!blocked.ok) return { ok: false, message: blocked.message };

  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message: "Modo demonstração: alterações não são gravadas.",
    };
  }

  const fccId = String(input.featureChannelContextId ?? "").trim();
  if (!fccId) return { ok: false, message: "Implementação inválida." };

  const validated = validateWorkResponsibleInput(input);
  if (!validated.ok) return { ok: false, message: validated.message };

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("feature_channel_context_responsibles")
    .select("id, user_id, responsible_name")
    .eq("feature_channel_context_id", fccId);

  if (existingError) return { ok: false, message: existingError.message };

  if (validated.kind === "REGISTERED_USER") {
    if ((existing ?? []).some((r) => r.user_id === validated.userId)) {
      return { ok: false, message: "Este usuário já é responsável." };
    }
  } else {
    const names = (existing ?? [])
      .filter((r) => !r.user_id && r.responsible_name)
      .map((r) => String(r.responsible_name));
    if (
      isDuplicateManualResponsible(names, validated.responsibleName ?? "")
    ) {
      return { ok: false, message: "Este responsável já está na lista." };
    }
  }

  const id = newId("fcr");
  const { error } = await supabase
    .from("feature_channel_context_responsibles")
    .insert({
      id,
      feature_channel_context_id: fccId,
      user_id: validated.userId,
      responsible_name: validated.responsibleName,
      created_by: blocked.auth.userId,
    });

  if (error) return { ok: false, message: error.message };

  await syncFccResponsibleText(supabase, fccId);
  const featureId = await resolveFeatureIdForFcc(supabase, fccId);
  revalidateOwner({ kind: "FCC", featureId });

  const listed = await listFccResponsibles(fccId);
  const responsible =
    listed.ok && "responsibles" in listed
      ? listed.responsibles.find((r) => r.id === id)
      : undefined;

  return {
    ok: true,
    message: "Responsável adicionado.",
    id,
    responsible,
  };
}

export async function removeFccResponsible(input: {
  id: string;
  featureChannelContextId: string;
}): Promise<ActionResult> {
  const blocked = await requireCanEdit();
  if (!blocked.ok) return { ok: false, message: blocked.message };

  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message: "Modo demonstração: alterações não são gravadas.",
    };
  }

  const id = String(input.id ?? "").trim();
  const fccId = String(input.featureChannelContextId ?? "").trim();
  if (!id || !fccId) return { ok: false, message: "Dados inválidos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("feature_channel_context_responsibles")
    .delete()
    .eq("id", id)
    .eq("feature_channel_context_id", fccId);

  if (error) return { ok: false, message: error.message };

  await syncFccResponsibleText(supabase, fccId);
  const featureId = await resolveFeatureIdForFcc(supabase, fccId);
  revalidateOwner({ kind: "FCC", featureId });

  return { ok: true, message: "Responsável removido." };
}

export async function addEvolutionResponsible(input: {
  featureEvolutionId: string;
  kind: "REGISTERED_USER" | "MANUAL";
  userId?: string;
  responsibleName?: string;
}): Promise<ActionResult & { responsible?: WorkResponsible }> {
  const blocked = await requireCanEdit();
  if (!blocked.ok) return { ok: false, message: blocked.message };

  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message: "Modo demonstração: alterações não são gravadas.",
    };
  }

  const evoId = String(input.featureEvolutionId ?? "").trim();
  if (!evoId) return { ok: false, message: "Evolução inválida." };

  const validated = validateWorkResponsibleInput(input);
  if (!validated.ok) return { ok: false, message: validated.message };

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("feature_evolution_responsibles")
    .select("id, user_id, responsible_name")
    .eq("feature_evolution_id", evoId);

  if (existingError) return { ok: false, message: existingError.message };

  if (validated.kind === "REGISTERED_USER") {
    if ((existing ?? []).some((r) => r.user_id === validated.userId)) {
      return { ok: false, message: "Este usuário já é responsável." };
    }
  } else {
    const names = (existing ?? [])
      .filter((r) => !r.user_id && r.responsible_name)
      .map((r) => String(r.responsible_name));
    if (
      isDuplicateManualResponsible(names, validated.responsibleName ?? "")
    ) {
      return { ok: false, message: "Este responsável já está na lista." };
    }
  }

  const id = newId("evr");
  const { error } = await supabase
    .from("feature_evolution_responsibles")
    .insert({
      id,
      feature_evolution_id: evoId,
      user_id: validated.userId,
      responsible_name: validated.responsibleName,
      created_by: blocked.auth.userId,
    });

  if (error) return { ok: false, message: error.message };

  await syncEvolutionResponsibleText(supabase, evoId);
  const featureId = await resolveFeatureIdForEvolution(supabase, evoId);
  revalidateOwner({ kind: "EVOLUTION", featureId });

  const listed = await listEvolutionResponsibles(evoId);
  const responsible =
    listed.ok && "responsibles" in listed
      ? listed.responsibles.find((r) => r.id === id)
      : undefined;

  return {
    ok: true,
    message: "Responsável adicionado.",
    id,
    responsible,
  };
}

export async function removeEvolutionResponsible(input: {
  id: string;
  featureEvolutionId: string;
}): Promise<ActionResult> {
  const blocked = await requireCanEdit();
  if (!blocked.ok) return { ok: false, message: blocked.message };

  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message: "Modo demonstração: alterações não são gravadas.",
    };
  }

  const id = String(input.id ?? "").trim();
  const evoId = String(input.featureEvolutionId ?? "").trim();
  if (!id || !evoId) return { ok: false, message: "Dados inválidos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("feature_evolution_responsibles")
    .delete()
    .eq("id", id)
    .eq("feature_evolution_id", evoId);

  if (error) return { ok: false, message: error.message };

  await syncEvolutionResponsibleText(supabase, evoId);
  const featureId = await resolveFeatureIdForEvolution(supabase, evoId);
  revalidateOwner({ kind: "EVOLUTION", featureId });

  return { ok: true, message: "Responsável removido." };
}
