/** Regras puras de visibilidade de comentários (sem I/O). */

import type { UserRole } from "@/types";
import { roleCan, roleCanEdit } from "@/lib/permissions";

export type CommentVisibility = "PUBLIC" | "INTERNAL";

export type CommentFilterTab = "all" | "public" | "internal";

export function isCommentVisibility(value: unknown): value is CommentVisibility {
  return value === "PUBLIC" || value === "INTERNAL";
}

export function normalizeCommentVisibility(
  value: unknown,
  fallback: CommentVisibility = "PUBLIC",
): CommentVisibility {
  return isCommentVisibility(value) ? value : fallback;
}

/** Quem pode ver comentários INTERNAL (e a aba Internos). */
export function canViewInternalComments(role: UserRole): boolean {
  return roleCan(role, "comment.internal");
}

/** Quem pode criar comentário INTERNAL. */
export function canCreateInternalComments(role: UserRole): boolean {
  return roleCan(role, "comment.internal");
}

/**
 * Resolve a visibilidade efetiva na criação.
 * Respostas herdam o pai; viewer nunca publica INTERNAL.
 */
export function resolveCreateVisibility(input: {
  role: UserRole;
  requested: CommentVisibility | null | undefined;
  parentVisibility: CommentVisibility | null;
}): { ok: true; visibility: CommentVisibility } | { ok: false; message: string } {
  if (input.parentVisibility) {
    if (
      input.parentVisibility === "INTERNAL" &&
      !canViewInternalComments(input.role)
    ) {
      return {
        ok: false,
        message: "Permissão insuficiente para responder comentário interno.",
      };
    }
    return { ok: true, visibility: input.parentVisibility };
  }

  const requested = normalizeCommentVisibility(input.requested, "PUBLIC");
  if (requested === "INTERNAL" && !canCreateInternalComments(input.role)) {
    return {
      ok: false,
      message: "Permissão insuficiente para criar comentário interno.",
    };
  }
  return { ok: true, visibility: requested };
}

/** Filtra lista já carregada (API já filtra; UI usa para abas). */
export function filterCommentsByTab<
  T extends { visibility: CommentVisibility },
>(comments: T[], tab: CommentFilterTab, role: UserRole): T[] {
  const visible = canViewInternalComments(role)
    ? comments
    : comments.filter((c) => c.visibility === "PUBLIC");

  if (tab === "public") return visible.filter((c) => c.visibility === "PUBLIC");
  if (tab === "internal") {
    if (!canViewInternalComments(role)) return [];
    return visible.filter((c) => c.visibility === "INTERNAL");
  }
  return visible;
}

export function countVisibleComments<
  T extends { visibility: CommentVisibility },
>(comments: T[], role: UserRole): number {
  return filterCommentsByTab(comments, "all", role).length;
}

/** Roles elegíveis a menção conforme visibilidade do comentário. */
export function mentionAllowedRoles(
  visibility: CommentVisibility,
): UserRole[] | null {
  if (visibility === "INTERNAL") return ["admin", "editor"];
  return null; // todos ativos (admin/editor/viewer)
}

export function emptyCommentsMessage(
  tab: CommentFilterTab,
  role: UserRole,
): string {
  if (tab === "internal" && canViewInternalComments(role)) {
    return "Nenhum comentário interno";
  }
  return "Nenhum comentário ainda";
}

export { roleCanEdit };
