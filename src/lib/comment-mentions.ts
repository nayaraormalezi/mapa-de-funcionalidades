/** Utilitários puros de menções @ em comentários (sem I/O). */

export type MentionCandidate = {
  id: string;
  fullName: string;
  email?: string;
};

export type PendingMention = {
  userId: string;
  fullName: string;
};

export type MentionQueryState = {
  /** Índice do '@' que abriu a menção. */
  atIndex: number;
  /** Texto após o @ (sem espaços). */
  query: string;
};

export type ContentSegment =
  | { type: "text"; value: string }
  | { type: "mention"; value: string; userId: string; fullName: string };

/** Detecta @ativo na posição do cursor (query sem espaços). */
export function detectMentionQuery(
  text: string,
  cursor: number,
): MentionQueryState | null {
  const safeCursor = Math.max(0, Math.min(cursor, text.length));
  const before = text.slice(0, safeCursor);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;

  if (at > 0) {
    const prev = before[at - 1]!;
    if (!/\s/.test(prev)) return null;
  }

  const query = before.slice(at + 1);
  if (/\s/.test(query)) return null;
  return { atIndex: at, query };
}

/** Insere `@Nome` na posição do @ativo; devolve novo texto e cursor. */
export function insertMentionAt(
  text: string,
  cursor: number,
  mention: MentionCandidate,
): { text: string; cursor: number; pending: PendingMention } {
  const active = detectMentionQuery(text, cursor);
  if (!active) {
    const token = `@${mention.fullName}`;
    const next = `${text.slice(0, cursor)}${token} ${text.slice(cursor)}`;
    return {
      text: next,
      cursor: cursor + token.length + 1,
      pending: { userId: mention.id, fullName: mention.fullName },
    };
  }

  const token = `@${mention.fullName}`;
  const afterCursor = text.slice(cursor);
  const spacer = afterCursor.startsWith(" ") || afterCursor.length === 0 ? "" : " ";
  const next = `${text.slice(0, active.atIndex)}${token}${spacer}${afterCursor}`;
  return {
    text: next,
    cursor: active.atIndex + token.length + spacer.length,
    pending: { userId: mention.id, fullName: mention.fullName },
  };
}

/** Mantém só menções cujo `@Nome` ainda aparece no texto. */
export function retainMentionsInContent(
  content: string,
  mentions: PendingMention[],
): PendingMention[] {
  const seen = new Set<string>();
  const kept: PendingMention[] = [];
  for (const m of mentions) {
    if (seen.has(m.userId)) continue;
    const token = `@${m.fullName}`;
    if (!content.includes(token)) continue;
    seen.add(m.userId);
    kept.push(m);
  }
  return kept;
}

/**
 * Quebra o conteúdo em segmentos de texto e menção para renderização.
 * Usa nomes dos mentions estruturados (não inventa usuários).
 */
export function segmentCommentContent(
  content: string,
  mentions: Array<{ userId: string; fullName: string }>,
): ContentSegment[] {
  if (!content) return [{ type: "text", value: "" }];
  if (!mentions.length) return [{ type: "text", value: content }];

  const unique = new Map<string, { userId: string; fullName: string }>();
  for (const m of mentions) {
    if (!unique.has(m.userId)) unique.set(m.userId, m);
  }

  const sorted = [...unique.values()].sort(
    (a, b) => b.fullName.length - a.fullName.length,
  );

  const patterns = sorted.map((m) => ({
    ...m,
    token: `@${m.fullName}`,
  }));

  const segments: ContentSegment[] = [];
  let i = 0;
  while (i < content.length) {
    let matched: (typeof patterns)[number] | null = null;
    for (const p of patterns) {
      if (content.startsWith(p.token, i)) {
        matched = p;
        break;
      }
    }
    if (matched) {
      segments.push({
        type: "mention",
        value: matched.token,
        userId: matched.userId,
        fullName: matched.fullName,
      });
      i += matched.token.length;
      continue;
    }
    const start = i;
    i += 1;
    while (i < content.length) {
      let hit = false;
      for (const p of patterns) {
        if (content.startsWith(p.token, i)) {
          hit = true;
          break;
        }
      }
      if (hit) break;
      i += 1;
    }
    segments.push({ type: "text", value: content.slice(start, i) });
  }

  return segments.length ? segments : [{ type: "text", value: content }];
}

/** Contagem total = principais + respostas (mesma regra da UI). */
export function countComments(
  comments: Array<{ id: string; parentCommentId: string | null }>,
): number {
  return comments.length;
}

/**
 * Simula sincronização prévia ↔ ficha: ambos leem a mesma lista persistida.
 * Mutação na "prévia" altera a fonte; a "ficha" vê o mesmo estado.
 */
export function syncCommentsFromSource<T>(source: T[]): T[] {
  return source.map((item) => item);
}
