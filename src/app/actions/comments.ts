"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticated, requireCanEdit } from "@/lib/auth";
import { retainMentionsInContent } from "@/lib/comment-mentions";
import {
  canViewInternalComments,
  mentionAllowedRoles,
  normalizeCommentVisibility,
  resolveCreateVisibility,
  type CommentVisibility,
} from "@/lib/comment-visibility";
import { roleCan } from "@/lib/permissions";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export type ActionResult = {
  ok: boolean;
  message: string;
  id?: string;
};

export type CommentMentionDTO = {
  userId: string;
  fullName: string;
};

export type FeatureCommentDTO = {
  id: string;
  featureId: string;
  featureChannelContextId: string | null;
  userId: string;
  parentCommentId: string | null;
  content: string;
  visibility: CommentVisibility;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  mentions: CommentMentionDTO[];
};

export type MentionableUserDTO = {
  id: string;
  fullName: string;
  email: string;
};

function newCommentId() {
  return `cmt-${crypto.randomUUID().slice(0, 8)}`;
}

function newMentionId() {
  return `mcm-${crypto.randomUUID().slice(0, 8)}`;
}

function demoBlocked(): ActionResult {
  return {
    ok: false,
    message:
      "Modo demonstração: comentários não são gravados. Ative o modo LIVE para persistir.",
  };
}

function revalidateCommentSurfaces(featureId: string) {
  revalidatePath(`/funcionalidades/${featureId}`);
  revalidatePath("/roadmap");
  revalidatePath("/mapa");
}

async function resolveProfileNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[],
): Promise<Map<string, string>> {
  const nameByUser = new Map<string, string>();
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (!unique.length) return nameByUser;

  const { data, error } = await supabase.rpc("resolve_profile_public_names", {
    ids: unique,
  });

  if (!error && Array.isArray(data)) {
    for (const row of data as Array<{ id: string; full_name: string }>) {
      nameByUser.set(
        String(row.id),
        String(row.full_name ?? "").trim() || "Usuário",
      );
    }
    return nameByUser;
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", unique);
  for (const p of profiles ?? []) {
    nameByUser.set(
      String(p.id),
      String(p.full_name ?? "").trim() || "Usuário",
    );
  }
  return nameByUser;
}

/**
 * Lista comentários de uma Feature (fonte única para prévia e ficha).
 * Viewer: somente PUBLIC (filtro backend + RLS). Contagem = registros retornados.
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

  let query = supabase
    .from("feature_comments")
    .select(
      "id, feature_id, feature_channel_context_id, user_id, parent_comment_id, content, visibility, created_at, updated_at",
    )
    .eq("feature_id", id)
    .order("created_at", { ascending: false });

  // Defesa em profundidade além do RLS: viewer nunca recebe INTERNAL.
  if (!canViewInternalComments(gated.auth.role)) {
    query = query.eq("visibility", "PUBLIC");
  }

  const { data, error } = await query;
  if (error) return { ok: false, message: error.message };

  const commentIds = (data ?? []).map((row) => String(row.id));
  const mentionsByComment = new Map<string, Array<{ userId: string }>>();

  if (commentIds.length) {
    const { data: mentionRows } = await supabase
      .from("feature_comment_mentions")
      .select("comment_id, mentioned_user_id")
      .in("comment_id", commentIds);

    for (const row of mentionRows ?? []) {
      const cid = String(row.comment_id);
      const list = mentionsByComment.get(cid) ?? [];
      list.push({ userId: String(row.mentioned_user_id) });
      mentionsByComment.set(cid, list);
    }
  }

  const authorIds = (data ?? []).map((row) => String(row.user_id));
  const mentionedIds = Array.from(mentionsByComment.values()).flatMap((list) =>
    list.map((m) => m.userId),
  );
  const nameByUser = await resolveProfileNames(supabase, [
    ...authorIds,
    ...mentionedIds,
  ]);

  const comments: FeatureCommentDTO[] = (data ?? []).map((row) => {
    const cid = String(row.id);
    const rawMentions = mentionsByComment.get(cid) ?? [];
    const mentions: CommentMentionDTO[] = [];
    const seen = new Set<string>();
    for (const m of rawMentions) {
      if (seen.has(m.userId)) continue;
      seen.add(m.userId);
      mentions.push({
        userId: m.userId,
        fullName: nameByUser.get(m.userId) ?? "Usuário",
      });
    }
    return {
      id: cid,
      featureId: String(row.feature_id),
      featureChannelContextId: row.feature_channel_context_id
        ? String(row.feature_channel_context_id)
        : null,
      userId: String(row.user_id),
      parentCommentId: row.parent_comment_id
        ? String(row.parent_comment_id)
        : null,
      content: String(row.content ?? ""),
      visibility: normalizeCommentVisibility(row.visibility, "PUBLIC"),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      authorName: nameByUser.get(String(row.user_id)) ?? "Usuário",
      mentions,
    };
  });

  return { ok: true, comments };
}

/**
 * Busca usuários ativos para autocomplete de @.
 * visibility=INTERNAL → somente admin/editor.
 */
export async function searchMentionableUsers(
  query: string,
  visibility: CommentVisibility = "PUBLIC",
): Promise<{ ok: true; users: MentionableUserDTO[] } | ActionResult> {
  const gated = await requireAuthenticated();
  if (!gated.ok) return gated;
  if (!roleCan(gated.auth.role, "comment.create")) {
    return { ok: false, message: "Permissão insuficiente para mencionar." };
  }

  const vis = normalizeCommentVisibility(visibility, "PUBLIC");
  if (vis === "INTERNAL" && !canViewInternalComments(gated.auth.role)) {
    return {
      ok: false,
      message: "Permissão insuficiente para mencionar em comentário interno.",
    };
  }

  const q = String(query ?? "").trim();
  const roles = mentionAllowedRoles(vis);

  if (!isSupabaseEnabled()) {
    const demoAll: Array<MentionableUserDTO & { role: UserRole }> = [
      {
        id: "demo-local",
        fullName: "Nayara Melo",
        email: "nayara.melo@caixaconsorcio.com.br",
        role: "admin",
      },
      {
        id: "demo-editor",
        fullName: "Editor Demo",
        email: "editor@caixaconsorcio.com.br",
        role: "editor",
      },
      {
        id: "demo-viewer",
        fullName: "Viewer Demo",
        email: "viewer@caixaconsorcio.com.br",
        role: "viewer",
      },
    ];
    const demo = demoAll
      .filter((u) => !roles || roles.includes(u.role))
      .filter((u) => {
        if (!q) return true;
        const hay = `${u.fullName} ${u.email}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      })
      .map(({ id, fullName, email }) => ({ id, fullName, email }));
    return { ok: true, users: demo.slice(0, 8) };
  }

  const supabase = await createClient();
  const rpcArgs: {
    q: string;
    lim: number;
    allowed_roles?: UserRole[];
  } = { q, lim: 8 };
  // Omitir null: PostgREST/Supabase às vezes falha com text[] = null explícito.
  if (roles) rpcArgs.allowed_roles = roles;

  const { data, error } = await supabase.rpc(
    "search_mentionable_profiles",
    rpcArgs,
  );

  if (error) return { ok: false, message: error.message };

  const users: MentionableUserDTO[] = (data ?? []).map(
    (row: { id: string; full_name: string; email: string }) => ({
      id: String(row.id),
      fullName: String(row.full_name ?? "").trim() || "Usuário",
      email: String(row.email ?? ""),
    }),
  );

  return { ok: true, users };
}

/**
 * Cria comentário principal ou resposta.
 * Resposta herda visibility do pai. Viewer só PUBLIC.
 */
export async function createFeatureComment(input: {
  featureId: string;
  content: string;
  parentCommentId?: string | null;
  /** NULL/omit = comentário geral da Feature; preenchido = implementação (FCC). */
  featureChannelContextId?: string | null;
  mentionedUserIds?: string[];
  visibility?: CommentVisibility;
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
  const requestedMentionIds = Array.from(
    new Set(
      (input.mentionedUserIds ?? [])
        .map((id) => String(id ?? "").trim())
        .filter(Boolean),
    ),
  );

  if (!featureId) return { ok: false, message: "Funcionalidade inválida." };
  if (!content) return { ok: false, message: "Escreva um comentário." };
  if (content.length > 4000) {
    return { ok: false, message: "Comentário muito longo (máx. 4000 caracteres)." };
  }

  const userId = gated.auth.userId!;
  const supabase = await createClient();

  const { data: feature, error: featureError } = await supabase
    .from("features")
    .select("id, name")
    .eq("id", featureId)
    .eq("active", true)
    .maybeSingle();
  if (featureError) return { ok: false, message: featureError.message };
  if (!feature) return { ok: false, message: "Funcionalidade não encontrada." };

  let parentCommentId: string | null = null;
  let parentVisibility: CommentVisibility | null = null;
  let parentAuthorUserId: string | null = null;
  let featureChannelContextId: string | null =
    String(input.featureChannelContextId ?? "").trim() || null;

  if (parentRaw) {
    const { data: parent, error: parentError } = await supabase
      .from("feature_comments")
      .select(
        "id, feature_id, parent_comment_id, visibility, user_id, feature_channel_context_id",
      )
      .eq("id", parentRaw)
      .maybeSingle();
    if (parentError) return { ok: false, message: parentError.message };
    if (!parent || String(parent.feature_id) !== featureId) {
      return { ok: false, message: "Comentário pai não encontrado." };
    }

    parentVisibility = normalizeCommentVisibility(parent.visibility, "PUBLIC");
    parentAuthorUserId = String(parent.user_id);
    // Resposta herda o contexto do pai (geral ou canal).
    featureChannelContextId = parent.feature_channel_context_id
      ? String(parent.feature_channel_context_id)
      : null;

    // Viewer não deve conseguir ler INTERNAL via RLS; se chegou null/ausente, tratar.
    if (
      parentVisibility === "INTERNAL" &&
      !canViewInternalComments(gated.auth.role)
    ) {
      return {
        ok: false,
        message: "Permissão insuficiente para responder comentário interno.",
      };
    }

    parentCommentId = parent.parent_comment_id
      ? String(parent.parent_comment_id)
      : String(parent.id);

    // Se o pai resolvido for outro (resposta→raiz), herda visibility da raiz.
    if (parent.parent_comment_id) {
      const { data: root, error: rootError } = await supabase
        .from("feature_comments")
        .select("id, visibility, user_id, feature_channel_context_id")
        .eq("id", parentCommentId)
        .maybeSingle();
      if (rootError) return { ok: false, message: rootError.message };
      if (!root) return { ok: false, message: "Comentário pai não encontrado." };
      parentVisibility = normalizeCommentVisibility(root.visibility, "PUBLIC");
      parentAuthorUserId = String(root.user_id);
      featureChannelContextId = root.feature_channel_context_id
        ? String(root.feature_channel_context_id)
        : null;
    }
  }

  if (featureChannelContextId) {
    const { data: fcc, error: fccError } = await supabase
      .from("feature_channel_contexts")
      .select("id, feature_id, active")
      .eq("id", featureChannelContextId)
      .maybeSingle();
    if (fccError) return { ok: false, message: fccError.message };
    if (
      !fcc ||
      !fcc.active ||
      String(fcc.feature_id) !== featureId
    ) {
      return {
        ok: false,
        message: "Implementação (canal) inválida para este comentário.",
      };
    }
  }

  const resolved = resolveCreateVisibility({
    role: gated.auth.role,
    requested: input.visibility,
    parentVisibility,
  });
  if (!resolved.ok) return resolved;
  const visibility = resolved.visibility;

  const roles = mentionAllowedRoles(visibility);
  let pending: Array<{ userId: string; fullName: string }> = [];
  if (requestedMentionIds.length) {
    const { data: validRows, error: validError } = await supabase.rpc(
      "filter_mentionable_user_ids",
      roles
        ? { ids: requestedMentionIds, allowed_roles: roles }
        : { ids: requestedMentionIds },
    );
    if (validError) return { ok: false, message: validError.message };

    const validMap = new Map<string, string>();
    for (const row of (validRows ?? []) as Array<{
      id: string;
      full_name: string;
    }>) {
      validMap.set(
        String(row.id),
        String(row.full_name ?? "").trim() || "Usuário",
      );
    }

    for (const id of requestedMentionIds) {
      if (!validMap.has(id)) {
        return {
          ok: false,
          message:
            visibility === "INTERNAL"
              ? "Comentários internos só podem mencionar Administradores e Editores."
              : "Menção inválida: usuário não encontrado ou inativo.",
        };
      }
    }

    pending = retainMentionsInContent(
      content,
      requestedMentionIds.map((id) => ({
        userId: id,
        fullName: validMap.get(id)!,
      })),
    );
  }

  const id = newCommentId();
  const { error } = await supabase.from("feature_comments").insert({
    id,
    feature_id: featureId,
    feature_channel_context_id: featureChannelContextId,
    user_id: userId,
    parent_comment_id: parentCommentId,
    content,
    visibility,
  });

  if (error) return { ok: false, message: error.message };

  if (pending.length) {
    const rows = pending.map((m) => ({
      id: newMentionId(),
      comment_id: id,
      mentioned_user_id: m.userId,
    }));
    const { error: mentionError } = await supabase
      .from("feature_comment_mentions")
      .insert(rows);
    if (mentionError) {
      await supabase.from("feature_comments").delete().eq("id", id);
      return { ok: false, message: mentionError.message };
    }
  }

  try {
    const { notifyFeatureCommentCreated } = await import(
      "@/lib/notifications/emitters"
    );
    await notifyFeatureCommentCreated({
      actorUserId: userId,
      featureId,
      featureName: String(feature.name ?? "Funcionalidade"),
      commentId: id,
      content,
      visibility,
      parentCommentId,
      parentAuthorUserId,
      mentionedUserIds: pending.map((m) => m.userId),
    });
  } catch (err) {
    console.error("[notifications:comment]", err);
  }

  revalidateCommentSurfaces(featureId);
  return { ok: true, message: "Comentário publicado.", id };
}

/** Exclui comentário (e respostas/menções em cascade). Admin/Editor apenas. */
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

  revalidateCommentSurfaces(String(existing.feature_id));
  return { ok: true, message: "Comentário excluído." };
}
