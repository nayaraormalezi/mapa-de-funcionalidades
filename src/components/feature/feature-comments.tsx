"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import {
  createFeatureComment,
  deleteFeatureComment,
  listFeatureComments,
  searchMentionableUsers,
  type FeatureCommentDTO,
  type MentionableUserDTO,
} from "@/app/actions/comments";
import { useAuth } from "@/components/auth/auth-provider";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionMenu } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  detectMentionQuery,
  getTextareaCaretClientRect,
  insertMentionAt,
  retainMentionsInContent,
  segmentCommentContent,
  type MentionQueryState,
  type PendingMention,
} from "@/lib/comment-mentions";
import {
  notifyFeatureCommentsChanged,
  subscribeFeatureCommentsChanged,
} from "@/lib/comment-sync";
import {
  filterCommentsByChannelScope,
  resolveCreateFeatureChannelContextId,
  type ChannelCommentScope,
} from "@/lib/channel-implementation-detail";
import {
  canCreateInternalComments,
  canViewInternalComments,
  emptyCommentsMessage,
  filterCommentsByTab,
  type CommentFilterTab,
  type CommentVisibility,
} from "@/lib/comment-visibility";
import { roleCan } from "@/lib/permissions";
import { cn, formatDateTime } from "@/lib/utils";
import { Globe2, Lock, MessageSquare, Reply } from "lucide-react";

export type CommentChannelFilterOption = {
  /** `__all__` | `__general__` | chave do card de canal */
  value: string;
  label: string;
  /** FCC ids do canal (vazio para all/general). */
  fccIds?: string[];
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function AuthorAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600"
    >
      {initials(name)}
    </span>
  );
}

function VisibilityBadge({ visibility }: { visibility: CommentVisibility }) {
  if (visibility === "INTERNAL") {
    return (
      <Badge className="inline-flex items-center gap-1 bg-violet-50 text-violet-900 ring-violet-200">
        <Lock className="h-3 w-3" aria-hidden />
        Interno
      </Badge>
    );
  }
  return (
    <Badge className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 ring-emerald-200">
      <Globe2 className="h-3 w-3" aria-hidden />
      Público
    </Badge>
  );
}

function visibilityDescription(visibility: CommentVisibility) {
  return visibility === "INTERNAL"
    ? "Visível apenas para Editores e Administradores"
    : "Visível para todos os usuários";
}

function CommentBody({ comment }: { comment: FeatureCommentDTO }) {
  const segments = segmentCommentContent(comment.content, comment.mentions);
  return (
    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
      {segments.map((seg, idx) =>
        seg.type === "mention" ? (
          <span
            key={`${seg.userId}-${idx}`}
            title={seg.fullName}
            className="rounded bg-sky-50 px-0.5 font-medium text-sky-800"
          >
            {seg.value}
          </span>
        ) : (
          <span key={`t-${idx}`}>{seg.value}</span>
        ),
      )}
    </p>
  );
}

/**
 * Propriedade do novo comentário — visual distinto das tabs de filtro da lista.
 * Não reutiliza SegmentedControl genérico (mesmo padrão das views/filtros).
 */
function CommentVisibilityControl({
  value,
  onChange,
  allowInternal,
  locked,
  disabled,
}: {
  value: CommentVisibility;
  onChange: (v: CommentVisibility) => void;
  allowInternal: boolean;
  locked?: boolean;
  disabled?: boolean;
}) {
  const groupId = useId();
  const descriptionId = `${groupId}-desc`;

  if (locked) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-500">
          Visibilidade do comentário
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <VisibilityBadge visibility={value} />
          <span className="text-xs text-slate-500">
            Herdada do comentário pai
          </span>
        </div>
        <p id={descriptionId} className="text-xs text-slate-500">
          {visibilityDescription(value)}
        </p>
      </div>
    );
  }

  const options: Array<{
    id: CommentVisibility;
    label: string;
    Icon: typeof Globe2;
  }> = allowInternal
    ? [
        { id: "PUBLIC", label: "Público", Icon: Globe2 },
        { id: "INTERNAL", label: "Interno", Icon: Lock },
      ]
    : [{ id: "PUBLIC", label: "Público", Icon: Globe2 }];

  return (
    <div className="space-y-1.5">
      <p id={groupId} className="text-xs font-medium text-slate-500">
        Visibilidade do comentário
      </p>
      <div
        role="radiogroup"
        aria-labelledby={groupId}
        aria-describedby={descriptionId}
        className="flex flex-wrap gap-2"
      >
        {options.map(({ id, label, Icon }) => {
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/30 disabled:opacity-60",
                selected
                  ? id === "INTERNAL"
                    ? "border-violet-300 bg-violet-50 text-violet-900"
                    : "border-sky-300 bg-sky-50 text-sky-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      <p id={descriptionId} className="text-xs text-slate-500">
        {visibilityDescription(value)}
      </p>
    </div>
  );
}

function CommentComposer({
  placeholder,
  submitLabel,
  onSubmit,
  pending,
  autoFocus,
  onCancel,
  canChooseVisibility,
  lockedVisibility,
  defaultVisibility = "PUBLIC",
}: {
  placeholder: string;
  submitLabel: string;
  onSubmit: (
    content: string,
    mentionedUserIds: string[],
    visibility: CommentVisibility,
  ) => Promise<boolean>;
  pending: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
  canChooseVisibility: boolean;
  lockedVisibility?: CommentVisibility | null;
  defaultVisibility?: CommentVisibility;
}) {
  const listId = useId();
  const optionIdPrefix = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchSeq = useRef(0);

  const [value, setValue] = useState("");
  const [cursor, setCursor] = useState(0);
  const [pendingMentions, setPendingMentions] = useState<PendingMention[]>([]);
  const [suggestions, setSuggestions] = useState<MentionableUserDTO[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [visibility, setVisibility] = useState<CommentVisibility>(
    lockedVisibility ?? defaultVisibility,
  );
  const empty = !value.trim();
  const effectiveVisibility = lockedVisibility ?? visibility;

  useEffect(() => {
    if (lockedVisibility) setVisibility(lockedVisibility);
  }, [lockedVisibility]);

  const mentionState = useMemo(
    () => detectMentionQuery(value, cursor),
    [value, cursor],
  );

  const syncCaretFromDom = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    setCursor(el.selectionStart ?? el.value.length);
  }, []);

  const updateDropdownPosition = useCallback((state: MentionQueryState | null) => {
    const el = textareaRef.current;
    if (!el || !state) {
      setDropdownPos(null);
      return;
    }
    const caret = getTextareaCaretClientRect(el, state.atIndex);
    const box = el.getBoundingClientRect();
    const width = Math.min(320, Math.max(220, box.width));
    let left = Math.min(caret.left, box.right - width);
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    let top = caret.bottom + 6;
    const estimatedHeight = 220;
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, caret.top - estimatedHeight - 6);
    }
    setDropdownPos({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!mentionState) {
      setDropdownPos(null);
      return;
    }
    updateDropdownPosition(mentionState);
  }, [mentionState, value, updateDropdownPosition]);

  useEffect(() => {
    if (!mentionState) {
      setMentionOpen(false);
      setSuggestions([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    // Abre imediatamente ao detectar @ (mostra loading).
    setMentionOpen(true);
    setSearching(true);
    setSearchError(null);

    const seq = ++searchSeq.current;
    const query = mentionState.query;
    const handle = window.setTimeout(async () => {
      const result = await searchMentionableUsers(query, effectiveVisibility);
      if (seq !== searchSeq.current) return;
      setSearching(false);
      if (!("users" in result) || !result.ok) {
        setSuggestions([]);
        setSearchError(
          "message" in result
            ? result.message
            : "Não foi possível carregar os usuários.",
        );
        return;
      }
      setSuggestions(result.users);
      setActiveIndex(0);
      setSearchError(null);
    }, 120);

    return () => {
      window.clearTimeout(handle);
    };
  }, [mentionState, effectiveVisibility]);

  useEffect(() => {
    if (!mentionOpen) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setMentionOpen(false);
    }

    function onReposition() {
      if (mentionState) updateDropdownPosition(mentionState);
    }

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [mentionOpen, mentionState, updateDropdownPosition]);

  function applyMention(user: MentionableUserDTO) {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? cursor;
    const result = insertMentionAt(value, caret, {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    });
    setValue(result.text);
    setCursor(result.cursor);
    setPendingMentions((prev) =>
      retainMentionsInContent(result.text, [...prev, result.pending]),
    );
    setMentionOpen(false);
    setSuggestions([]);
    setSearchError(null);
    searchSeq.current += 1;
    requestAnimationFrame(() => {
      const field = textareaRef.current;
      if (!field) return;
      field.focus();
      field.setSelectionRange(result.cursor, result.cursor);
      setCursor(result.cursor);
    });
  }

  function onChangeValue(next: string, nextCursor: number) {
    setValue(next);
    setCursor(nextCursor);
    setPendingMentions((prev) => retainMentionsInContent(next, prev));
  }

  const showDropdown = mentionOpen && Boolean(mentionState) && Boolean(dropdownPos);

  return (
    <div
      ref={rootRef}
      className="relative space-y-3 rounded-xl border border-[var(--border)] bg-white p-3 sm:p-4"
    >
      <CommentVisibilityControl
        value={effectiveVisibility}
        onChange={setVisibility}
        allowInternal={canChooseVisibility && !lockedVisibility}
        locked={Boolean(lockedVisibility)}
        disabled={pending}
      />

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChangeValue(
            e.target.value,
            e.target.selectionStart ?? e.target.value.length,
          );
        }}
        onClick={syncCaretFromDom}
        onKeyUp={syncCaretFromDom}
        onSelect={syncCaretFromDom}
        onKeyDown={(e) => {
          if (!mentionOpen || !mentionState) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) =>
              suggestions.length ? (i + 1) % suggestions.length : 0,
            );
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) =>
              suggestions.length
                ? (i - 1 + suggestions.length) % suggestions.length
                : 0,
            );
            return;
          }
          if (
            (e.key === "Enter" || e.key === "Tab") &&
            suggestions[activeIndex]
          ) {
            e.preventDefault();
            applyMention(suggestions[activeIndex]!);
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setMentionOpen(false);
            searchSeq.current += 1;
          }
        }}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        disabled={pending}
        aria-autocomplete="list"
        aria-controls={showDropdown ? listId : undefined}
        aria-expanded={showDropdown}
        aria-activedescendant={
          showDropdown && suggestions[activeIndex]
            ? `${optionIdPrefix}-${suggestions[activeIndex]!.id}`
            : undefined
        }
        className="w-full resize-y rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 disabled:opacity-60"
      />

      {showDropdown && dropdownPos
        ? createPortal(
            <div
              ref={dropdownRef}
              id={listId}
              role="listbox"
              aria-label="Usuários para mencionar"
              style={{
                position: "fixed",
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 200,
              }}
              className="overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-xl"
            >
              {searching ? (
                <p className="px-3 py-2.5 text-xs text-slate-500">
                  Buscando usuários...
                </p>
              ) : searchError ? (
                <p className="px-3 py-2.5 text-xs text-rose-600">
                  Não foi possível carregar os usuários.
                </p>
              ) : suggestions.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-slate-500">
                  Nenhum usuário encontrado
                </p>
              ) : (
                <ul className="max-h-56 overflow-y-auto py-1">
                  {suggestions.map((user, index) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        id={`${optionIdPrefix}-${user.id}`}
                        role="option"
                        aria-selected={index === activeIndex}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                          index === activeIndex
                            ? "bg-sky-50 text-sky-900"
                            : "text-slate-800 hover:bg-slate-50",
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => applyMention(user)}
                      >
                        <AuthorAvatar name={user.fullName} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {user.fullName}
                          </span>
                          {user.email ? (
                            <span className="block truncate text-xs text-slate-500">
                              {user.email}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>,
            document.body,
          )
        : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onCancel}
          >
            Cancelar
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={empty || pending}
          onClick={async () => {
            const mentions = retainMentionsInContent(value, pendingMentions);
            const ok = await onSubmit(
              value.trim(),
              mentions.map((m) => m.userId),
              effectiveVisibility,
            );
            if (ok) {
              setValue("");
              setPendingMentions([]);
              setMentionOpen(false);
              setCursor(0);
              searchSeq.current += 1;
              if (!lockedVisibility) setVisibility(defaultVisibility);
            }
          }}
        >
          {pending ? "Enviando…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function FeatureComments({
  featureId,
  className,
  compact = false,
  /** Modal de canal: trava leitura/criação neste FCC. */
  featureChannelContextId = null,
  /** Ficha geral: chips Todos / Geral / canais. */
  channelFilterOptions,
}: {
  featureId: string;
  className?: string;
  /** Layout mais denso para drawer/pré-visualização. */
  compact?: boolean;
  featureChannelContextId?: string | null;
  channelFilterOptions?: CommentChannelFilterOption[];
}) {
  const { role, userId } = useAuth();
  const canCreate = Boolean(userId) && roleCan(role, "comment.create");
  const canDelete = roleCan(role, "comment.delete");
  const showInternal = canViewInternalComments(role);
  const canChooseVisibility = canCreateInternalComments(role);
  const lockedFccId = featureChannelContextId
    ? String(featureChannelContextId).trim() || null
    : null;
  const showChannelFilters =
    !lockedFccId && Boolean(channelFilterOptions?.length);

  const [comments, setComments] = useState<FeatureCommentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeatureCommentDTO | null>(
    null,
  );
  const [tab, setTab] = useState<CommentFilterTab>(
    showInternal ? "all" : "public",
  );
  const [channelFilterValue, setChannelFilterValue] = useState("__all__");
  const [pending, startTransition] = useTransition();

  const channelScope: ChannelCommentScope = useMemo(() => {
    if (lockedFccId) return { type: "fcc", fccIds: [lockedFccId] };
    if (channelFilterValue === "__general__") return { type: "general" };
    if (channelFilterValue === "__all__") return { type: "all" };
    const opt = channelFilterOptions?.find(
      (o) => o.value === channelFilterValue,
    );
    if (opt?.fccIds?.length) return { type: "fcc", fccIds: opt.fccIds };
    return { type: "all" };
  }, [lockedFccId, channelFilterValue, channelFilterOptions]);

  useEffect(() => {
    if (!showInternal && tab !== "public") setTab("public");
  }, [showInternal, tab]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listFeatureComments(featureId);
    if (!("comments" in result) || !result.ok) {
      setError(
        "message" in result ? result.message : "Erro ao carregar comentários.",
      );
      setComments([]);
      setLoading(false);
      return;
    }
    setComments(result.comments);
    setLoading(false);
  }, [featureId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const commentId = params.get("comment");
    const targetId = commentId
      ? `comment-${commentId}`
      : window.location.hash === "#comentarios"
        ? "comentarios"
        : null;
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (el) {
      window.requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [loading, comments]);

  useEffect(() => {
    return subscribeFeatureCommentsChanged((changedId) => {
      if (changedId === featureId) void reload();
    });
  }, [featureId, reload]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void reload();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  const scopedComments = useMemo(
    () => filterCommentsByChannelScope(comments, channelScope),
    [comments, channelScope],
  );

  const filtered = useMemo(
    () => filterCommentsByTab(scopedComments, tab, role),
    [scopedComments, tab, role],
  );

  const roots = useMemo(
    () => filtered.filter((c) => !c.parentCommentId),
    [filtered],
  );

  const repliesByParent = useMemo(() => {
    const map = new Map<string, FeatureCommentDTO[]>();
    for (const c of filtered) {
      if (!c.parentCommentId) continue;
      const list = map.get(c.parentCommentId) ?? [];
      list.push(c);
      map.set(c.parentCommentId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return map;
  }, [filtered]);

  const totalCount = scopedComments.length;

  async function handleCreate(
    content: string,
    mentionedUserIds: string[],
    visibility: CommentVisibility,
    parentCommentId?: string | null,
  ): Promise<boolean> {
    const fccForCreate = resolveCreateFeatureChannelContextId({
      lockedFccId,
      channelFilter: channelScope,
    });
    return await new Promise((resolve) => {
      startTransition(async () => {
        const result = await createFeatureComment({
          featureId,
          content,
          parentCommentId: parentCommentId ?? null,
          featureChannelContextId: fccForCreate,
          mentionedUserIds,
          visibility,
        });
        if (!result.ok) {
          setError(result.message);
          resolve(false);
          return;
        }
        setError(null);
        setReplyToId(null);
        await reload();
        notifyFeatureCommentsChanged(featureId);
        resolve(true);
      });
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteFeatureComment(deleteTarget.id);
      if (!result.ok) {
        setError(result.message);
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      setError(null);
      await reload();
      notifyFeatureCommentsChanged(featureId);
    });
  }

  function renderComment(comment: FeatureCommentDTO, isReply: boolean) {
    const replies = repliesByParent.get(comment.id) ?? [];
    return (
      <li
        key={comment.id}
        id={`comment-${comment.id}`}
        className={cn(
          "min-w-0 scroll-mt-24",
          isReply && "border-l-2 border-slate-200 pl-3 sm:pl-4",
        )}
      >
        <div className="flex gap-3">
          <AuthorAvatar name={comment.authorName} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {comment.authorName}
                  </p>
                  <VisibilityBadge visibility={comment.visibility} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDateTime(comment.createdAt)}
                </p>
              </div>
              {canDelete ? (
                <ActionMenu
                  label="Ações do comentário"
                  items={[
                    {
                      label: "Excluir",
                      tone: "danger",
                      onSelect: () => setDeleteTarget(comment),
                    },
                  ]}
                />
              ) : null}
            </div>
            <CommentBody comment={comment} />
            {canCreate &&
            (comment.visibility === "PUBLIC" || showInternal) ? (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[var(--brand)]"
                onClick={() =>
                  setReplyToId((current) =>
                    current === comment.id ? null : comment.id,
                  )
                }
              >
                <Reply className="h-3.5 w-3.5" aria-hidden />
                Responder
              </button>
            ) : null}
            {replyToId === comment.id ? (
              <div className="mt-3">
                <CommentComposer
                  placeholder="Escrever resposta... Use @ para mencionar"
                  submitLabel="Responder"
                  pending={pending}
                  autoFocus
                  onCancel={() => setReplyToId(null)}
                  canChooseVisibility={canChooseVisibility}
                  lockedVisibility={comment.visibility}
                  onSubmit={(content, mentionedUserIds, visibility) =>
                    handleCreate(
                      content,
                      mentionedUserIds,
                      visibility,
                      comment.id,
                    )
                  }
                />
              </div>
            ) : null}
            {!isReply && replies.length > 0 ? (
              <ul className="mt-4 space-y-4">
                {replies.map((reply) => renderComment(reply, true))}
              </ul>
            ) : null}
          </div>
        </div>
      </li>
    );
  }

  const tabs: Array<{ id: CommentFilterTab; label: string }> = showInternal
    ? [
        { id: "all", label: "Todos" },
        { id: "public", label: "Públicos" },
        { id: "internal", label: "Internos" },
      ]
    : [{ id: "public", label: "Públicos" }];

  return (
    <section id="comentarios" className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          className={cn(
            "font-semibold text-slate-900",
            compact ? "text-sm" : "text-lg",
          )}
        >
          Comentários
          <span className="ml-1.5 font-normal text-slate-500">
            · {totalCount}
          </span>
        </h2>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtro de comentários">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              tab === t.id
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showChannelFilters ? (
        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Filtro por canal"
        >
          {(channelFilterOptions ?? []).map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={channelFilterValue === opt.value}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                channelFilterValue === opt.value
                  ? "bg-sky-700 text-white"
                  : "bg-sky-50 text-sky-800 hover:bg-sky-100",
              )}
              onClick={() => setChannelFilterValue(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando comentários…</p>
      ) : roots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-slate-50/60 px-4 py-8 text-center">
          <MessageSquare className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            {emptyCommentsMessage(tab, role)}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            Adicione um comentário para registrar uma dúvida, decisão ou
            observação sobre esta funcionalidade.
          </p>
        </div>
      ) : (
        <ul className="space-y-5">
          {roots.map((comment) => renderComment(comment, false))}
        </ul>
      )}

      {canCreate ? (
        <CommentComposer
          placeholder="Adicione um comentário... Use @ para mencionar"
          submitLabel="Comentar"
          pending={pending}
          canChooseVisibility={canChooseVisibility}
          defaultVisibility="PUBLIC"
          onSubmit={(content, mentionedUserIds, visibility) =>
            handleCreate(content, mentionedUserIds, visibility)
          }
        />
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-xs text-slate-500">
          Faça login para adicionar um comentário.
        </p>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir comentário?"
        description="Este comentário será removido permanentemente."
        confirmLabel={pending ? "Excluindo…" : "Excluir"}
        cancelLabel="Cancelar"
        tone="danger"
        onCancel={() => {
          if (!pending) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
      />
    </section>
  );
}
