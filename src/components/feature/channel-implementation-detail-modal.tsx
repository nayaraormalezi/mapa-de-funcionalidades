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
import { upsertFeatureChannelContext } from "@/app/actions/crud";
import { FeatureComments } from "@/components/feature/feature-comments";
import { WorkResponsiblesPanel } from "@/components/feature/work-responsibles-panel";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { evolutionsForFccIds } from "@/lib/channel-implementation-detail";
import { SIGNAL_LABEL } from "@/lib/health";
import {
  evolutionPhaseLabel,
  evolutionStatusLabel,
  featureStageLabel,
  featureStatusOptions,
  gapTypeLabel,
} from "@/lib/labels";
import { cn, formatDate } from "@/lib/utils";
import type {
  FeatureChannelEvaluation,
  FeatureEvolution,
  FeatureMapRow,
  Gap,
} from "@/types";
import {
  Calendar,
  ExternalLink,
  Flag,
  ImagePlus,
  Layers,
  Pencil,
  Plus,
  Route,
  Users,
  X,
} from "lucide-react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export type ChannelImplementationCard = {
  key: string;
  channelName: string;
  audienceName: string;
  momentName: string;
  temporalStatus: FeatureMapRow["temporalStatus"];
  phase: FeatureMapRow["phase"];
  responsible: string;
  notes: string;
  products: { id: string; name: string; shortName: string }[];
  figmaUrl: string | null;
  experienceImageUrl: string | null;
  ticketNumber: string | null;
  fccIds: string[];
  primaryContext: FeatureMapRow;
};

function toInputDate(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function ChannelImplementationDetailModal({
  featureId,
  featureName,
  card,
  evolutions,
  evaluations,
  gaps,
  canEdit,
  onClose,
  onEdit,
  onAddFigma,
  onAddScreenshot,
  onDuplicate,
  onRemove,
  onCreateEvolution,
  onViewEvolution,
  onOpenImage,
}: {
  featureId: string;
  featureName: string;
  card: ChannelImplementationCard;
  evolutions: FeatureEvolution[];
  evaluations: FeatureChannelEvaluation[];
  gaps: Gap[];
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAddFigma: () => void;
  onAddScreenshot: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onCreateEvolution: () => void;
  onViewEvolution: (evolution: FeatureEvolution) => void;
  onOpenImage: (src: string) => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pending, startTransition] = useTransition();

  const ctx = card.primaryContext;
  const fccId = ctx.featureChannelContextId;
  const productLabel =
    card.products.map((p) => p.shortName).join(" · ") ||
    ctx.productShortName ||
    "—";
  const channelProductLine = [
    card.channelName,
    productLabel !== "—" ? productLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const channelEvolutions = evolutionsForFccIds(evolutions, card.fccIds);
  const improvements = gaps.filter(
    (g) =>
      g.featureId === featureId && g.currentChannelId === ctx.channelId,
  );

  const healthLabel =
    ctx.healthSignal === "UNKNOWN" || ctx.healthScore == null
      ? "Sem evidências suficientes"
      : SIGNAL_LABEL[ctx.healthSignal] ?? ctx.healthSignal;

  const notes = (ctx.notes || card.notes || "").trim();
  const hasImage = Boolean(card.experienceImageUrl);
  const structuredResponsibles = ctx.responsibles ?? [];
  const fallbackResponsible =
    structuredResponsibles.length === 0 &&
    (ctx.responsible?.trim() || card.responsible.trim())
      ? ctx.responsible?.trim() || card.responsible.trim()
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

  function patchContext(fields: Record<string, string>) {
    if (!canEdit) return;
    const fd = new FormData();
    fd.set("id", fccId);
    fd.set("feature_id", featureId);
    fd.set("channel_context_id", ctx.channelContextId);
    fd.set("product_id", ctx.productId);
    fd.set("experience", ctx.experience);
    fd.set("status", ctx.status);
    fd.set("phase", fields.phase ?? card.phase);
    fd.set("responsible", ctx.responsible);
    fd.set("notes", fields.notes ?? notes);
    if (fields.figma_url !== undefined) {
      fd.set("figma_url", fields.figma_url);
    } else if (card.figmaUrl) {
      fd.set("figma_url", card.figmaUrl);
    }
    if (fields.ticket_number !== undefined) {
      fd.set("ticket_number", fields.ticket_number);
    } else if (card.ticketNumber) {
      fd.set("ticket_number", card.ticketNumber);
    }
    if (fields.start_date !== undefined) {
      if (fields.start_date) fd.set("start_date", fields.start_date);
    } else if (ctx.startDate) {
      fd.set("start_date", ctx.startDate.slice(0, 10));
    }
    if (fields.expected_date !== undefined) {
      if (fields.expected_date) fd.set("expected_date", fields.expected_date);
    } else if (ctx.expectedDate) {
      fd.set("expected_date", ctx.expectedDate.slice(0, 10));
    }
    if (ctx.launchDate) {
      fd.set("launch_date", ctx.launchDate.slice(0, 10));
    }
    if (ctx.experienceImageUrl) {
      fd.set("experience_image_url", ctx.experienceImageUrl);
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

  const menuItems = canEdit
    ? [
        { label: "Editar implementação", onSelect: onEdit },
        { label: "Duplicar implementação", onSelect: onDuplicate },
        ...(!hasImage
          ? [{ label: "Adicionar screenshot", onSelect: onAddScreenshot }]
          : []),
        ...(!card.figmaUrl
          ? [{ label: "Adicionar link do Figma", onSelect: onAddFigma }]
          : []),
        { label: "Adicionar evolução", onSelect: onCreateEvolution },
        {
          label: "Remover implementação",
          tone: "danger" as const,
          onSelect: () => setConfirmRemove(true),
        },
      ]
    : [];

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
              Implementação
            </p>
            <h2
              id={titleId}
              className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
            >
              {featureName}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
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
                  <span className="sr-only">Status</span>
                  <select
                    value={card.phase}
                    disabled={pending}
                    onChange={(e) => patchContext({ phase: e.target.value })}
                    className="appearance-none rounded-full border-0 bg-violet-100 py-1.5 pr-7 pl-3 text-sm font-semibold text-violet-900 outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {featureStatusOptions().map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        ● {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-900">
                  <span aria-hidden>●</span>
                  {featureStageLabel[card.phase] ?? card.phase}
                </span>
              )}
            </div>

            <p className="text-base font-medium text-slate-800">
              {channelProductLine}
            </p>

            <dl className="grid gap-4 sm:grid-cols-2">
              <Property
                icon={<Users className="h-3.5 w-3.5" />}
                label="Público"
                value={card.audienceName || "—"}
              />
              <Property
                icon={<Flag className="h-3.5 w-3.5" />}
                label="Momento"
                value={card.momentName || "—"}
              />
              <Property
                icon={<Route className="h-3.5 w-3.5" />}
                label="Jornada"
                value={ctx.journeyName || "—"}
              />
              <Property
                icon={<Layers className="h-3.5 w-3.5" />}
                label="Produto"
                value={productLabel}
              />
              <Property
                icon={<Flag className="h-3.5 w-3.5" />}
                label="Necessidade"
                value={ctx.userNeedName || ctx.featureDescription || "—"}
                className="sm:col-span-2"
              />
              {card.ticketNumber || canEdit ? (
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    Ticket TI
                  </dt>
                  <dd className="mt-1">
                    {canEdit ? (
                      <input
                        type="text"
                        defaultValue={card.ticketNumber ?? ""}
                        key={`ticket-${card.ticketNumber ?? ""}`}
                        placeholder="CHM-123456"
                        disabled={pending}
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (next !== (card.ticketNumber ?? "")) {
                            patchContext({ ticket_number: next });
                          }
                        }}
                        className="h-9 w-full max-w-xs rounded-lg border border-transparent bg-slate-50 px-3 text-sm font-medium text-slate-900 hover:border-[var(--border)] focus:border-[var(--border)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
                      />
                    ) : (
                      <span className="text-sm font-medium text-slate-900">
                        {card.ticketNumber}
                      </span>
                    )}
                  </dd>
                </div>
              ) : null}
            </dl>
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
                Quem executa ou acompanha esta entrega
              </p>
              <WorkResponsiblesPanel
                owner={{
                  kind: "FCC",
                  featureChannelContextId: fccId,
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
                value={ctx.startDate}
                canEdit={canEdit}
                pending={pending}
                onChange={(next) => patchContext({ start_date: next })}
              />
              <InlineDate
                label="Previsão de entrega"
                value={ctx.expectedDate}
                canEdit={canEdit}
                pending={pending}
                onChange={(next) => patchContext({ expected_date: next })}
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
                  patchContext({ notes: String(fd.get("notes") ?? "") });
                }}
              >
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={notes}
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
                {notes || "Nenhuma nota adicionada."}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              Experiência
            </h3>
            {hasImage ? (
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.experienceImageUrl!}
                  alt={`Experiência · ${card.channelName}`}
                  className="max-h-56 w-full object-contain object-top"
                />
                <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-3 py-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenImage(card.experienceImageUrl!)}
                  >
                    Ver experiência
                  </Button>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onAddScreenshot}
                    >
                      Substituir screenshot
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center">
                <p className="text-sm text-slate-500">
                  Visualização não disponível
                </p>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={onAddScreenshot}
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Adicionar screenshot
                  </Button>
                ) : null}
              </div>
            )}
            {card.figmaUrl ? (
              <a
                href={card.figmaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand)] hover:underline"
              >
                Ver no Figma
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddFigma}
              >
                Adicionar link do Figma
              </Button>
            ) : null}
          </section>

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
              {canEdit ? (
                <button
                  type="button"
                  onClick={onCreateEvolution}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--brand)] hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar evolução
                </button>
              ) : null}
            </div>
            {channelEvolutions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border)] px-3.5 py-4 text-sm text-slate-500">
                Nenhuma evolução em andamento
              </p>
            ) : (
              <ul className="space-y-2">
                {channelEvolutions.map((evo) => (
                  <li key={evo.id}>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-[var(--border)] px-3.5 py-3 text-left hover:bg-slate-50"
                      onClick={() => onViewEvolution(evo)}
                    >
                      <p className="text-sm font-medium text-slate-900">
                        <span className="mr-1 text-amber-600">✦</span>
                        {evo.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {card.channelName}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {evolutionPhaseLabel(evo.phase)}
                        {" · "}
                        {evolutionStatusLabel[evo.status] ?? evo.status}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              Avaliações
            </h3>
            <p className="text-sm text-slate-700">
              Saúde da experiência
              <span className="mt-0.5 block font-semibold text-slate-900">
                {healthLabel}
              </span>
            </p>
            {evaluations.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma avaliação neste canal.
              </p>
            ) : (
              <ul className="space-y-2">
                {evaluations.map((ev) => (
                  <li
                    key={ev.id}
                    className="rounded-xl border border-[var(--border)] px-3.5 py-3"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {ev.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {ev.methodCustomName || ev.methodCode || ev.studyType}
                      {ev.evaluatedAt
                        ? ` · ${new Date(ev.evaluatedAt).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              Melhorias
            </h3>
            {improvements.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma melhoria registrada neste canal.
              </p>
            ) : (
              <ul className="space-y-2">
                {improvements.map((g) => (
                  <li
                    key={g.id}
                    className="rounded-xl border border-[var(--border)] px-3.5 py-3"
                  >
                    <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                      {gapTypeLabel[g.type] ?? g.type}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">
                      {g.title}
                    </p>
                    {g.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {g.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <FeatureComments
            featureId={featureId}
            featureChannelContextId={fccId}
            compact
          />
        </div>

        <footer className="shrink-0 border-t border-[var(--border)] px-5 py-3 sm:px-6">
          <p className="text-[11px] text-slate-400">
            Consulta rápida · Ficha da funcionalidade
          </p>
        </footer>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Remover implementação?"
        description="Esta ação remove apenas esta implementação/contexto. A funcionalidade e outros canais permanecem."
        confirmLabel="Remover implementação"
        cancelLabel="Cancelar"
        tone="danger"
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          onRemove();
        }}
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
