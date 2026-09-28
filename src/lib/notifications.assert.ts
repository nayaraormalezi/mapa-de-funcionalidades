/**
 * Asserts do catálogo e regras de notificações.
 * Executar: npx --yes tsx src/lib/notifications.assert.ts
 */
import {
  NOTIFICATION_TYPES,
  formatRelativeTime,
  isNotificationType,
  notificationDayGroupLabel,
} from "./notifications/catalog";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

assert(isNotificationType("COMMENT_MENTION"), "mention type");
assert(isNotificationType("FEATURE_CREATED"), "feature created type");
assert(!isNotificationType("UNKNOWN"), "reject unknown");
assert(NOTIFICATION_TYPES.includes("COMMENT_REPLY"), "reply in catalog");
assert(NOTIFICATION_TYPES.includes("NEED_CREATED"), "need in catalog");

const now = new Date("2026-09-28T18:00:00Z");
assert(
  formatRelativeTime(new Date(now.getTime() - 30_000).toISOString(), now) ===
    "agora",
  "relative agora",
);
assert(
  formatRelativeTime(new Date(now.getTime() - 5 * 60_000).toISOString(), now) ===
    "há 5 min",
  "relative min",
);
assert(
  notificationDayGroupLabel(now.toISOString(), now) === "Hoje",
  "group hoje",
);

/** Preferência ausente = habilitada. */
function isEnabled(
  prefs: Record<string, boolean | undefined>,
  type: string,
): boolean {
  return prefs[type] !== false;
}
assert(isEnabled({}, "COMMENT_MENTION"), "default on");
assert(isEnabled({ COMMENT_MENTION: false }, "COMMENT_MENTION") === false, "off");
assert(isEnabled({ COMMENT_MENTION: true }, "COMMENT_MENTION"), "on");

/** Não notificar o próprio autor. */
function shouldNotify(actorId: string, recipientId: string) {
  return actorId !== recipientId;
}
assert(shouldNotify("a", "b"), "other user");
assert(!shouldNotify("a", "a"), "self skip");

/** Interno: só admin/editor. */
function canReceiveInternal(role: string) {
  return role === "admin" || role === "editor";
}
assert(canReceiveInternal("admin"), "admin internal");
assert(canReceiveInternal("editor"), "editor internal");
assert(!canReceiveInternal("viewer"), "viewer !internal");

console.log("notifications.assert: OK (catalog + defaults + visibility)");
