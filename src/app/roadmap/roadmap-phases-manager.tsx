"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveRoadmapPhase,
  upsertRoadmapPhase,
} from "@/app/actions/crud";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RoadmapPhaseDef } from "@/types";
import { Pencil, Plus, Trash2, X } from "lucide-react";

type PhaseDraft = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  sortOrder: number;
  isNew?: boolean;
};

function toDrafts(phases: RoadmapPhaseDef[]): PhaseDraft[] {
  return phases
    .filter((p) => p.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      symbol: p.symbol ?? "",
      sortOrder: p.sortOrder,
    }));
}

export function RoadmapPhasesManager({
  open,
  onClose,
  phases,
  canEdit,
  usageByCode,
}: {
  open: boolean;
  onClose: () => void;
  phases: RoadmapPhaseDef[];
  canEdit: boolean;
  usageByCode: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<PhaseDraft[]>(() => toDrafts(phases));
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDrafts(toDrafts(phases));
      setEditingId(null);
      setMessage(null);
    }
  }, [open, phases]);

  const sorted = useMemo(
    () => [...drafts].sort((a, b) => a.sortOrder - b.sortOrder),
    [drafts],
  );

  if (!open) return null;

  function addPhase() {
    const nextOrder =
      drafts.reduce((max, d) => Math.max(max, d.sortOrder), 0) + 1;
    const id = `new-${crypto.randomUUID().slice(0, 8)}`;
    setDrafts((prev) => [
      ...prev,
      {
        id,
        code: "",
        name: "",
        symbol: "◐",
        sortOrder: nextOrder,
        isNew: true,
      },
    ]);
    setEditingId(id);
  }

  function updateDraft(id: string, patch: Partial<PhaseDraft>) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    );
  }

  function savePhase(row: PhaseDraft) {
    if (!row.name.trim()) {
      setMessage("Informe o nome do status.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      if (!row.isNew) fd.set("id", row.id);
      fd.set("name", row.name.trim());
      if (row.code.trim()) fd.set("code", row.code.trim());
      fd.set("symbol", row.symbol.trim());
      fd.set("sort_order", String(row.sortOrder));
      fd.set("active", "true");
      const result = await upsertRoadmapPhase(fd);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setMessage("Status salvo.");
      setEditingId(null);
      router.refresh();
    });
  }

  function removePhase(row: PhaseDraft) {
    if (row.isNew) {
      setDrafts((prev) => prev.filter((d) => d.id !== row.id));
      return;
    }
    const usage = usageByCode[row.code] ?? 0;
    if (usage > 0) {
      setMessage(
        `Não é possível excluir "${row.name}": ${usage} item(ns) ainda usam este status.`,
      );
      return;
    }
    if (!confirm(`Excluir o status "${row.name}"?`)) return;
    startTransition(async () => {
      const result = await archiveRoadmapPhase(row.id, row.code);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setDrafts((prev) => prev.filter((d) => d.id !== row.id));
      setMessage("Status excluído.");
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="phases-manager-title"
        className="relative z-[81] flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              Gestão de entregas
            </p>
            <h2
              id="phases-manager-title"
              className="mt-1 text-lg font-semibold text-slate-900"
            >
              Editar status
            </h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Adicione, renomeie, reordene ou exclua status do Kanban.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-5">
          {sorted.map((row) => {
            const editing = editingId === row.id;
            const usage = usageByCode[row.code] ?? 0;
            return (
              <div
                key={row.id}
                className="rounded-xl border border-[var(--border)] bg-white p-3"
              >
                {editing && canEdit ? (
                  <div className="grid gap-2 sm:grid-cols-[70px_70px_1fr_auto]">
                    <label className="space-y-1 text-[11px] font-medium text-slate-600">
                      Ordem
                      <input
                        type="number"
                        value={row.sortOrder}
                        onChange={(e) =>
                          updateDraft(row.id, {
                            sortOrder: Number(e.target.value) || 0,
                          })
                        }
                        className="h-9 w-full rounded-lg border border-[var(--border)] px-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1 text-[11px] font-medium text-slate-600">
                      Símbolo
                      <input
                        value={row.symbol}
                        onChange={(e) =>
                          updateDraft(row.id, { symbol: e.target.value })
                        }
                        placeholder="◌"
                        className="h-9 w-full rounded-lg border border-[var(--border)] px-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1 text-[11px] font-medium text-slate-600">
                      Nome
                      <input
                        value={row.name}
                        onChange={(e) =>
                          updateDraft(row.id, { name: e.target.value })
                        }
                        placeholder="Ex.: Backlog"
                        className="h-9 w-full rounded-lg border border-[var(--border)] px-2 text-sm"
                      />
                    </label>
                    <div className="flex items-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => savePhase(row)}
                        disabled={pending}
                      >
                        Salvar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                    {row.isNew ? (
                      <p className="sm:col-span-4 text-[11px] text-slate-400">
                        O código do status será gerado a partir do nome.
                      </p>
                    ) : (
                      <p className="sm:col-span-4 text-[11px] text-slate-400">
                        Código: {row.code}
                        {usage > 0 ? ` · ${usage} item(ns)` : ""}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        <span className="mr-2 text-xs font-bold text-slate-400">
                          {row.sortOrder}.
                        </span>
                        {row.name || "Novo status"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {row.code || "—"}
                        {usage > 0 ? ` · ${usage} item(ns) em uso` : ""}
                      </p>
                    </div>
                    {canEdit ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(row.id)}
                          className="rounded-lg p-2 text-[var(--brand)] hover:bg-[var(--brand-soft)]"
                          aria-label="Editar status"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePhase(row)}
                          disabled={pending}
                          className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                          aria-label="Excluir status"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
          {sorted.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-slate-400">
              Nenhum status cadastrado.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4">
          <p
            className={cn(
              "text-xs",
              message?.includes("salva") || message?.includes("excluída")
                ? "text-emerald-700"
                : "text-slate-500",
            )}
          >
            {message ??
              (canEdit
                ? "Alterações são salvas por status."
                : "Somente leitura.")}
          </p>
          <div className="flex gap-2">
            {canEdit ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addPhase}
                disabled={pending}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar status
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
