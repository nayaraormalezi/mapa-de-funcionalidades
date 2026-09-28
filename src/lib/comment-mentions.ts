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

  // Bloqueia email/palavra (@ no meio): só abre após início, espaço ou pontuação.
  if (at > 0) {
    const prev = before[at - 1]!;
    if (/[\p{L}\p{N}_@]/u.test(prev)) return null;
  }

  const query = before.slice(at + 1);
  if (/\s/.test(query)) return null;
  // Query longa demais → provavelmente não é menção em digitação.
  if (query.length > 64) return null;
  return { atIndex: at, query };
}

/** Insere `@Nome` na posição do @ativo; devolve novo texto e cursor. */
export function insertMentionAt(
  text: string,
  cursor: number,
  mention: MentionCandidate,
): { text: string; cursor: number; pending: PendingMention } {
  const token = `@${mention.fullName}`;
  const pending: PendingMention = {
    userId: mention.id,
    fullName: mention.fullName,
  };
  const active = detectMentionQuery(text, cursor);
  const start = active ? active.atIndex : cursor;
  const after = text.slice(cursor);
  const rest = after.startsWith(" ") ? after.slice(1) : after;
  const next = `${text.slice(0, start)}${token} ${rest}`;
  return {
    text: next,
    cursor: start + token.length + 1,
    pending,
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

/**
 * Posição do caret de um textarea no viewport (para ancorar o dropdown de @).
 */
export function getTextareaCaretClientRect(
  textarea: HTMLTextAreaElement,
  position: number,
): { top: number; left: number; height: number; bottom: number } {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");
  const properties = [
    "direction",
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "fontSizeAdjust",
    "lineHeight",
    "fontFamily",
    "textAlign",
    "textTransform",
    "textIndent",
    "textDecoration",
    "letterSpacing",
    "wordSpacing",
    "tabSize",
    "MozTabSize",
    "whiteSpace",
    "wordBreak",
    "wordWrap",
  ] as const;

  mirror.setAttribute("aria-hidden", "true");
  mirror.style.position = "absolute";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  for (const prop of properties) {
    mirror.style.setProperty(prop, style.getPropertyValue(prop));
  }
  mirror.style.width = `${textarea.clientWidth}px`;

  const safePos = Math.max(0, Math.min(position, textarea.value.length));
  mirror.textContent = textarea.value.slice(0, safePos);
  const marker = document.createElement("span");
  marker.textContent = textarea.value.slice(safePos) || "\u200b";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const textareaRect = textarea.getBoundingClientRect();
  const top =
    textareaRect.top +
    (marker.offsetTop - textarea.scrollTop) +
    Number.parseFloat(style.borderTopWidth || "0");
  const left =
    textareaRect.left +
    (marker.offsetLeft - textarea.scrollLeft) +
    Number.parseFloat(style.borderLeftWidth || "0");
  const height = marker.offsetHeight || Number.parseFloat(style.lineHeight) || 18;
  document.body.removeChild(mirror);

  return { top, left, height, bottom: top + height };
}
