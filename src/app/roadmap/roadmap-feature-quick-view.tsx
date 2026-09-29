"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  upsertFeatureChannelContext,
  upsertFeatureEvolution,
} from "@/app/actions/crud";
import {
  activeEvolutions,
  doneEvolutions,
  formatMonthYear,
  type FeatureEvolution,
  type RoadmapImpl,
} from "@/app/roadmap/roadmap-types";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { FeatureComments } from "@/components/feature/feature-comments";
import { WorkResponsiblesPanel } from "@/components/feature/work-responsibles-panel";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import {
  evolutionPhaseLabel,
  evolutionPhaseOptions,
  evolutionStatusLabel,
  featureStageLabel,
  featureStatusOptions,
  priorityLabel,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Priority, RoadmapPhase } from "@/types";
import {
  ExternalLink,
  Plus,
  X,
} from "lucide-react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

function toInputDate(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function RoadmapFeatureQuickView({
  featureId,
  featureName,
  contexts,
  focusImplId,
  canEdit,
  onClose,
  onOpenEvolution,
}: {
  featureId: string;
  featureName: string;
  contexts: RoadmapImpl[];
  /** Implementação clicada (destaque de status). */
  focusImplId?: string | null;
  canEdit: boolean;
  onClose: () => void;
  onOpenEvolution?: (item: RoadmapImpl, evo: FeatureEvolution) => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [addingFor, setAddingFor] = useState(false);
  const [showOtherContexts, setShowOtherContexts] = useState(false);
  const [savingDelivery, startSaveDelivery] = useTransition();

  /** Contexto que originou o clique — nunca o primeiro da lista por acaso. */
  const primary =
    (focusImplId
      ? contexts.find((c) => c.id === focusImplId)
      : undefined) ??
    contexts[0] ??
    null;

  const otherContexts = contexts
    .filter((c) => c.id !== primary?.id)
    .slice()
    .sort((a, b) => a.channelName.localeCompare(b.channelName, "pt-BR"));

  const deliveryActive = primary ? activeEvolutions(primary) : [];
  const deliveryDone = primary ? doneEvolutions(primary) : [];

  const statusPhase: RoadmapPhase | null = primary?.phase ?? null;

  useEffect(() => {
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const node = dialogRef.current;
    const focusables = node
      ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
      : [];
    (focusables[0] ?? node)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (items.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [onClose]);

  function openFullSheet() {
    onClose();
    router.push(`/funcionalidades/${featureId}`);
  }

  function saveDelivery(formData: FormData) {
    if (!primary || !canEdit) return;
    formData.set("id", primary.id);
    formData.set("feature_id", primary.featureId);
    formData.set("channel_context_id", primary.channelContextId);
    formData.set("product_id", primary.productId);
    formData.set("experience", primary.experience);
    formData.set("status", primary.status);
    if (primary.launchDate) {
      formData.set("launch_date", primary.launchDate.slice(0, 10));
    }
    startSaveDelivery(async () => {
      const result = await upsertFeatureChannelContext(formData);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative z-[81] flex w-full max-w-[880px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl outline-none",
          "max-h-[85vh]",
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              <span aria-hidden>●</span>
              Nova funcionalidade
            </p>
            <h2
              id={titleId}
              className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900"
            >
              {featureName}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden gap-1.5 sm:inline-flex"
              onClick={openFullSheet}
            >
              Ver todos os detalhes
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Button>
            <ActionMenu
              label="Mais ações"
              items={[
                {
                  label: "Ver todos os detalhes",
                  onSelect: openFullSheet,
                },
              ]}
            />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          <button
            type="button"
            onClick={openFullSheet}
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)] hover:underline sm:hidden"
          >
            Ver todos os detalhes →
          </button>

          {primary ? (
            <section className="rounded-xl border border-[var(--border)] bg-slate-50/80 px-4 py-4">
              <h3 className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                Esta entrega
              </h3>
              {!canEdit && statusPhase ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-base font-semibold text-slate-900">
                  <span className="text-slate-400" aria-hidden>
                    ●
                  </span>
                  {featureStageLabel[statusPhase] ?? statusPhase}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-slate-600">
                {primary.channelName}
                {primary.productShortName
                  ? ` · ${primary.productShortName}`
                  : primary.productName
                    ? ` · ${primary.productName}`
                    : ""}
              </p>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <Meta label="Público" value={primary.audienceName || "—"} />
                <Meta label="Momento" value={primary.momentName || "—"} />
                <Meta label="Jornada" value={primary.journeyName || "—"} />
                <Meta
                  label="Produto"
                  value={
                    primary.productShortName || primary.productName || "—"
                  }
                />
                <Meta
                  label="Necessidade"
                  value={
                    primary.userNeedName ||
                    primary.featureDescription ||
                    "—"
                  }
                  className="sm:col-span-2"
                />
              </dl>

              {canEdit ? (
                <form
                  key={primary.id}
                  action={saveDelivery}
                  className="mt-4 space-y-3 border-t border-slate-200/80 pt-4"
                >
                  <p className="text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
                    Editar entrega
                  </p>
                  <label className="block space-y-1 text-xs font-medium text-slate-600">
                    Status da implementação
                    <select
                      name="phase"
                      defaultValue={primary.phase}
                      className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
                    >
                      {featureStatusOptions().map((phase) => (
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
                        defaultValue={toInputDate(primary.startDate)}
                        className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-medium text-slate-600">
                      Previsão
                      <input
                        type="date"
                        name="expected_date"
                        defaultValue={toInputDate(primary.expectedDate)}
                        className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
                      />
                    </label>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-600">
                      Responsável
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Quem executa ou acompanha esta entrega
                    </p>
                    <WorkResponsiblesPanel
                      owner={{
                        kind: "FCC",
                        featureChannelContextId: primary.id,
                      }}
                      initialResponsibles={primary.responsibles ?? []}
                      canEdit
                      compact
                    />
                    <input
                      name="responsible"
                      defaultValue={primary.responsible}
                      placeholder="Nome livre (legado)"
                      className="mt-2 h-9 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
                    />
                  </div>
                  <label className="block space-y-1 text-xs font-medium text-slate-600">
                    Notas
                    <textarea
                      name="notes"
                      rows={3}
                      defaultValue={primary.notes}
                      className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={savingDelivery}>
                      {savingDelivery ? "Salvando…" : "Salvar entrega"}
                    </Button>
                  </div>
                </form>
              ) : (
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Meta
                    label="Responsável"
                    value={
                      primary.responsible?.trim() ? primary.responsible : "—"
                    }
                    hint="Quem executa ou acompanha esta entrega"
                    className="sm:col-span-2"
                  />
                  {primary.notes?.trim() ? (
                    <Meta
                      label="Notas"
                      value={primary.notes}
                      className="sm:col-span-2"
                    />
                  ) : null}
                </dl>
              )}
            </section>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold text-slate-900">
              Evolução desta entrega
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Status da evolução é independente da fase da implementação.
            </p>
            {deliveryActive.length === 0 && deliveryDone.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Nenhuma evolução em andamento
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {deliveryActive.map((evo) => (
                  <EvolutionCard
                    key={evo.id}
                    evo={evo}
                    channelName={primary?.channelName ?? ""}
                    canEdit={canEdit}
                    onView={
                      onOpenEvolution && primary
                        ? () => onOpenEvolution(primary, evo)
                        : undefined
                    }
                  />
                ))}
                {deliveryDone.length > 0 ? (
                  <li className="pt-1">
                    <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                      Histórico
                    </p>
                    <ul className="space-y-2">
                      {deliveryDone.map((evo) => (
                        <EvolutionCard
                          key={evo.id}
                          evo={evo}
                          channelName={primary?.channelName ?? ""}
                          done
                          canEdit={canEdit}
                          onView={
                            onOpenEvolution && primary
                              ? () => onOpenEvolution(primary, evo)
                              : undefined
                          }
                        />
                      ))}
                    </ul>
                  </li>
                ) : null}
              </ul>
            )}
            {canEdit && primary ? (
              <div className="mt-3">
                {!addingFor ? (
                  <button
                    type="button"
                    onClick={() => setAddingFor(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--brand)] hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar evolução
                  </button>
                ) : (
                  <AddEvolutionForm
                    fccId={primary.id}
                    onDone={() => setAddingFor(false)}
                  />
                )}
              </div>
            ) : null}
          </section>

          {otherContexts.length > 0 ? (
            <section className="rounded-xl border border-dashed border-slate-200 bg-white px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[11px] font-semibold tracking-[0.06em] text-slate-400 uppercase">
                    Outros contextos da funcionalidade · {otherContexts.length}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    A funcionalidade também está presente em outros canais e
                    contextos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOtherContexts((v) => !v)}
                  className="shrink-0 text-xs font-medium text-[var(--brand)] hover:underline"
                  aria-expanded={showOtherContexts}
                >
                  {showOtherContexts
                    ? "Ocultar"
                    : "Ver outros contextos"}
                </button>
              </div>
              {showOtherContexts ? (
                <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                  {otherContexts.map((ctx) => (
                    <li
                      key={ctx.id}
                      className="flex items-start justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {ctx.channelName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {ctx.productShortName} · {ctx.audienceName} ·{" "}
                          {ctx.momentName}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                        <span className="text-slate-400" aria-hidden>
                          ●
                        </span>
                        {featureStageLabel[ctx.phase] ?? ctx.phase}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          <section>
            <FeatureComments featureId={featureId} compact />
          </section>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-5 py-3 sm:px-6">
          <p className="text-[11px] text-slate-400">
            {canEdit
              ? "Edição rápida · dados da esteira"
              : "Consulta rápida · dados da esteira"}
          </p>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            onClick={openFullSheet}
          >
            Ver todos os detalhes
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </footer>
      </div>
    </div>
  );
}

function EvolutionCard({
  evo,
  channelName,
  done,
  canEdit,
  onView,
}: {
  evo: FeatureEvolution;
  channelName: string;
  done?: boolean;
  canEdit?: boolean;
  onView?: () => void;
}) {
  return (
    <li
      className={cn(
        "rounded-xl border border-[var(--border)] px-3.5 py-3",
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
      {onView ? (
        <button
          type="button"
          onClick={onView}
          className="mt-2 text-[11px] font-medium text-[var(--brand)] hover:underline"
        >
          {canEdit ? "Editar evolução →" : "Ver evolução →"}
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
    <form
      action={handleSubmit}
      className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3"
    >
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

function Meta({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
