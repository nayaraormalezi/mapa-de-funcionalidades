"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticated, requireCanEdit } from "@/lib/auth";
import { roleCan } from "@/lib/permissions";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";

export type ActionResult = {
  ok: boolean;
  message: string;
  id?: string;
};

export type FeatureCommentDTO = {
  id: string;
  featureId: string;
  userId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
};

function newCommentId() {
  return `cmt-${crypto.randomUUID().slice(0, 8)}`;
}

function demoBlocked(): ActionResult {
  return {
    ok: false,
    message:
      "Modo demonstração: comentários não são gravados. Ative o modo LIVE para persistir.",
  };
}

/**
 * Lista comentários de uma Feature.
 * Contagem = principais + respostas (todos os registros retornados).
 */
export async function listFeatureComments(
  featureId: string,
): Promise<{ ok: true; comments: FeatureCommentDTO[] } | ActionResult> {
  const gated = await requireAuthenticated();
  if (!gated.ok) return gated;

  if (!isSupabaseEnabled()) {
    return { ok: true, comments: [] };
  }

  const id = String(featureId ?? "").trim();
  if (!id) return { ok: false, message: "Funcionalidade inválida." };

  const supabase = await createClient();
  const { data: feature, error: featureError } = await supabase
    .from("features")
    .select("id")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();

  if (featureError) return { ok: false, message: featureError.message };
  if (!feature) return { ok: false, message: "Funcionalidade não encontrada." };

  const { data, error } = await supabase
    .from("feature_comments")
    .select(
      "id, feature_id, user_id, parent_comment_id, content, created_at, updated_at",
    )
    .eq("feature_id", id)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, message: error.message };

  const userIds = Array.from(
    new Set((data ?? []).map((row) => String(row.user_id))),
  );
  const nameByUser = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      nameByUser.set(
        String(p.id),
        String(p.full_name ?? "").trim() || "Usuário",
      );
    }
  }

  const comments: FeatureCommentDTO[] = (data ?? []).map((row) => ({
    id: String(row.id),
    featureId: String(row.feature_id),
    userId: String(row.user_id),
    parentCommentId: row.parent_comment_id
      ? String(row.parent_comment_id)
      : null,
    content: String(row.content ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    authorName: nameByUser.get(String(row.user_id)) ?? "Usuário",
  }));

  return { ok: true, comments };
}

/**
 * Cria comentário principal ou resposta.
 * Se parent for uma resposta, a nova resposta vincula-se ao comentário raiz.
 */
export async function createFeatureComment(input: {
  featureId: string;
  content: string;
  parentCommentId?: string | null;
}): Promise<ActionResult> {
  const gated = await requireAuthenticated();
  if (!gated.ok) return gated;
  if (!roleCan(gated.auth.role, "comment.create")) {
    return { ok: false, message: "Permissão insuficiente para comentar." };
  }
  if (!isSupabaseEnabled()) return demoBlocked();

  const featureId = String(input.featureId ?? "").trim();
  const content = String(input.content ?? "").trim();
  const parentRaw = String(input.parentCommentId ?? "").trim() || null;

  if (!featureId) return { ok: false, message: "Funcionalidade inválida." };
  if (!content) return { ok: false, message: "Escreva um comentário." };
  if (content.length > 4000) {
    return { ok: false, message: "Comentário muito longo (máx. 4000 caracteres)." };
  }

  const userId = gated.auth.userId!;
  const supabase = await createClient();

  const { data: feature, error: featureError } = await supabase
    .from("features")
    .select("id")
    .eq("id", featureId)
    .eq("active", true)
    .maybeSingle();
  if (featureError) return { ok: false, message: featureError.message };
  if (!feature) return { ok: false, message: "Funcionalidade não encontrada." };

  let parentCommentId: string | null = null;
  if (parentRaw) {
    const { data: parent, error: parentError } = await supabase
      .from("feature_comments")
      .select("id, feature_id, parent_comment_id")
      .eq("id", parentRaw)
      .maybeSingle();
    if (parentError) return { ok: false, message: parentError.message };
    if (!parent || String(parent.feature_id) !== featureId) {
      return { ok: false, message: "Comentário pai não encontrado." };
    }
    // Um nível: respostas a respostas vinculam-se ao principal.
    parentCommentId = parent.parent_comment_id
      ? String(parent.parent_comment_id)
      : String(parent.id);
  }

  const id = newCommentId();
  const { error } = await supabase.from("feature_comments").insert({
    id,
    feature_id: featureId,
    user_id: userId,
    parent_comment_id: parentCommentId,
    content,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/funcionalidades/${featureId}`);
  return { ok: true, message: "Comentário publicado.", id };
}

/** Exclui comentário (e respostas em cascade). Admin/Editor apenas. */
export async function deleteFeatureComment(
  commentId: string,
): Promise<ActionResult> {
  const gated = await requireCanEdit();
  if (!gated.ok) {
    return {
      ok: false,
      message:
        "Permissão insuficiente. Visualizadores não podem excluir comentários.",
    };
  }
  if (!roleCan(gated.auth.role, "comment.delete")) {
    return {
      ok: false,
      message:
        "Permissão insuficiente. Visualizadores não podem excluir comentários.",
    };
  }
  if (!isSupabaseEnabled()) return demoBlocked();

  const id = String(commentId ?? "").trim();
  if (!id) return { ok: false, message: "Comentário inválido." };

  const supabase = await createClient();
  const { data: existing, error: findError } = await supabase
    .from("feature_comments")
    .select("id, feature_id")
    .eq("id", id)
    .maybeSingle();

  if (findError) return { ok: false, message: findError.message };
  if (!existing) return { ok: false, message: "Comentário não encontrado." };

  const { error } = await supabase
    .from("feature_comments")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/funcionalidades/${existing.feature_id}`);
  return { ok: true, message: "Comentário excluído." };
}
