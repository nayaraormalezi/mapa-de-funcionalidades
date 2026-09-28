"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  createFeatureComment,
  deleteFeatureComment,
  listFeatureComments,
  type FeatureCommentDTO,
} from "@/app/actions/comments";
import { useAuth } from "@/components/auth/auth-provider";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
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

function CommentComposer({
  placeholder,
  submitLabel,
  onSubmit,
  pending,
  autoFocus,
  onCancel,
}: {
  placeholder: string;
  submitLabel: string;
  onSubmit: (content: string) => Promise<boolean>;
  pending: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState("");
  const empty = !value.trim();

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        disabled={pending}
        className="w-full resize-y rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 disabled:opacity-60"
      />
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
            const ok = await onSubmit(value.trim());
            if (ok) setValue("");
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

  const [comments, setComments] = useState<FeatureCommentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeatureCommentDTO | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listFeatureComments(featureId);
    if (!("comments" in result) || !result.ok) {
      setError("message" in result ? result.message : "Erro ao carregar comentários.");
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

  const roots = useMemo(
    () => comments.filter((c) => !c.parentCommentId),
    [comments],
  );

  const repliesByParent = useMemo(() => {
    const map = new Map<string, FeatureCommentDTO[]>();
    for (const c of comments) {
      if (!c.parentCommentId) continue;
      const list = map.get(c.parentCommentId) ?? [];
      list.push(c);
      map.set(c.parentCommentId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return map;
  }, [comments]);

  const totalCount = comments.length;

  async function handleCreate(
    content: string,
    parentCommentId?: string | null,
  ): Promise<boolean> {
    return await new Promise((resolve) => {
      startTransition(async () => {
        const result = await createFeatureComment({
          featureId,
          content,
          parentCommentId: parentCommentId ?? null,
        });
        if (!result.ok) {
          setError(result.message);
          resolve(false);
          return;
        }
        setError(null);
        setReplyToId(null);
        await reload();
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
              <div className="min-w-0">
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
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
              {comment.content}
            </p>
            {canCreate ? (
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
                  placeholder="Escrever resposta..."
                  submitLabel="Responder"
                  pending={pending}
                  autoFocus
                  onCancel={() => setReplyToId(null)}
                  onSubmit={(content) => handleCreate(content, comment.id)}
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

      {canCreate ? (
        <CommentComposer
          placeholder="Adicione um comentário..."
          submitLabel="Comentar"
          pending={pending}
          onSubmit={(content) => handleCreate(content)}
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
            Nenhum comentário ainda
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
