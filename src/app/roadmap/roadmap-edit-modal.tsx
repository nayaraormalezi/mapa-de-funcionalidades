"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { upsertRoadmapItem } from "@/app/actions/crud";
import { Button } from "@/components/ui/button";
import { featureStatusOptions } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { RoadmapPhase } from "@/types";
import { X } from "lucide-react";

export type RoadmapEditable = {
  id: string;
  featureId: string;
  featureName: string;
  phase: RoadmapPhase;
  startDate: string | null;
  expectedDate: string | null;
  actualDate: string | null;
  responsible: string;
  notes: string;
  channelContextId: string | null;
};

function toInputDate(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function RoadmapEditModal({
  item,
  canEdit,
  onClose,
}: {
  item: RoadmapEditable;
  phases?: { code: string; name: string; symbol?: string }[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const phaseOptions = featureStatusOptions();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await upsertRoadmapItem(formData);
      if (result.ok) {
        router.refresh();
        onClose();
      } else {
        alert(result.message);
      }
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
        aria-labelledby="roadmap-edit-title"
        className="relative z-[81] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              Roadmap
            </p>
            <h2
              id="roadmap-edit-title"
              className="mt-1 truncate text-lg font-semibold text-slate-900"
            >
              {item.featureName}
            </h2>
            <Link
              href={`/funcionalidades/${item.featureId}`}
              className="mt-1 inline-block text-xs font-medium text-[var(--brand)] hover:underline"
            >
              Ver funcionalidade →
            </Link>
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

        <form action={handleSubmit} className="space-y-3 p-5">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="feature_id" value={item.featureId} />
          {item.channelContextId ? (
            <input
              type="hidden"
              name="channel_context_id"
              value={item.channelContextId}
            />
          ) : null}
          {item.actualDate ? (
            <input type="hidden" name="actual_date" value={item.actualDate} />
          ) : null}

          <label className="block space-y-1 text-xs font-medium text-slate-600">
            Status
            <select
              name="phase"
              defaultValue={item.phase}
              disabled={!canEdit}
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm disabled:bg-slate-50"
            >
              {phaseOptions.map((phase) => (
                <option key={phase.value} value={phase.value}>
                  {phase.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-medium text-slate-600">
              Data início
              <input
                type="date"
                name="start_date"
                defaultValue={toInputDate(item.startDate)}
                disabled={!canEdit}
                className="h-9 w-full rounded-lg border border-[var(--border)] px-2 text-sm disabled:bg-slate-50"
              />
            </label>
            <label className="block space-y-1 text-xs font-medium text-slate-600">
              Previsão
              <input
                type="date"
                name="expected_date"
                defaultValue={toInputDate(item.expectedDate)}
                disabled={!canEdit}
                className="h-9 w-full rounded-lg border border-[var(--border)] px-2 text-sm disabled:bg-slate-50"
              />
            </label>
          </div>

          <label className="block space-y-1 text-xs font-medium text-slate-600">
            Responsável
            <input
              name="responsible"
              defaultValue={item.responsible}
              disabled={!canEdit}
              className="h-9 w-full rounded-lg border border-[var(--border)] px-2 text-sm disabled:bg-slate-50"
            />
          </label>

          <label className="block space-y-1 text-xs font-medium text-slate-600">
            Notas
            <textarea
              name="notes"
              rows={3}
              defaultValue={item.notes}
              disabled={!canEdit}
              className="w-full rounded-lg border border-[var(--border)] px-2 py-2 text-sm disabled:bg-slate-50"
            />
          </label>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {canEdit ? "Cancelar" : "Fechar"}
            </Button>
            {canEdit ? (
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Salvando…" : "Salvar"}
              </Button>
            ) : null}
          </div>
          {!canEdit ? (
            <p className={cn("text-xs text-slate-500")}>
              Você tem acesso somente leitura.
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
