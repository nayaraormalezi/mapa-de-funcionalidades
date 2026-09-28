import { notifyEvent } from "@/lib/notifications/service";
import type { CommentVisibility } from "@/lib/comment-visibility";
import type { UserRole } from "@/types";

function rolesForCommentVisibility(
  visibility: CommentVisibility,
): UserRole[] | null {
  return visibility === "INTERNAL" ? ["admin", "editor"] : null;
}

export async function notifyFeatureCommentCreated(input: {
  actorUserId: string;
  featureId: string;
  featureName: string;
  commentId: string;
  content: string;
  visibility: CommentVisibility;
  parentCommentId: string | null;
  parentAuthorUserId: string | null;
  mentionedUserIds: string[];
}): Promise<void> {
  const snippet =
    input.content.length > 120
      ? `${input.content.slice(0, 117)}…`
      : input.content;
  const href = `/funcionalidades/${input.featureId}?comment=${input.commentId}#comentarios`;
  const roles = rolesForCommentVisibility(input.visibility);

  // Menções: 1 notificação por usuário (dedupe).
  const uniqueMentions = Array.from(new Set(input.mentionedUserIds));
  for (const mentionedUserId of uniqueMentions) {
    if (mentionedUserId === input.actorUserId) continue;
    await notifyEvent({
      type: "COMMENT_MENTION",
      actorUserId: input.actorUserId,
      recipientUserIds: [mentionedUserId],
      allowedRoles: roles,
      broadcast: false,
      title: "mencionou você em um comentário",
      message: snippet,
      entityType: "feature_comment",
      entityId: input.commentId,
      href,
      metadata: {
        featureId: input.featureId,
        featureName: input.featureName,
        visibility: input.visibility,
      },
      dedupeKey: `mention:${input.commentId}:${mentionedUserId}`,
    });
  }

  if (input.parentCommentId && input.parentAuthorUserId) {
    if (input.parentAuthorUserId !== input.actorUserId) {
      await notifyEvent({
        type: "COMMENT_REPLY",
        actorUserId: input.actorUserId,
        recipientUserIds: [input.parentAuthorUserId],
        allowedRoles: roles,
        broadcast: false,
        title: `respondeu ao seu comentário em "${input.featureName}"`,
        message: snippet,
        entityType: "feature_comment",
        entityId: input.commentId,
        href,
        metadata: {
          featureId: input.featureId,
          featureName: input.featureName,
          parentCommentId: input.parentCommentId,
          visibility: input.visibility,
        },
        dedupeKey: `reply:${input.commentId}:${input.parentAuthorUserId}`,
      });
    }
    return;
  }

  await notifyEvent({
    type: "COMMENT_CREATED",
    actorUserId: input.actorUserId,
    allowedRoles: roles,
    broadcast: true,
    title: `adicionou um comentário em "${input.featureName}"`,
    message: snippet,
    entityType: "feature",
    entityId: input.featureId,
    href,
    metadata: {
      featureId: input.featureId,
      featureName: input.featureName,
      commentId: input.commentId,
      visibility: input.visibility,
    },
    dedupeKey: `comment:${input.commentId}`,
  });
}

export async function notifyDomainEvent(input: {
  type:
    | "NEED_CREATED"
    | "NEED_UPDATED"
    | "FEATURE_CREATED"
    | "FEATURE_UPDATED"
    | "FEATURE_STATUS_UPDATED"
    | "CHANNEL_CONTEXT_CREATED"
    | "CHANNEL_CONTEXT_UPDATED"
    | "EVOLUTION_CREATED"
    | "EVOLUTION_UPDATED"
    | "IMPROVEMENT_CREATED"
    | "IMPROVEMENT_UPDATED";
  actorUserId: string;
  title: string;
  message?: string;
  entityType: "feature" | "user_need" | "feature_channel_context" | "feature_evolution" | "issue";
  entityId: string;
  href: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await notifyEvent({
    type: input.type,
    actorUserId: input.actorUserId,
    title: input.title,
    message: input.message ?? "",
    entityType: input.entityType,
    entityId: input.entityId,
    href: input.href,
    metadata: input.metadata,
    broadcast: true,
    dedupeKey: `${input.type}:${input.entityId}:${Date.now()}`,
  });
}
