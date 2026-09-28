"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
  insertMentionAt,
  retainMentionsInContent,
  segmentCommentContent,
  type PendingMention,
} from "@/lib/comment-mentions";
import {
  notifyFeatureCommentsChanged,
  subscribeFeatureCommentsChanged,
} from "@/lib/comment-sync";
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
import { MessageSquare } from "lucide-react";

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
      <Badge className="bg-violet-50 text-violet-900 ring-violet-200">
        Interno
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-50 text-slate-700 ring-slate-200">Público</Badge>
  );
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

function VisibilitySelect({
  value,
  onChange,
  locked,
  disabled,
}: {
  value: CommentVisibility;
  onChange: (v: CommentVisibility) => void;
  locked?: boolean;
  disabled?: boolean;
}) {
  const selectId = useId();
  return (
    <div className="space-y-1">
      <label className="sr-only" htmlFor={selectId}>
        Visibilidade do comentário
      </label>
      <select
        id={selectId}
        value={value}
        disabled={disabled || locked}
        onChange={(e) =>
          onChange(
            e.target.value === "INTERNAL" ? "INTERNAL" : "PUBLIC",
          )
        }
        className="h-8 rounded-md border border-[var(--border)] bg-white px-2 text-xs font-medium text-slate-800 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 disabled:cursor-not-allowed disabled:opacity-70"
        title={
          locked
            ? "A resposta herda a visibilidade do comentário pai"
            : undefined
        }
      >
        <option value="PUBLIC">Público — visível para todos os usuários</option>
        <option value="INTERNAL">
          Interno — visível apenas para Editores e Administradores
        </option>
      </select>
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [cursor, setCursor] = useState(0);
  const [pendingMentions, setPendingMentions] = useState<PendingMention[]>([]);
  const [suggestions, setSuggestions] = useState<MentionableUserDTO[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!mentionState) {
      setMentionOpen(false);
      setSuggestions([]);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      const result = await searchMentionableUsers(
        mentionState.query,
        effectiveVisibility,
      );
      if (cancelled) return;
      setSearching(false);
      if (!("users" in result) || !result.ok) {
        setSuggestions([]);
        setSearchError(
          "message" in result ? result.message : "Falha ao buscar usuários.",
        );
        setMentionOpen(true);
        return;
      }
      setSuggestions(result.users);
      setActiveIndex(0);
      setMentionOpen(true);
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [mentionState, effectiveVisibility]);

  function syncCursor() {
    const el = textareaRef.current;
    if (el) setCursor(el.selectionStart ?? value.length);
  }

  function applyMention(user: MentionableUserDTO) {
    const result = insertMentionAt(value, cursor, {
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
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(result.cursor, result.cursor);
    });
  }

  function onChangeValue(next: string) {
    setValue(next);
    setPendingMentions((prev) => retainMentionsInContent(next, prev));
  }

  return (
    <div className="relative space-y-2">
      {canChooseVisibility ? (
        <VisibilitySelect
          value={effectiveVisibility}
          onChange={setVisibility}
          locked={Boolean(lockedVisibility)}
          disabled={pending}
        />
      ) : null}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChangeValue(e.target.value);
          setCursor(e.target.selectionStart ?? e.target.value.length);
        }}
        onClick={syncCursor}
        onKeyUp={syncCursor}
        onSelect={syncCursor}
        onKeyDown={(e) => {
          if (!mentionOpen) return;
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
          if (e.key === "Enter" && suggestions[activeIndex]) {
            e.preventDefault();
            applyMention(suggestions[activeIndex]!);
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setMentionOpen(false);
          }
        }}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        disabled={pending}
        aria-autocomplete="list"
        aria-controls={mentionOpen ? listId : undefined}
        aria-expanded={mentionOpen}
        className="w-full resize-y rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 disabled:opacity-60"
      />

      {mentionOpen ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-w-sm overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-lg"
        >
          {searching ? (
            <p className="px-3 py-2 text-xs text-slate-500">Buscando…</p>
          ) : searchError ? (
            <p className="px-3 py-2 text-xs text-rose-600">{searchError}</p>
          ) : suggestions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">
              Nenhum usuário encontrado
            </p>
          ) : (
            <ul className="max-h-48 overflow-y-auto py-1">
              {suggestions.map((user, index) => (
                <li key={user.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                      index === activeIndex
                        ? "bg-sky-50 text-sky-900"
                        : "text-slate-800 hover:bg-slate-50",
                    )}
                    onMouseDown={(e) => e.preventDefault()}
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
        </div>
      ) : null}

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
}: {
  featureId: string;
  className?: string;
  /** Layout mais denso para drawer/pré-visualização. */
  compact?: boolean;
}) {
  const { role, userId } = useAuth();
  const canCreate = Boolean(userId) && roleCan(role, "comment.create");
  const canDelete = roleCan(role, "comment.delete");
  const showInternal = canViewInternalComments(role);
  const canChooseVisibility = canCreateInternalComments(role);

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
  const [pending, startTransition] = useTransition();

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

  const filtered = useMemo(
    () => filterCommentsByTab(comments, tab, role),
    [comments, tab, role],
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

  const totalCount = comments.length;

  async function handleCreate(
    content: string,
    mentionedUserIds: string[],
    visibility: CommentVisibility,
    parentCommentId?: string | null,
  ): Promise<boolean> {
    return await new Promise((resolve) => {
      startTransition(async () => {
        const result = await createFeatureComment({
          featureId,
          content,
          parentCommentId: parentCommentId ?? null,
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
        className={cn(
          "min-w-0",
          isReply && "border-l-2 border-slate-200 pl-3 sm:pl-4",
        )}
      >
        <div className="flex gap-3">
          <AuthorAvatar name={comment.authorName} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <VisibilityBadge visibility={comment.visibility} />
                <p className="truncate text-sm font-semibold text-slate-900">
                  {comment.authorName}
                </p>
                <p className="text-xs text-slate-500">
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
                className="mt-2 text-xs font-medium text-[var(--brand)] hover:underline"
                onClick={() =>
                  setReplyToId((current) =>
                    current === comment.id ? null : comment.id,
                  )
                }
              >
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
    <section className={cn("space-y-4", className)}>
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
