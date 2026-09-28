"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { upsertFeatureEvolution } from "@/app/actions/crud";
import { FeatureComments } from "@/components/feature/feature-comments";
import { StageBadge } from "@/components/badges/stage-badge";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { Button } from "@/components/ui/button";
import {
  evolutionPhaseLabel,
  evolutionPhaseOptions,
  evolutionStatusLabel,
  priorityLabel,
  temporalStatusLabel,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types";
import { Plus, X } from "lucide-react";
import {
  activeEvolutions,
  doneEvolutions,
  formatMonthYear,
  type FeatureEvolution,
  type RoadmapImpl,
} from "@/app/roadmap/roadmap-types";

export function RoadmapFeatureDrawer({
  featureId,
  featureName,
  contexts,
  canEdit,
  onClose,
  onOpenEvolution,
}: {
  featureId: string;
  featureName: string;
  contexts: RoadmapImpl[];
  canEdit: boolean;
  onClose: () => void;
  onOpenEvolution?: (item: RoadmapImpl, evo: FeatureEvolution) => void;
}) {
  const primary = contexts[0];
  const audiences = [...new Set(contexts.map((c) => c.audienceName))];
  const moments = [...new Set(contexts.map((c) => c.momentName))];
  const journeys = [...new Set(contexts.map((c) => c.journeyName))];
  const needs = [...new Set(contexts.map((c) => c.userNeedName))];
  const allActive = contexts.flatMap((c) =>
    activeEvolutions(c).map((e) => ({ ctx: c, evo: e })),
  );
  const allDone = contexts.flatMap((c) =>
    doneEvolutions(c).map((e) => ({ ctx: c, evo: e })),
  );

  const [addingFor, setAddingFor] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40"
        aria-label="Fechar"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="roadmap-drawer-title"
        className="relative z-[81] flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              Funcionalidade
            </p>
            <h2
              id="roadmap-drawer-title"
              className="mt-1 text-lg font-semibold text-slate-900"
            >
              {featureName}
            </h2>
            <Link
              href={`/funcionalidades/${featureId}`}
              className="mt-1 inline-block text-xs font-medium text-[var(--brand)] hover:underline"
            >
              Abrir ficha completa →
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

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <dl className="grid gap-3 text-sm">
            <MetaRow label="Público" value={audiences.join(", ") || "—"} />
            <MetaRow label="Momento" value={moments.join(", ") || "—"} />
            <MetaRow label="Jornada" value={journeys.join(", ") || "—"} />
            <MetaRow
              label="Necessidade"
              value={
                needs[0]
                  ? needs.length > 1
                    ? needs.join(" · ")
                    : needs[0]
                  : primary?.featureDescription || "—"
              }
            />
          </dl>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Cobertura por canal
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Fase da implementação (●) é independente das evoluções (✦).
            </p>
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-[var(--border)]">
              {contexts
                .slice()
                .sort((a, b) => a.channelName.localeCompare(b.channelName))
                .map((ctx) => {
                  const active = activeEvolutions(ctx);
                  return (
                    <li key={ctx.id} className="px-3.5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {ctx.channelName}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {ctx.audienceName} · {ctx.momentName}
                          </p>
                        </div>
                        <TemporalChip status={ctx.temporalStatus} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                          <span className="text-slate-400">●</span>
                          <StageBadge stage={ctx.phase} />
                        </span>
                        {active.length > 0 ? (
                          <span className="text-[11px] font-medium text-amber-700">
                            ✦{" "}
                            {active.length === 1
                              ? "1 evolução em andamento"
                              : `${active.length} evoluções em andamento`}
                          </span>
                        ) : null}
                      </div>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() =>
                            setAddingFor(
                              addingFor === ctx.id ? null : ctx.id,
                            )
                          }
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--brand)] hover:underline"
                        >
                          <Plus className="h-3 w-3" />
                          Adicionar evolução
                        </button>
                      ) : null}
                      {addingFor === ctx.id ? (
                        <AddEvolutionForm
                          fccId={ctx.id}
                          onDone={() => setAddingFor(null)}
                        />
                      ) : null}
                    </li>
                  );
                })}
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Evoluções</h3>
            </div>
            {allActive.length === 0 && allDone.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Nenhuma evolução em andamento
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {allActive.map(({ ctx, evo }) => (
                  <EvolutionCard
                    key={evo.id}
                    evo={evo}
                    channelName={ctx.channelName}
                    onView={
                      onOpenEvolution
                        ? () => onOpenEvolution(ctx, evo)
                        : undefined
                    }
                  />
                ))}
                {allDone.length > 0 ? (
                  <li className="pt-2">
                    <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                      Histórico
                    </p>
                    <ul className="space-y-2">
                      {allDone.map(({ ctx, evo }) => (
                        <EvolutionCard
                          key={evo.id}
                          evo={evo}
                          channelName={ctx.channelName}
                          done
                          onView={
                            onOpenEvolution
                              ? () => onOpenEvolution(ctx, evo)
                              : undefined
                          }
                        />
                      ))}
                    </ul>
                  </li>
                ) : null}
              </ul>
            )}
          </div>

          <FeatureComments featureId={featureId} compact />
        </div>
      </aside>
    </div>
  );
}

function EvolutionCard({
  evo,
  channelName,
  highlight,
  done,
  onView,
}: {
  evo: FeatureEvolution;
  channelName: string;
  highlight?: boolean;
  done?: boolean;
  onView?: () => void;
}) {
  return (
    <li
      className={cn(
        "rounded-xl border border-[var(--border)] px-3.5 py-3",
        highlight && "ring-2 ring-amber-300",
        done && "opacity-80",
      )}
    >
      <p className="text-sm font-medium text-slate-900">
        <span className="mr-1 text-amber-600">{done ? "✓" : "✦"}</span>
        {evo.title}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">{channelName}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          {evolutionPhaseLabel(evo.phase)}
        </span>
        <PriorityBadge priority={evo.priority} />
        <span className="text-[10px] text-slate-500">
          {evolutionStatusLabel[evo.status]}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Previsão: {formatMonthYear(evo.expectedDate)}
        {evo.responsible ? ` · ${evo.responsible}` : ""}
      </p>
      {evo.description ? (
        <p className="mt-1.5 text-xs text-slate-600">{evo.description}</p>
      ) : null}
      {onView ? (
        <button
          type="button"
          onClick={onView}
          className="mt-2 text-[11px] font-medium text-[var(--brand)] hover:underline"
        >
          Mostrar evolução →
        </button>
      ) : null}
    </li>
  );
}

function AddEvolutionForm({
  fccId,
  onDone,
}: {
  fccId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("feature_channel_context_id", fccId);
    formData.set("status", "IN_PROGRESS");
    formData.set("origin", "MANUAL");
    startTransition(async () => {
      const result = await upsertFeatureEvolution(formData);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <form action={handleSubmit} className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
      <input
        name="title"
        required
        placeholder="Título da evolução"
        className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
      />
      <textarea
        name="description"
        rows={2}
        placeholder="Descrição"
        className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-slate-600">
          Fase
          <select
            name="phase"
            defaultValue="UX_UI"
            className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
          >
            {evolutionPhaseOptions(false).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-slate-600">
          Prioridade
          <select
            name="priority"
            defaultValue="MEDIUM"
            className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
          >
            {(Object.keys(priorityLabel) as Priority[]).map((key) => (
              <option key={key} value={key}>
                {priorityLabel[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-slate-600">
          Início
          <input
            type="date"
            name="start_date"
            className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
          />
        </label>
        <label className="text-[11px] text-slate-600">
          Previsão
          <input
            type="date"
            name="expected_date"
            className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
          />
        </label>
      </div>
      <input
        name="responsible"
        placeholder="Responsável"
        className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Salvar evolução"}
        </Button>
      </div>
    </form>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-slate-800">{value}</dd>
    </div>
  );
}

function TemporalChip({
  status,
}: {
  status: RoadmapImpl["temporalStatus"];
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        status === "CURRENT" && "bg-emerald-50 text-emerald-700",
        status === "FUTURE" && "bg-cyan-50 text-cyan-800",
        status === "DEPRECATED" && "bg-stone-100 text-stone-600",
      )}
    >
      {temporalStatusLabel[status]}
    </span>
  );
}
