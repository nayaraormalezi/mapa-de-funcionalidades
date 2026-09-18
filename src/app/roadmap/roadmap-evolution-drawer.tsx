"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertFeatureEvolution } from "@/app/actions/crud";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { Button } from "@/components/ui/button";
import {
  EVOLUTION_PHASE_ORDER,
  evolutionPhaseLabel,
  evolutionStatusLabel,
} from "@/lib/labels";
import { cn, formatDate } from "@/lib/utils";
import type { EvolutionPhase } from "@/types";
import { X } from "lucide-react";
import {
  formatMonthYear,
  type FeatureEvolution,
  type RoadmapImpl,
} from "@/app/roadmap/roadmap-types";

export function RoadmapEvolutionDrawer({
  evo,
  item,
  canEdit,
  onClose,
  onOpenFeature,
}: {
  evo: FeatureEvolution;
  item: RoadmapImpl;
  canEdit: boolean;
  onClose: () => void;
  onOpenFeature: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const currentPhase: EvolutionPhase =
    evo.status === "DONE" || evo.phase === "DONE" ? "DONE" : evo.phase;

  function setPhase(next: EvolutionPhase) {
    if (!canEdit) return;
    const fd = new FormData();
    fd.set("id", evo.id);
    fd.set("feature_channel_context_id", evo.featureChannelContextId);
    fd.set("title", evo.title);
    fd.set("description", evo.description);
    fd.set("phase", next);
    fd.set("status", next === "DONE" ? "DONE" : "IN_PROGRESS");
    fd.set("priority", evo.priority);
    if (evo.startDate) fd.set("start_date", evo.startDate.slice(0, 10));
    if (evo.expectedDate) fd.set("expected_date", evo.expectedDate.slice(0, 10));
    if (next === "DONE") {
      fd.set("completed_date", new Date().toISOString().slice(0, 10));
    }
    fd.set("responsible", evo.responsible);
    fd.set("notes", evo.notes);
    if (evo.origin) fd.set("origin", evo.origin);

    startTransition(async () => {
      const result = await upsertFeatureEvolution(fd);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-[85] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40"
        aria-label="Fechar"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="evo-drawer-title"
        className="relative z-[86] flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-amber-700 uppercase">
              ✦ Evolução
            </p>
            <h2
              id="evo-drawer-title"
              className="mt-1 text-lg font-semibold text-slate-900"
            >
              {evo.title}
            </h2>
            <button
              type="button"
              onClick={onOpenFeature}
              className="mt-1 text-xs font-medium text-[var(--brand)] hover:underline"
            >
              {item.featureName} →
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-[11px] font-semibold text-slate-400 uppercase">
                Funcionalidade
              </dt>
              <dd className="text-slate-800">{item.featureName}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold text-slate-400 uppercase">
                Canal
              </dt>
              <dd className="text-slate-800">
                {item.channelName}
                <span className="text-slate-400">
                  {" "}
                  · {item.audienceName} · {item.momentName}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold text-slate-400 uppercase">
                Implementação
              </dt>
              <dd className="text-slate-800">
                ● Disponível permanece — a evolução tem ciclo próprio
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Status</h3>
            <p className="mt-1 text-sm font-medium text-amber-800">
              ● {evolutionPhaseLabel(currentPhase)}
              <span className="ml-2 text-xs font-normal text-slate-500">
                {evolutionStatusLabel[evo.status]}
              </span>
            </p>
            <ol className="mt-3 space-y-2">
              {EVOLUTION_PHASE_ORDER.map((step) => {
                const idx = EVOLUTION_PHASE_ORDER.indexOf(step);
                const cur = EVOLUTION_PHASE_ORDER.indexOf(currentPhase);
                const done = idx < cur || currentPhase === "DONE";
                const current = step === currentPhase;
                return (
                  <li key={step} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                        current && "bg-amber-500 text-white",
                        done && !current && "bg-emerald-100 text-emerald-700",
                        !done && !current && "bg-slate-100 text-slate-400",
                      )}
                    >
                      {done && !current ? "✓" : current ? "●" : "○"}
                    </span>
                    <button
                      type="button"
                      disabled={!canEdit || pending}
                      onClick={() => setPhase(step)}
                      className={cn(
                        "text-sm",
                        current && "font-semibold text-slate-900",
                        done && !current && "text-slate-500",
                        !done && !current && "text-slate-400",
                        canEdit && "hover:text-[var(--brand)]",
                      )}
                    >
                      {evolutionPhaseLabel(step)}
                      {current ? " atual" : ""}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Detalhes</h3>
            <dl className="mt-2 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Prioridade</dt>
                <dd>
                  <PriorityBadge priority={evo.priority} />
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Responsável</dt>
                <dd className="text-slate-800">{evo.responsible || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Início</dt>
                <dd className="text-slate-800">{formatDate(evo.startDate)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Previsão</dt>
                <dd className="text-slate-800">
                  {formatMonthYear(evo.expectedDate)}
                </dd>
              </div>
              {evo.completedDate ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Concluída em</dt>
                  <dd className="text-slate-800">
                    {formatMonthYear(evo.completedDate)}
                  </dd>
                </div>
              ) : null}
            </dl>
            {evo.description ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {evo.description}
              </p>
            ) : null}
          </div>

          {canEdit && currentPhase !== "DONE" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setPhase("DONE")}
            >
              Marcar como concluída
            </Button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
