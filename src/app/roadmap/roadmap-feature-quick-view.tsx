"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  archiveRecord,
  upsertFeatureChannelContext,
  upsertFeatureEvolution,
} from "@/app/actions/crud";
import { buildQuickViewSecondaryActions } from "@/app/roadmap/roadmap-quick-view-actions";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { cn, formatDate } from "@/lib/utils";
import type { Priority, RoadmapPhase } from "@/types";
import {
  Calendar,
  ExternalLink,
  Flag,
  Layers,
  Pencil,
  Plus,
  Route,
  Users,
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
  const [editingNotes, setEditingNotes] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pending, startTransition] = useTransition();

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

  const productLabel =
    primary?.productShortName || primary?.productName || "—";
  const channelProductLine = primary
    ? [primary.channelName, productLabel !== "—" ? productLabel : null]
        .filter(Boolean)
        .join(" · ")
    : "";

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

  function patchPrimary(fields: Record<string, string>) {
    if (!primary || !canEdit) return;
    const fd = new FormData();
    fd.set("id", primary.id);
    fd.set("feature_id", primary.featureId);
    fd.set("channel_context_id", primary.channelContextId);
    fd.set("product_id", primary.productId);
    fd.set("experience", primary.experience);
    fd.set("status", primary.status);
    fd.set("phase", fields.phase ?? primary.phase);
    fd.set("responsible", primary.responsible);
    fd.set("notes", fields.notes ?? primary.notes ?? "");
    if (fields.start_date !== undefined) {
      if (fields.start_date) fd.set("start_date", fields.start_date);
    } else if (primary.startDate) {
      fd.set("start_date", primary.startDate.slice(0, 10));
    }
    if (fields.expected_date !== undefined) {
      if (fields.expected_date) fd.set("expected_date", fields.expected_date);
    } else if (primary.expectedDate) {
      fd.set("expected_date", primary.expectedDate.slice(0, 10));
    }
    if (primary.launchDate) {
      fd.set("launch_date", primary.launchDate.slice(0, 10));
    }
    startTransition(async () => {
      const result = await upsertFeatureChannelContext(fd);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      setEditingNotes(false);
      router.refresh();
    });
  }

  function duplicateImplementation() {
    if (!primary || !canEdit) return;
    const fd = new FormData();
    fd.set("feature_id", primary.featureId);
    fd.set("channel_context_id", primary.channelContextId);
    fd.set("product_id", primary.productId);
    fd.set("phase", primary.phase);
    fd.set("experience", primary.experience);
    fd.set("responsible", primary.responsible);
    fd.set("notes", primary.notes || "");
    if (primary.expectedDate)
      fd.set("expected_date", primary.expectedDate.slice(0, 10));
    if (primary.launchDate)
      fd.set("launch_date", primary.launchDate.slice(0, 10));
    if (primary.startDate) fd.set("start_date", primary.startDate.slice(0, 10));
    startTransition(async () => {
      const result = await upsertFeatureChannelContext(fd);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      router.refresh();
    });
  }

  function removeImplementation() {
    if (!primary || !canEdit) return;
    startTransition(async () => {
      const result = await archiveRecord(
        "feature_channel_contexts",
        primary.id,
      );
      if (!result.ok) {
        alert(result.message);
        return;
      }
      setConfirmRemove(false);
      onClose();
      router.refresh();
    });
  }

  const menuItems = buildQuickViewSecondaryActions(canEdit).map((item) => ({
    ...item,
    onSelect:
      item.label === "Duplicar implementação"
        ? duplicateImplementation
        : () => setConfirmRemove(true),
  }));

  const structuredResponsibles = primary?.responsibles ?? [];
  const fallbackResponsible =
    structuredResponsibles.length === 0 && primary?.responsible?.trim()
      ? primary.responsible.trim()
      : null;

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
              className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
            >
              {featureName}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={openFullSheet}
            >
              Ver ficha completa
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Button>
            {menuItems.length > 0 ? (
              <ActionMenu label="Mais ações" items={menuItems} />
            ) : null}
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

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5 sm:px-6">
          {primary ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
                  Contexto
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canEdit ? (
                  <label className="relative inline-flex">
                    <span className="sr-only">Status</span>
                    <select
                      value={primary.phase}
                      disabled={pending}
                      onChange={(e) => patchPrimary({ phase: e.target.value })}
                      className="appearance-none rounded-full border-0 bg-violet-100 py-1.5 pr-7 pl-3 text-sm font-semibold text-violet-900 outline-none ring-0 focus:ring-2 focus:ring-violet-300"
                    >
                      {featureStatusOptions().map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          ● {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : statusPhase ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-900">
                    <span aria-hidden>●</span>
                    {featureStageLabel[statusPhase] ?? statusPhase}
                  </span>
                ) : null}
              </div>

              <p className="text-base font-medium text-slate-800">
                {channelProductLine}
              </p>

              <dl className="grid gap-4 sm:grid-cols-2">
                <Property
                  icon={<Users className="h-3.5 w-3.5" />}
                  label="Público"
                  value={primary.audienceName || "—"}
                />
                <Property
                  icon={<Flag className="h-3.5 w-3.5" />}
                  label="Momento"
                  value={primary.momentName || "—"}
                />
                <Property
                  icon={<Route className="h-3.5 w-3.5" />}
                  label="Jornada"
                  value={primary.journeyName || "—"}
                />
                <Property
                  icon={<Layers className="h-3.5 w-3.5" />}
                  label="Produto"
                  value={productLabel}
                />
                <Property
                  icon={<Flag className="h-3.5 w-3.5" />}
                  label="Necessidade"
                  value={
                    primary.userNeedName ||
                    primary.featureDescription ||
                    "—"
                  }
                  className="sm:col-span-2"
                />
              </dl>
            </section>
          ) : null}

          {primary ? (
            <section className="space-y-4">
              <h3 className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
                Acompanhamento
              </h3>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
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
                  initialResponsibles={structuredResponsibles}
                  canEdit={canEdit}
                  compact
                  hideTitle
                />
                {fallbackResponsible ? (
                  <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-sm font-medium text-slate-800">
                    {fallbackResponsible}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InlineDate
                  label="Início"
                  value={primary.startDate}
                  canEdit={canEdit}
                  pending={pending}
                  onChange={(next) => patchPrimary({ start_date: next })}
                />
                <InlineDate
                  label="Previsão de entrega"
                  value={primary.expectedDate}
                  canEdit={canEdit}
                  pending={pending}
                  onChange={(next) => patchPrimary({ expected_date: next })}
                />
              </div>
            </section>
          ) : null}

          {primary ? (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
                  Notas
                </h3>
                {canEdit && !editingNotes ? (
                  <button
                    type="button"
                    onClick={() => setEditingNotes(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--brand)] hover:underline"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </button>
                ) : null}
              </div>
              {editingNotes && canEdit ? (
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    patchPrimary({
                      notes: String(fd.get("notes") ?? ""),
                    });
                  }}
                >
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={primary.notes}
                    autoFocus
                    className="w-full rounded-xl border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingNotes(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" disabled={pending}>
                      {pending ? "Salvando…" : "Salvar"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm leading-relaxed text-slate-700">
                  {primary.notes?.trim()
                    ? primary.notes
                    : "Nenhuma nota adicionada."}
                </div>
              )}
            </section>
          ) : null}

          <section className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
                  Evolução desta entrega
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Status da evolução é independente da fase da implementação.
                </p>
              </div>
              {canEdit && primary && !addingFor ? (
                <button
                  type="button"
                  onClick={() => setAddingFor(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--brand)] hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar evolução
                </button>
              ) : null}
            </div>

            {deliveryActive.length === 0 && deliveryDone.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border)] px-3.5 py-4 text-sm text-slate-500">
                Nenhuma evolução em andamento
              </p>
            ) : (
              <ul className="space-y-2">
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

            {canEdit && primary && addingFor ? (
              <AddEvolutionForm
                fccId={primary.id}
                onDone={() => setAddingFor(false)}
              />
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
                <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {otherContexts.map((ctx) => (
                    <li
                      key={ctx.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {ctx.channelName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {ctx.audienceName} · {ctx.momentName}
                          {ctx.productShortName
                            ? ` · ${ctx.productShortName}`
                            : ""}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
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

        <footer className="shrink-0 border-t border-[var(--border)] px-5 py-3 sm:px-6">
          <p className="text-[11px] text-slate-400">
            Consulta rápida · Gestão de entregas
          </p>
        </footer>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Remover implementação?"
        description="Esta ação remove apenas esta implementação/contexto. A funcionalidade e outros canais permanecem."
        confirmLabel={pending ? "Removendo…" : "Remover implementação"}
        cancelLabel="Cancelar"
        tone="danger"
        onCancel={() => {
          if (!pending) setConfirmRemove(false);
        }}
        onConfirm={removeImplementation}
      />
    </div>
  );
}

function Property({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        <span className="text-slate-400" aria-hidden>
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function InlineDate({
  label,
  value,
  canEdit,
  pending,
  onChange,
}: {
  label: string;
  value: string | null;
  canEdit: boolean;
  pending: boolean;
  onChange: (next: string) => void;
}) {
  if (!canEdit) {
    return (
      <div>
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          {label}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-900">
          {formatDate(value)}
        </p>
      </div>
    );
  }

  return (
    <label className="block">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        <Calendar className="h-3.5 w-3.5" aria-hidden />
        {label}
      </span>
      <input
        type="date"
        disabled={pending}
        defaultValue={toInputDate(value)}
        key={`${label}-${value ?? "empty"}`}
        onBlur={(e) => {
          const next = e.target.value;
          const prev = toInputDate(value);
          if (next !== prev) onChange(next);
        }}
        className="mt-1 h-9 w-full rounded-lg border border-transparent bg-slate-50 px-2 text-sm font-medium text-slate-900 hover:border-[var(--border)] focus:border-[var(--border)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
      />
    </label>
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
      className="mt-3 space-y-2 rounded-xl border border-[var(--border)] bg-slate-50/80 p-3"
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
