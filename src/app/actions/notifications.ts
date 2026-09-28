"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticated } from "@/lib/auth";
import {
  NOTIFICATION_TYPES,
  isNotificationType,
  type NotificationType,
} from "@/lib/notifications/catalog";
import {
  cleanupExpiredNotifications,
  setNotificationPreference,
} from "@/lib/notifications/service";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message: string };

export type NotificationActorDTO = {
  id: string;
  fullName: string;
};

export type NotificationDTO = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  actor: NotificationActorDTO | null;
};

const RETENTION_MS = 15 * 24 * 60 * 60 * 1000;

function retentionCutoffIso() {
  return new Date(Date.now() - RETENTION_MS).toISOString();
}

async function resolveActors(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(new Set(actorIds.filter(Boolean)));
  if (!unique.length) return map;

  const { data } = await supabase.rpc("resolve_profile_public_names", {
    ids: unique,
  });
  if (Array.isArray(data)) {
    for (const row of data as Array<{ id: string; full_name: string }>) {
      map.set(String(row.id), String(row.full_name ?? "").trim() || "Usuário");
    }
    return map;
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", unique);
  for (const p of profiles ?? []) {
    map.set(String(p.id), String(p.full_name ?? "").trim() || "Usuário");
  }
  return map;
}

function mapRow(
  row: Record<string, unknown>,
  nameByActor: Map<string, string>,
): NotificationDTO {
  const actorId = row.actor_user_id ? String(row.actor_user_id) : null;
  return {
    id: String(row.id),
    type: String(row.type) as NotificationType,
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    entityType: row.entity_type ? String(row.entity_type) : null,
    entityId: row.entity_id ? String(row.entity_id) : null,
    href: row.href ? String(row.href) : null,
    readAt: row.read_at ? String(row.read_at) : null,
    createdAt: String(row.created_at),
    actor: actorId
      ? {
          id: actorId,
          fullName: nameByActor.get(actorId) ?? "Usuário",
        }
      : null,
  };
}

/** Contagem de não lidas (badge do sino). */
export async function countUnreadNotifications(): Promise<number> {
  const gated = await requireAuthenticated();
  if (!gated.ok || !gated.auth.userId) return 0;
  if (!isSupabaseEnabled()) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", gated.auth.userId)
    .is("read_at", null)
    .gte("created_at", retentionCutoffIso());

  if (error) {
    console.error("[notifications:count]", error.message);
    return 0;
  }
  return count ?? 0;
}

/** Recentes para o dropdown do Topbar. */
export async function listRecentNotifications(
  limit = 8,
): Promise<{ ok: true; notifications: NotificationDTO[] } | ActionResult> {
  const gated = await requireAuthenticated();
  if (!gated.ok) return gated;
  if (!gated.auth.userId) return { ok: false, message: "Não autenticado." };
  if (!isSupabaseEnabled()) return { ok: true, notifications: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, type, title, message, entity_type, entity_id, href, read_at, created_at, actor_user_id",
    )
    .eq("recipient_user_id", gated.auth.userId)
    .gte("created_at", retentionCutoffIso())
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 20));

  if (error) return { ok: false, message: error.message };

  const nameByActor = await resolveActors(
    supabase,
    (data ?? []).map((r) => String(r.actor_user_id ?? "")),
  );

  return {
    ok: true,
    notifications: (data ?? []).map((row) => mapRow(row, nameByActor)),
  };
}

/** Histórico da Central (últimos 15 dias). */
export async function listNotifications(input?: {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<
  | { ok: true; notifications: NotificationDTO[]; hasMore: boolean }
  | ActionResult
> {
  const gated = await requireAuthenticated();
  if (!gated.ok) return gated;
  if (!gated.auth.userId) return { ok: false, message: "Não autenticado." };
  if (!isSupabaseEnabled()) {
    return { ok: true, notifications: [], hasMore: false };
  }

  const limit = Math.min(Math.max(input?.limit ?? 40, 1), 100);
  const offset = Math.max(input?.offset ?? 0, 0);

  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .select(
      "id, type, title, message, entity_type, entity_id, href, read_at, created_at, actor_user_id",
    )
    .eq("recipient_user_id", gated.auth.userId)
    .gte("created_at", retentionCutoffIso())
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (input?.unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data, error } = await query;
  if (error) return { ok: false, message: error.message };

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const nameByActor = await resolveActors(
    supabase,
    page.map((r) => String(r.actor_user_id ?? "")),
  );

  return {
    ok: true,
    notifications: page.map((row) => mapRow(row, nameByActor)),
    hasMore,
  };
}

export async function markNotificationRead(
  notificationId: string,
): Promise<ActionResult> {
  const gated = await requireAuthenticated();
  if (!gated.ok) return gated;
  if (!gated.auth.userId) return { ok: false, message: "Não autenticado." };
  if (!isSupabaseEnabled()) {
    return { ok: false, message: "Modo demonstração." };
  }

  const id = String(notificationId ?? "").trim();
  if (!id) return { ok: false, message: "Notificação inválida." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_user_id", gated.auth.userId)
    .is("read_at", null);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  revalidatePath("/notificacoes");
  return { ok: true, message: "Notificação marcada como lida." };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const gated = await requireAuthenticated();
  if (!gated.ok) return gated;
  if (!gated.auth.userId) return { ok: false, message: "Não autenticado." };
  if (!isSupabaseEnabled()) {
    return { ok: false, message: "Modo demonstração." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_user_id", gated.auth.userId)
    .is("read_at", null)
    .gte("created_at", retentionCutoffIso());

  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  revalidatePath("/notificacoes");
  return { ok: true, message: "Todas as notificações foram marcadas como lidas." };
}

export async function listMyNotificationPreferences(): Promise<
  | { ok: true; preferences: Record<NotificationType, boolean> }
  | ActionResult
> {
  const gated = await requireAuthenticated();
  if (!gated.ok) return gated;
  if (!gated.auth.userId) return { ok: false, message: "Não autenticado." };

  const defaults = Object.fromEntries(
    NOTIFICATION_TYPES.map((t) => [t, true]),
  ) as Record<NotificationType, boolean>;

  if (!isSupabaseEnabled()) return { ok: true, preferences: defaults };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("notification_type, enabled")
    .eq("user_id", gated.auth.userId);

  if (error) return { ok: false, message: error.message };

  for (const row of data ?? []) {
    const type = String(row.notification_type);
    if (isNotificationType(type)) {
      defaults[type] = Boolean(row.enabled);
    }
  }

  return { ok: true, preferences: defaults };
}

export async function updateMyNotificationPreference(input: {
  type: string;
  enabled: boolean;
}): Promise<ActionResult> {
  const gated = await requireAuthenticated();
  if (!gated.ok) return gated;
  if (!gated.auth.userId) return { ok: false, message: "Não autenticado." };
  if (!isNotificationType(input.type)) {
    return { ok: false, message: "Tipo inválido." };
  }

  const result = await setNotificationPreference({
    userId: gated.auth.userId,
    type: input.type,
    enabled: Boolean(input.enabled),
  });
  if (result.ok) revalidatePath("/configuracoes");
  return result;
}

/** Exposto para cron autenticado por secret — não usar na UI. */
export async function runNotificationCleanup(): Promise<number> {
  return cleanupExpiredNotifications();
}
