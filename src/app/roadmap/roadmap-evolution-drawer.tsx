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
  archiveFeatureEvolution,
  upsertFeatureEvolution,
} from "@/app/actions/crud";
import {
  type FeatureEvolution,
  type RoadmapImpl,
} from "@/app/roadmap/roadmap-types";
import { WorkResponsiblesPanel } from "@/components/feature/work-responsibles-panel";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import {
  EVOLUTION_PHASE_ORDER,
  evolutionPhaseLabel,
  evolutionPhaseOptions,
  evolutionStatusLabel,
  featureStageLabel,
  priorityLabel,
} from "@/lib/labels";
import { cn, formatDate } from "@/lib/utils";
import type { EvolutionPhase, Priority } from "@/types";
import {
  Calendar,
  ExternalLink,
  Flag,
  Layers,
  Pencil,
  Users,
  X,
} from "lucide-react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

function toInputDate(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function RoadmapEvolutionDrawer({
  evo,
  item,
  canEdit,
  onClose,
}: {
  evo: FeatureEvolution;
  item: RoadmapImpl;
  canEdit: boolean;
  onClose: () => void;
  /** Mantido por compatibilidade; ficha abre direto no header. */
  onOpenFeature?: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pending, startTransition] = useTransition();

  const currentPhase: EvolutionPhase =
    evo.status === "DONE" || evo.phase === "DONE" ? "DONE" : evo.phase;

  const productLabel = item.productShortName || item.productName || "—";
  const channelProductLine = [
    item.channelName,
    productLabel !== "—" ? productLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const structuredResponsibles = evo.responsibles ?? [];
  const fallbackResponsible =
    structuredResponsibles.length === 0 && evo.responsible?.trim()
      ? evo.responsible.trim()
      : null;

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
    router.push(`/funcionalidades/${item.featureId}`);
  }

  function patchEvolution(fields: Record<string, string>) {
    if (!canEdit) return;
    const fd = new FormData();
    fd.set("id", evo.id);
    fd.set("feature_channel_context_id", evo.featureChannelContextId);
    fd.set("title", fields.title ?? evo.title);
    fd.set("description", fields.description ?? evo.description);
    fd.set("phase", fields.phase ?? evo.phase);
    fd.set("status", fields.status ?? evo.status);
    fd.set("priority", fields.priority ?? evo.priority);
    fd.set("responsible", evo.responsible);
    fd.set("notes", fields.notes ?? evo.notes ?? "");
    if (evo.origin) fd.set("origin", evo.origin);
    if (fields.start_date !== undefined) {
      if (fields.start_date) fd.set("start_date", fields.start_date);
    } else if (evo.startDate) {
      fd.set("start_date", evo.startDate.slice(0, 10));
    }
    if (fields.expected_date !== undefined) {
      if (fields.expected_date) fd.set("expected_date", fields.expected_date);
    } else if (evo.expectedDate) {
      fd.set("expected_date", evo.expectedDate.slice(0, 10));
    }
    if (fields.completed_date) {
      fd.set("completed_date", fields.completed_date);
    } else if (evo.completedDate) {
      fd.set("completed_date", evo.completedDate.slice(0, 10));
    }

    startTransition(async () => {
      const result = await upsertFeatureEvolution(fd);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      setEditingNotes(false);
      setEditingDescription(false);
      router.refresh();
    });
  }

  function setPhase(next: EvolutionPhase) {
    if (!canEdit) return;
    const fields: Record<string, string> = {
      phase: next,
      status: next === "DONE" ? "DONE" : "IN_PROGRESS",
    };
    if (next === "DONE") {
      fields.completed_date = new Date().toISOString().slice(0, 10);
    }
    patchEvolution(fields);
  }

  function removeEvolution() {
    if (!canEdit) return;
    startTransition(async () => {
      const result = await archiveFeatureEvolution(evo.id);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      setConfirmRemove(false);
      onClose();
      router.refresh();
    });
  }

  const menuItems = canEdit
    ? [
        ...(currentPhase !== "DONE"
          ? [
              {
                label: "Marcar como concluída",
                onSelect: () => setPhase("DONE"),
              },
            ]
          : []),
        {
          label: "Remover evolução",
          tone: "danger" as const,
          onSelect: () => setConfirmRemove(true),
        },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-6">
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
          "relative z-[86] flex w-full max-w-[880px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl outline-none",
          "max-h-[85vh]",
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-amber-700 uppercase">
              <span aria-hidden>✦</span>
              Evolução
            </p>
            <h2
              id={titleId}
              className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
            >
              {evo.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{item.featureName}</p>
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
          <section className="space-y-4">
            <h3 className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              Contexto
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              {canEdit ? (
                <label className="relative inline-flex">
                  <span className="sr-only">Status da evolução</span>
                  <select
                    value={currentPhase}
                    disabled={pending}
                    onChange={(e) =>
                      setPhase(e.target.value as EvolutionPhase)
                    }
                    className="appearance-none rounded-full border-0 bg-amber-100 py-1.5 pr-7 pl-3 text-sm font-semibold text-amber-900 outline-none focus:ring-2 focus:ring-amber-300"
                  >
                    {evolutionPhaseOptions(false).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        ● {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
                  <span aria-hidden>●</span>
                  {evolutionPhaseLabel(currentPhase)}
                </span>
              )}
              <span className="text-xs text-slate-500">
                {evolutionStatusLabel[evo.status]}
              </span>
            </div>

            <p className="text-base font-medium text-slate-800">
              {channelProductLine}
            </p>
            <p className="text-xs text-slate-500">
              Status da evolução é independente da fase da implementação
              {item.phase
                ? ` (implementação: ${featureStageLabel[item.phase] ?? item.phase})`
                : ""}
              .
            </p>

            <dl className="grid gap-4 sm:grid-cols-2">
              <Property
                icon={<Users className="h-3.5 w-3.5" />}
                label="Público"
                value={item.audienceName || "—"}
              />
              <Property
                icon={<Flag className="h-3.5 w-3.5" />}
                label="Momento"
                value={item.momentName || "—"}
              />
              <Property
                icon={<Layers className="h-3.5 w-3.5" />}
                label="Produto"
                value={productLabel}
              />
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  Prioridade
                </dt>
                <dd className="mt-1">
                  {canEdit ? (
                    <select
                      value={evo.priority}
                      disabled={pending}
                      onChange={(e) =>
                        patchEvolution({ priority: e.target.value })
                      }
                      className="h-8 rounded-lg border border-transparent bg-slate-50 px-2 text-sm font-medium text-slate-900 hover:border-[var(--border)] focus:border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
                    >
                      {(Object.keys(priorityLabel) as Priority[]).map((key) => (
                        <option key={key} value={key}>
                          {priorityLabel[key]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm font-medium text-slate-900">
                      {priorityLabel[evo.priority]}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
                Descrição
              </h3>
              {canEdit && !editingDescription ? (
                <button
                  type="button"
                  onClick={() => setEditingDescription(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--brand)] hover:underline"
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </button>
              ) : null}
            </div>
            {editingDescription && canEdit ? (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  patchEvolution({
                    description: String(fd.get("description") ?? ""),
                  });
                }}
              >
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={evo.description}
                  autoFocus
                  className="w-full rounded-xl border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingDescription(false)}
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
                {evo.description?.trim()
                  ? evo.description
                  : "Nenhuma descrição adicionada."}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              Acompanhamento
            </h3>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Responsável
              </p>
              <p className="text-[10px] text-slate-400">
                Quem executa ou acompanha esta evolução
              </p>
              <WorkResponsiblesPanel
                owner={{ kind: "EVOLUTION", featureEvolutionId: evo.id }}
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
                value={evo.startDate}
                canEdit={canEdit}
                pending={pending}
                onChange={(next) => patchEvolution({ start_date: next })}
              />
              <InlineDate
                label="Previsão de entrega"
                value={evo.expectedDate}
                canEdit={canEdit}
                pending={pending}
                onChange={(next) => patchEvolution({ expected_date: next })}
              />
            </div>
          </section>

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
                  patchEvolution({ notes: String(fd.get("notes") ?? "") });
                }}
              >
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={evo.notes}
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
                {evo.notes?.trim() ? evo.notes : "Nenhuma nota adicionada."}
              </div>
            )}
          </section>

          {canEdit ? (
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
                Progresso
              </h3>
              <ol className="space-y-2">
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
                        disabled={pending}
                        onClick={() => setPhase(step)}
                        className={cn(
                          "text-sm hover:text-[var(--brand)]",
                          current && "font-semibold text-slate-900",
                          done && !current && "text-slate-500",
                          !done && !current && "text-slate-400",
                        )}
                      >
                        {evolutionPhaseLabel(step)}
                        {current ? " atual" : ""}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-[var(--border)] px-5 py-3 sm:px-6">
          <p className="text-[11px] text-slate-400">
            Consulta rápida · Gestão de entregas
          </p>
        </footer>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Remover evolução?"
        description="Esta ação remove apenas esta evolução. A implementação e a funcionalidade permanecem."
        confirmLabel={pending ? "Removendo…" : "Remover evolução"}
        cancelLabel="Cancelar"
        tone="danger"
        onCancel={() => {
          if (!pending) setConfirmRemove(false);
        }}
        onConfirm={removeEvolution}
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
