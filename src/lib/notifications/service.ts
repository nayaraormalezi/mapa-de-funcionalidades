/**
 * Serviço central de notificações.
 * Destinatários e preferências são resolvidos no backend — o cliente não escolhe recipients.
 */

import {
  createAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/server";
import type { UserRole } from "@/types";
import {
  isNotificationType,
  type NotificationEntityType,
  type NotificationType,
} from "./catalog";

export type NotifyEventInput = {
  type: NotificationType;
  actorUserId: string;
  title: string;
  message?: string;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown>;
  /** Destinatários explícitos (ex.: menção, resposta). */
  recipientUserIds?: string[];
  /**
   * Se true (default quando não há recipientUserIds),
   * notifica todos os usuários ativos elegíveis.
   */
  broadcast?: boolean;
  /** Roles permitidos entre destinatários (ex.: interno → admin/editor). */
  allowedRoles?: UserRole[] | null;
  /** Dedup key opcional em metadata (ex.: mention comment+user). */
  dedupeKey?: string | null;
};

function newNotificationId() {
  return `ntf-${crypto.randomUUID().slice(0, 10)}`;
}

function newPreferenceId() {
  return `npref-${crypto.randomUUID().slice(0, 8)}`;
}

async function listActiveRecipients(options?: {
  excludeUserId?: string | null;
  allowedRoles?: UserRole[] | null;
}): Promise<Array<{ id: string; role: UserRole }>> {
  if (!isAdminClientConfigured()) return [];
  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, role")
    .eq("active", true);

  if (options?.excludeUserId) {
    query = query.neq("id", options.excludeUserId);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("[notifications:recipients]", error?.message);
    return [];
  }

  const roles = options?.allowedRoles ?? null;
  return data
    .map((row) => ({
      id: String(row.id),
      role: String(row.role) as UserRole,
    }))
    .filter((row) => !roles || roles.includes(row.role));
}

async function preferenceEnabled(
  userId: string,
  type: NotificationType,
): Promise<boolean> {
  if (!isAdminClientConfigured()) return true;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notification_preferences")
    .select("enabled")
    .eq("user_id", userId)
    .eq("notification_type", type)
    .maybeSingle();

  if (error) {
    console.error("[notifications:preference]", error.message);
    return true;
  }
  // Ausência de linha = habilitado (default).
  if (!data) return true;
  return Boolean(data.enabled);
}

async function alreadyNotified(input: {
  recipientUserId: string;
  type: NotificationType;
  dedupeKey: string;
}): Promise<boolean> {
  if (!isAdminClientConfigured()) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("notifications")
    .select("id")
    .eq("recipient_user_id", input.recipientUserId)
    .eq("type", input.type)
    .contains("metadata", { dedupeKey: input.dedupeKey })
    .limit(1);
  return Boolean(data?.length);
}

/**
 * Cria notificações para destinatários elegíveis.
 * Retorna quantidade inserida (0 se DEMO / sem service role / nenhum destinatário).
 */
export async function notifyEvent(input: NotifyEventInput): Promise<number> {
  if (!isSupabaseEnabled() || !isAdminClientConfigured()) return 0;
  if (!isNotificationType(input.type)) return 0;

  const actorUserId = String(input.actorUserId ?? "").trim();
  if (!actorUserId) return 0;

  const title = String(input.title ?? "").trim();
  if (!title) return 0;

  const message = String(input.message ?? "").trim();
  const entityType = input.entityType ?? null;
  const entityId = input.entityId ? String(input.entityId) : null;
  const href = input.href ? String(input.href) : null;
  const dedupeKey = input.dedupeKey ? String(input.dedupeKey) : null;
  const metadata = {
    ...(input.metadata ?? {}),
    ...(dedupeKey ? { dedupeKey } : {}),
  };

  let recipients: Array<{ id: string; role: UserRole }> = [];

  if (input.recipientUserIds?.length) {
    const unique = Array.from(
      new Set(input.recipientUserIds.map((id) => String(id).trim()).filter(Boolean)),
    );
    const all = await listActiveRecipients({
      allowedRoles: input.allowedRoles ?? null,
    });
    const allowed = new Map(all.map((r) => [r.id, r]));
    recipients = unique
      .map((id) => allowed.get(id))
      .filter((r): r is { id: string; role: UserRole } => Boolean(r));
  } else if (input.broadcast !== false) {
    recipients = await listActiveRecipients({
      excludeUserId: actorUserId,
      allowedRoles: input.allowedRoles ?? null,
    });
  }

  const rows: Array<Record<string, unknown>> = [];

  for (const recipient of recipients) {
    if (recipient.id === actorUserId) continue;
    const enabled = await preferenceEnabled(recipient.id, input.type);
    if (!enabled) continue;
    if (dedupeKey) {
      const dup = await alreadyNotified({
        recipientUserId: recipient.id,
        type: input.type,
        dedupeKey,
      });
      if (dup) continue;
    }

    rows.push({
      id: newNotificationId(),
      recipient_user_id: recipient.id,
      actor_user_id: actorUserId,
      type: input.type,
      title,
      message,
      entity_type: entityType,
      entity_id: entityId,
      href,
      metadata,
    });
  }

  if (!rows.length) return 0;

  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    console.error("[notifications:insert]", error.message);
    return 0;
  }
  return rows.length;
}

export async function setNotificationPreference(input: {
  userId: string;
  type: NotificationType;
  enabled: boolean;
}): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseEnabled()) {
    return { ok: false, message: "Modo demonstração: preferências não persistidas." };
  }
  if (!isNotificationType(input.type)) {
    return { ok: false, message: "Tipo de notificação inválido." };
  }

  // Preferência do próprio usuário — client autenticado.
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("notification_preferences")
    .select("id")
    .eq("user_id", input.userId)
    .eq("notification_type", input.type)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("notification_preferences")
      .update({ enabled: input.enabled })
      .eq("id", existing.id)
      .eq("user_id", input.userId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Preferência atualizada." };
  }

  const { error } = await supabase.from("notification_preferences").insert({
    id: newPreferenceId(),
    user_id: input.userId,
    notification_type: input.type,
    enabled: input.enabled,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Preferência salva." };
}

export async function cleanupExpiredNotifications(): Promise<number> {
  if (!isSupabaseEnabled() || !isAdminClientConfigured()) return 0;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("cleanup_expired_notifications");
  if (error) {
    // Fallback direto.
    const cutoff = new Date(
      Date.now() - 15 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { error: delError, count } = await admin
      .from("notifications")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);
    if (delError) {
      console.error("[notifications:cleanup]", delError.message);
      return 0;
    }
    return count ?? 0;
  }
  return Number(data ?? 0);
}
