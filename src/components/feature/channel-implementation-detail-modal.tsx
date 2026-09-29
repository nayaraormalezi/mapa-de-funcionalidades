"use client";

import { useEffect, useId, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertFeatureChannelContext } from "@/app/actions/crud";
import { StageBadge } from "@/components/badges/stage-badge";
import { FeatureComments } from "@/components/feature/feature-comments";
import { WorkResponsiblesPanel } from "@/components/feature/work-responsibles-panel";
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
import { cn } from "@/lib/utils";
import type {
  FeatureChannelEvaluation,
  FeatureEvolution,
  FeatureMapRow,
  Gap,
  WorkResponsible,
} from "@/types";
import { ExternalLink, ImagePlus, X } from "lucide-react";

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

function responsibleLabel(ctx: FeatureMapRow): string {
  const structured = (ctx.responsibles ?? [])
    .map((r: WorkResponsible) => r.displayName.trim())
    .filter(Boolean);
  if (structured.length) return structured.join(", ");
  return ctx.responsible?.trim() || "";
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold tracking-[0.06em] text-slate-400 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm text-slate-800">{value}</dd>
    </div>
  );
}

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
  const [saving, startSave] = useTransition();

  const ctx = card.primaryContext;
  const fccId = ctx.featureChannelContextId;
  const productLine = card.products.map((p) => p.shortName).join(" · ");
  const contextLine = [
    card.audienceName,
    card.momentName,
    card.temporalStatus === "FUTURE" ? "Futuro" : null,
    productLine || null,
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

  const responsible = responsibleLabel(ctx) || card.responsible.trim();
  const notes = (ctx.notes || card.notes || "").trim();
  const hasImage = Boolean(card.experienceImageUrl);
  const stageLabel = featureStageLabel[card.phase] ?? card.phase;

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

  function saveImplementation(formData: FormData) {
    if (!canEdit) return;
    formData.set("id", fccId);
    formData.set("feature_id", featureId);
    formData.set("channel_context_id", ctx.channelContextId);
    formData.set("product_id", ctx.productId);
    formData.set("experience", ctx.experience);
    formData.set("status", ctx.status);
    if (ctx.launchDate) {
      formData.set("launch_date", ctx.launchDate.slice(0, 10));
    }
    if (ctx.experienceImageUrl) {
      formData.set("experience_image_url", ctx.experienceImageUrl);
    }
    startSave(async () => {
      const result = await upsertFeatureChannelContext(formData);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      router.refresh();
    });
  }

  const menuItems = [
    { label: "Editar implementação (completo)", onSelect: onEdit },
    { label: "Duplicar implementação", onSelect: onDuplicate },
    ...(!hasImage
      ? [{ label: "Adicionar screenshot", onSelect: onAddScreenshot }]
      : []),
    ...(!card.figmaUrl
      ? [{ label: "Adicionar link do Figma", onSelect: onAddFigma }]
      : []),
    {
      label: "Adicionar evolução",
      onSelect: onCreateEvolution,
    },
    {
      label: "Remover implementação",
      tone: "danger" as const,
      onSelect: onRemove,
    },
  ];

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
              Canal
            </p>
            <h2
              id={titleId}
              className="mt-1 text-xl font-semibold tracking-tight text-slate-900"
            >
              {card.channelName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{contextLine}</p>
            {!canEdit ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <span className="text-slate-400" aria-hidden>
                  ●
                </span>
                {stageLabel}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {canEdit ? (
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

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="rounded-xl border border-[var(--border)] bg-slate-50/80 px-4 py-4">
            <h3 className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
              Identidade do contexto
            </h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Meta label="Canal" value={card.channelName} />
              <Meta label="Produto" value={productLine || "—"} />
              <Meta label="Público" value={card.audienceName || "—"} />
              <Meta label="Momento" value={card.momentName || "—"} />
              {!canEdit ? (
                <>
                  <div className="min-w-0">
                    <dt className="text-[11px] font-semibold tracking-[0.06em] text-slate-400 uppercase">
                      Status
                    </dt>
                    <dd className="mt-1">
                      <StageBadge stage={card.phase} />
                    </dd>
                  </div>
                  {card.ticketNumber ? (
                    <Meta label="Ticket TI" value={card.ticketNumber} />
                  ) : null}
                  {responsible ? (
                    <Meta label="Responsável" value={responsible} />
                  ) : null}
                </>
              ) : null}
            </dl>
            <p className="mt-3 text-xs text-slate-400">
              Funcionalidade: {featureName}
            </p>

            {canEdit ? (
              <form
                key={fccId}
                action={saveImplementation}
                className="mt-4 space-y-3 border-t border-slate-200/80 pt-4"
              >
                <p className="text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
                  Editar implementação
                </p>
                <label className="block space-y-1 text-xs font-medium text-slate-600">
                  Status
                  <select
                    name="phase"
                    defaultValue={card.phase}
                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
                  >
                    {featureStatusOptions().map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
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
                      defaultValue={toInputDate(ctx.startDate)}
                      className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
                    />
                  </label>
                  <label className="block space-y-1 text-xs font-medium text-slate-600">
                    Previsão
                    <input
                      type="date"
                      name="expected_date"
                      defaultValue={toInputDate(ctx.expectedDate)}
                      className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
                    />
                  </label>
                </div>
                <label className="block space-y-1 text-xs font-medium text-slate-600">
                  Ticket TI
                  <input
                    name="ticket_number"
                    defaultValue={card.ticketNumber ?? ""}
                    placeholder="CHM-123456"
                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
                  />
                </label>
                <label className="block space-y-1 text-xs font-medium text-slate-600">
                  Link do Figma
                  <input
                    name="figma_url"
                    type="url"
                    defaultValue={card.figmaUrl ?? ""}
                    placeholder="https://figma.com/…"
                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
                  />
                </label>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">
                    Responsável
                  </p>
                  <WorkResponsiblesPanel
                    owner={{
                      kind: "FCC",
                      featureChannelContextId: fccId,
                    }}
                    initialResponsibles={ctx.responsibles ?? []}
                    canEdit
                    compact
                  />
                  <input
                    name="responsible"
                    defaultValue={ctx.responsible}
                    placeholder="Responsável"
                    className="mt-2 h-9 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
                  />
                </div>
                <label className="block space-y-1 text-xs font-medium text-slate-600">
                  Notas
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={notes}
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                  />
                </label>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onEdit}
                  >
                    Edição completa
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              </form>
            ) : null}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900">Experiência</h3>
            {hasImage ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-slate-50">
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
              <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center">
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
            {!canEdit ? (
              <div className="mt-3">
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
                ) : (
                  <p className="text-sm text-slate-500">Sem link do Figma</p>
                )}
              </div>
            ) : card.figmaUrl ? (
              <a
                href={card.figmaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand)] hover:underline"
              >
                Abrir Figma atual
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : null}
          </section>

          {!canEdit ? (
            <section>
              <h3 className="text-sm font-semibold text-slate-900">Notas</h3>
              {notes ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {notes}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Nenhuma nota nesta implementação.
                </p>
              )}
            </section>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold text-slate-900">Avaliações</h3>
            <p className="mt-2 text-sm text-slate-700">
              Saúde da experiência
              <span className="mt-0.5 block font-semibold text-slate-900">
                {healthLabel}
              </span>
            </p>
            {evaluations.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Nenhuma avaliação neste canal.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {evaluations.map((ev) => (
                  <li
                    key={ev.id}
                    className="rounded-lg border border-[var(--border)] px-3 py-2"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {ev.name}
                    </p>
                    <p className="text-xs text-slate-500">
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

          <section>
            <h3 className="text-sm font-semibold text-slate-900">Evoluções</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Status da evolução é independente do status da implementação.
            </p>
            {channelEvolutions.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Nenhuma evolução neste canal.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {channelEvolutions.map((evo) => (
                  <li key={evo.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-left hover:bg-slate-50"
                      onClick={() => onViewEvolution(evo)}
                    >
                      <p className="text-sm font-medium text-slate-900">
                        {evo.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {evolutionPhaseLabel(evo.phase)}
                        {" · "}
                        {evolutionStatusLabel[evo.status] ?? evo.status}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={onCreateEvolution}
              >
                Adicionar evolução
              </Button>
            ) : null}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900">Melhorias</h3>
            {improvements.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Nenhuma melhoria registrada neste canal.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {improvements.map((g) => (
                  <li
                    key={g.id}
                    className="rounded-lg border border-[var(--border)] px-3 py-2"
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

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3 sm:px-6">
          <a
            href={`/funcionalidades/${featureId}`}
            className="text-sm font-medium text-[var(--brand)] hover:underline"
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
          >
            Ver ficha da funcionalidade →
          </a>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </footer>
      </div>
    </div>
  );
}
