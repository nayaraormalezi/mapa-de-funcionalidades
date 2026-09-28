/** Catálogo centralizado de tipos de notificação (códigos internos). */

export const NOTIFICATION_TYPES = [
  "NEED_CREATED",
  "NEED_UPDATED",
  "FEATURE_CREATED",
  "FEATURE_UPDATED",
  "FEATURE_STATUS_UPDATED",
  "CHANNEL_CONTEXT_CREATED",
  "CHANNEL_CONTEXT_UPDATED",
  "EVOLUTION_CREATED",
  "EVOLUTION_UPDATED",
  "IMPROVEMENT_CREATED",
  "IMPROVEMENT_UPDATED",
  "COMMENT_CREATED",
  "COMMENT_REPLY",
  "COMMENT_MENTION",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationEntityType =
  | "feature"
  | "user_need"
  | "feature_channel_context"
  | "feature_evolution"
  | "issue"
  | "feature_comment";

export type NotificationPreferenceGroup = {
  id: string;
  label: string;
  types: Array<{
    type: NotificationType;
    label: string;
  }>;
};

/** Labels de produto para a tela de preferências. */
export const NOTIFICATION_PREFERENCE_GROUPS: NotificationPreferenceGroup[] = [
  {
    id: "needs",
    label: "Necessidades",
    types: [
      { type: "NEED_CREATED", label: "Novas necessidades" },
      { type: "NEED_UPDATED", label: "Atualizações de necessidades" },
    ],
  },
  {
    id: "features",
    label: "Funcionalidades",
    types: [
      { type: "FEATURE_CREATED", label: "Novas funcionalidades" },
      { type: "FEATURE_UPDATED", label: "Atualizações de funcionalidades" },
      { type: "FEATURE_STATUS_UPDATED", label: "Alterações de status" },
    ],
  },
  {
    id: "channels",
    label: "Canais / implementações",
    types: [
      { type: "CHANNEL_CONTEXT_CREATED", label: "Novas implementações/canais" },
      {
        type: "CHANNEL_CONTEXT_UPDATED",
        label: "Atualizações de implementação/canal",
      },
    ],
  },
  {
    id: "delivery",
    label: "Entregas",
    types: [
      { type: "EVOLUTION_CREATED", label: "Evoluções" },
      { type: "EVOLUTION_UPDATED", label: "Atualizações de evoluções" },
      { type: "IMPROVEMENT_CREATED", label: "Melhorias" },
      { type: "IMPROVEMENT_UPDATED", label: "Atualizações de melhorias" },
    ],
  },
  {
    id: "comments",
    label: "Comentários",
    types: [
      { type: "COMMENT_CREATED", label: "Comentários" },
      { type: "COMMENT_REPLY", label: "Respostas aos meus comentários" },
      { type: "COMMENT_MENTION", label: "Menções" },
    ],
  },
];

export function isNotificationType(value: string): value is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

export function formatRelativeTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 45) return "agora";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `há ${diffHour} h`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay === 1) return "ontem";
  if (diffDay < 7) return `há ${diffDay} dias`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function notificationDayGroupLabel(
  iso: string,
  now = new Date(),
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round(
    (startOf(now) - startOf(date)) / (24 * 60 * 60 * 1000),
  );
  if (dayDiff === 0) return "Hoje";
  if (dayDiff === 1) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}
