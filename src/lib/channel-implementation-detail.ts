/**
 * Helpers de escopo canal/implementação (FCC) para ficha e modal.
 * Puros — usados em UI e asserts.
 */

export type ChannelCommentScope =
  | { type: "all" }
  | { type: "general" }
  | { type: "fcc"; fccIds: string[] };

export type CommentWithChannelScope = {
  id: string;
  parentCommentId: string | null;
  featureChannelContextId: string | null;
};

/** Resolve o FCC clicado — nunca o primeiro da lista por acaso. */
export function resolveClickedImplementation<T extends { featureChannelContextId: string }>(
  contexts: T[],
  featureChannelContextId: string | null | undefined,
): T | null {
  const id = String(featureChannelContextId ?? "").trim();
  if (!id) return null;
  return contexts.find((c) => c.featureChannelContextId === id) ?? null;
}

/**
 * Filtra comentários por escopo de canal.
 * Raízes no escopo + respostas dessas raízes (mesmo que reply herde FCC).
 */
export function filterCommentsByChannelScope<T extends CommentWithChannelScope>(
  comments: T[],
  scope: ChannelCommentScope,
): T[] {
  if (scope.type === "all") return comments;

  const rootIds = new Set<string>();
  for (const c of comments) {
    if (c.parentCommentId) continue;
    const fcc = c.featureChannelContextId;
    if (scope.type === "general") {
      if (fcc == null) rootIds.add(c.id);
    } else if (fcc && scope.fccIds.includes(fcc)) {
      rootIds.add(c.id);
    }
  }

  return comments.filter((c) => {
    if (!c.parentCommentId) return rootIds.has(c.id);
    return rootIds.has(c.parentCommentId);
  });
}

/** FCC efetivo ao criar comentário na ficha (filtro ativo) ou no modal (locked). */
export function resolveCreateFeatureChannelContextId(input: {
  lockedFccId?: string | null;
  channelFilter: ChannelCommentScope;
}): string | null {
  if (input.lockedFccId) return input.lockedFccId;
  if (input.channelFilter.type === "fcc") {
    return input.channelFilter.fccIds[0] ?? null;
  }
  return null;
}

export function improvementsForChannel<
  T extends { featureId: string | null; currentChannelId: string | null },
>(
  gaps: T[],
  featureId: string,
  channelId: string,
): T[] {
  return gaps.filter(
    (g) =>
      g.featureId === featureId &&
      (g.currentChannelId == null || g.currentChannelId === channelId),
  );
}

export function evolutionsForFccIds<
  T extends { featureChannelContextId: string; active?: boolean },
>(evolutions: T[], fccIds: string[]): T[] {
  const set = new Set(fccIds);
  return evolutions.filter(
    (e) => set.has(e.featureChannelContextId) && e.active !== false,
  );
}
