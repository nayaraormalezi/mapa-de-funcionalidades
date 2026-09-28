/**
 * Matriz canônica de permissões do PRISMA.
 *
 * Roles: viewer | editor | admin
 *
 * canEdit  = editor | admin  → ações operacionais
 * canAdmin = admin           → taxonomias, usuários, configurações admin
 *
 * Não usar isAdmin/canAdmin como atalho para esconder ações de Editor.
 */

import type { UserRole } from "@/types";

export type Permission =
  | "view"
  | "feature.create"
  | "feature.edit"
  | "feature.archive"
  | "feature.duplicate"
  | "implementation.edit"
  | "evaluation.create"
  | "evaluation.edit"
  | "evaluation.archive"
  | "evidence.create"
  | "evidence.edit"
  | "evidence.archive"
  | "evolution.create"
  | "evolution.edit"
  | "evolution.archive"
  | "issue.create"
  | "issue.edit"
  | "issue.resolve"
  | "issue.archive"
  | "gap.operate"
  | "channel.edit"
  | "journey.edit"
  | "need.create"
  | "need.delete"
  | "comment.create"
  | "comment.delete"
  | "taxonomy.manage"
  | "users.manage"
  | "settings.admin";

/** Quem pode executar cada permissão (matriz canônica). */
export const PERMISSION_MATRIX: Record<Permission, readonly UserRole[]> = {
  view: ["viewer", "editor", "admin"],
  "feature.create": ["editor", "admin"],
  "feature.edit": ["editor", "admin"],
  "feature.archive": ["editor", "admin"],
  "feature.duplicate": ["editor", "admin"],
  "implementation.edit": ["editor", "admin"],
  "evaluation.create": ["editor", "admin"],
  "evaluation.edit": ["editor", "admin"],
  "evaluation.archive": ["editor", "admin"],
  "evidence.create": ["editor", "admin"],
  "evidence.edit": ["editor", "admin"],
  "evidence.archive": ["editor", "admin"],
  "evolution.create": ["editor", "admin"],
  "evolution.edit": ["editor", "admin"],
  "evolution.archive": ["editor", "admin"],
  "issue.create": ["editor", "admin"],
  "issue.edit": ["editor", "admin"],
  "issue.resolve": ["editor", "admin"],
  "issue.archive": ["editor", "admin"],
  "gap.operate": ["editor", "admin"],
  "channel.edit": ["editor", "admin"],
  "journey.edit": ["editor", "admin"],
  /** Criar necessidade a partir de Jornadas (operacional no código atual). */
  "need.create": ["editor", "admin"],
  "need.delete": ["editor", "admin"],
  /** Comentários: todos os perfis autenticados podem criar/responder. */
  "comment.create": ["viewer", "editor", "admin"],
  /** Exclusão de comentários: somente Admin e Editor. */
  "comment.delete": ["editor", "admin"],
  /** Taxonomias / Cadastros — somente Admin (UI /cadastros). */
  "taxonomy.manage": ["admin"],
  "users.manage": ["admin"],
  "settings.admin": ["admin"],
};

export function roleCan(role: UserRole, permission: Permission): boolean {
  return PERMISSION_MATRIX[permission].includes(role);
}

/** Espelha AuthState.canEdit — ações operacionais. */
export function roleCanEdit(role: UserRole): boolean {
  return role === "admin" || role === "editor";
}

/** Espelha AuthState.isAdmin / canAdmin — admin only. */
export function roleCanAdmin(role: UserRole): boolean {
  return role === "admin";
}

export function permissionsForRole(role: UserRole): Permission[] {
  return (Object.keys(PERMISSION_MATRIX) as Permission[]).filter((p) =>
    roleCan(role, p),
  );
}
