"use client";

import { useMemo, useState } from "react";
import {
  upsertFeatureChannelEvaluation,
} from "@/app/actions/crud";
import { CrudForm, Field } from "@/components/cadastros/crud-form";
import { EvidenceFileField } from "@/components/feature/evidence-file-field";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import {
  CUSTOM_METHOD,
  EVALUATION_AREAS,
  EVALUATION_STATUS_LABEL,
  STUDY_TYPE_LABEL,
  evaluationAreaLabel,
  evaluationMethodLabel,
  formatEvaluationResultLines,
  getMethod,
  methodsForAreaAndStudy,
  studyTypesForArea,
  type EvaluationStatusCode,
} from "@/lib/evaluation-taxonomy";
import { cn } from "@/lib/utils";
import type { Evidence, FeatureChannelEvaluation } from "@/types";
import {
  filterEmbeddedNotYetMaterialized,
  getEvidenceForOwner,
  listEvaluationEmbeddedAttachments,
} from "@/lib/evidence";
import { Plus, X } from "lucide-react";

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value.slice(0, 10) + "T12:00:00");
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString("pt-BR");
}

function StatusBadge({ status }: { status: EvaluationStatusCode }) {
  const label = EVALUATION_STATUS_LABEL[status] ?? status;
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
        status === "COMPLETED" && "bg-emerald-50 text-emerald-800 ring-emerald-200",
        status === "IN_PROGRESS" && "bg-sky-50 text-sky-800 ring-sky-200",
        status === "PLANNED" && "bg-slate-50 text-slate-700 ring-slate-200",
        status === "NEEDS_UPDATE" && "bg-amber-50 text-amber-900 ring-amber-200",
        status === "NOT_EVALUATED" && "bg-slate-50 text-slate-500 ring-slate-200",
      )}
    >
      {label}
    </span>
  );
}

function hasEvidence(e: FeatureChannelEvaluation) {
  return Boolean(
    e.researchUrl ||
      e.reportUrl ||
      e.figmaUrl ||
      e.evidenceFileName ||
      e.evidenceFileUrl,
  );
}

function EvaluationOverlay({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-0 sm:p-4 sm:justify-end">
      <div
        className={cn(
          "flex h-full w-full flex-col bg-white shadow-xl sm:rounded-xl",
          wide ? "sm:max-w-xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            {subtitle ? (
              <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                {subtitle}
              </p>
            ) : null}
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function EvaluationRow({
  evaluation,
  canEdit,
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  historyCount,
}: {
  evaluation: FeatureChannelEvaluation;
  canEdit: boolean;
  onView?: () => void;
  onEdit: () => void;
  onDuplicate?: () => void;
  onArchive: () => void;
  historyCount?: number;
}) {
  const methodLabel = evaluationMethodLabel(
    evaluation.area,
    evaluation.methodCode,
    evaluation.methodCustomName,
  );
  const resultLines = formatEvaluationResultLines(
    evaluation.area,
    evaluation.methodCode,
    evaluation.results,
    evaluation.methodCustomName,
  );
  const dateLabel = formatDate(evaluation.evaluatedAt);
  const signalHint =
    evaluation.status === "NEEDS_UPDATE"
      ? "Atualização necessária"
      : evaluation.status === "IN_PROGRESS"
        ? "Em andamento"
        : resultLines[0] ?? null;

  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2.5">
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onView}
      >
        <p className="text-sm font-medium text-slate-800">
          {evaluationAreaLabel(evaluation.area)} · {methodLabel}
        </p>
        {signalHint ? (
          <p className="mt-0.5 text-xs font-medium text-slate-700">
            {resultLines.length > 1
              ? resultLines.slice(0, 2).join(" · ")
              : signalHint}
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <StatusBadge status={evaluation.status} />
          {dateLabel ? <span>{dateLabel}</span> : null}
        </div>
        {hasEvidence(evaluation) ? (
          <p className="mt-1 text-[11px] font-medium text-[var(--brand)]">
            Com evidências
          </p>
        ) : null}
        {historyCount && historyCount > 1 ? (
          <p className="mt-1 text-[11px] text-slate-500">
            {historyCount} medições no histórico
          </p>
        ) : null}
      </button>
      {canEdit ? (
        <ActionMenu
          items={[
            ...(onView ? [{ label: "Visualizar", onSelect: onView }] : []),
            { label: "Editar", onSelect: onEdit },
            ...(onDuplicate
              ? [{ label: "Duplicar", onSelect: onDuplicate }]
              : []),
            {
              label: "Arquivar",
              tone: "danger" as const,
              onSelect: onArchive,
            },
          ]}
        />
      ) : onView ? (
        <button
          type="button"
          className="text-xs font-medium text-[var(--brand)]"
          onClick={onView}
        >
          Ver
        </button>
      ) : null}
    </div>
  );
}

function methodKey(e: FeatureChannelEvaluation) {
  return `${e.area}::${e.methodCode}::${e.methodCustomName || ""}`;
}

function sortByRecency(a: FeatureChannelEvaluation, b: FeatureChannelEvaluation) {
  const da = a.evaluatedAt ?? a.createdAt;
  const db = b.evaluatedAt ?? b.createdAt;
  return db.localeCompare(da);
}

/** Lista das avaliações atuais (uma por método). Histórico via Visualizar. */
export function ChannelEvaluationsList({
  evaluations,
  canEdit,
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onAdd,
}: {
  evaluations: FeatureChannelEvaluation[];
  canEdit: boolean;
  onView: (e: FeatureChannelEvaluation) => void;
  onEdit: (e: FeatureChannelEvaluation) => void;
  onDuplicate: (e: FeatureChannelEvaluation) => void;
  onArchive: (id: string) => void;
  onAdd: () => void;
}) {
  const current = useMemo(() => {
    const groups = new Map<string, FeatureChannelEvaluation[]>();
    for (const e of evaluations) {
      const key = methodKey(e);
      const list = groups.get(key) ?? [];
      list.push(e);
      groups.set(key, list);
    }
    const list: FeatureChannelEvaluation[] = [];
    for (const items of groups.values()) {
      list.push([...items].sort(sortByRecency)[0]);
    }
    return list.sort(sortByRecency);
  }, [evaluations]);

  const historyCountByKey = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of evaluations) {
      const key = methodKey(e);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [evaluations]);

  return (
    <section className="space-y-2">
      <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        Avaliações
        {current.length > 0 ? ` · ${current.length}` : ""}
      </p>

      {current.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-4 text-center text-xs text-slate-500">
          Nenhuma avaliação neste canal.
        </p>
      ) : (
        <ul className="space-y-2">
          {current.map((e) => (
            <li key={e.id}>
              <EvaluationRow
                evaluation={e}
                canEdit={canEdit}
                onView={() => onView(e)}
                onEdit={() => onEdit(e)}
                onDuplicate={() => onDuplicate(e)}
                onArchive={() => onArchive(e.id)}
                historyCount={historyCountByKey.get(methodKey(e)) ?? 1}
              />
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar avaliação
        </Button>
      ) : null}
    </section>
  );
}

/** Host do wizard (nova / editar / duplicar). */
export function EvaluationWizardHost({
  featureId,
  channelContextId,
  primaryFccId,
  channelName,
  editor,
  onClose,
}: {
  featureId: string;
  channelContextId: string;
  primaryFccId: string;
  channelName: string;
  editor:
    | FeatureChannelEvaluation
    | null
    | "new"
    | { duplicate: FeatureChannelEvaluation };
  onClose: () => void;
}) {
  if (editor === null) return null;

  const evaluation =
    editor === "new"
      ? null
      : "duplicate" in editor
        ? { ...editor.duplicate, id: "" }
        : editor;

  const isDuplicate =
    typeof editor === "object" && editor && "duplicate" in editor;

  return (
    <EvaluationWizard
      featureId={featureId}
      channelContextId={channelContextId}
      primaryFccId={primaryFccId}
      channelName={channelName}
      evaluation={evaluation}
      forceNew={isDuplicate || editor === "new"}
      onClose={onClose}
    />
  );
}

function evaluationNativeValue(
  evaluation: FeatureChannelEvaluation,
): number | null {
  const r = evaluation.results ?? {};
  const raw =
    r.score ??
    r.compliance ??
    r.adherence ??
    r.success_rate ??
    r.result_summary;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function EvaluationHistoryLineChart({
  series,
}: {
  series: FeatureChannelEvaluation[];
}) {
  const points = useMemo(() => {
    return [...series]
      .map((e) => {
        const value = evaluationNativeValue(e);
        const date = e.evaluatedAt ?? e.createdAt;
        if (value == null || !date) return null;
        return {
          id: e.id,
          value,
          date,
          label: formatDate(date) ?? date.slice(0, 10),
        };
      })
      .filter(
        (p): p is { id: string; value: number; date: string; label: string } =>
          Boolean(p),
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [series]);

  if (points.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-slate-500">
        Sem valores numéricos suficientes para montar o gráfico.
      </p>
    );
  }

  const width = 360;
  const height = 160;
  const padX = 36;
  const padY = 24;
  const values = points.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = maxV - minV || 1;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const coords = points.map((p, i) => {
    const x =
      points.length === 1
        ? padX + plotW / 2
        : padX + (i / (points.length - 1)) * plotW;
    const y = padY + plotH - ((p.value - minV) / span) * plotH;
    return { ...p, x, y };
  });

  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <div className="rounded-lg border border-[var(--border)] bg-slate-50/50 px-2 py-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Histórico de medições"
      >
        <line
          x1={padX}
          y1={padY}
          x2={padX}
          y2={height - padY}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <text
          x={padX - 6}
          y={padY + 4}
          textAnchor="end"
          className="fill-slate-400"
          fontSize="10"
        >
          {Math.round(maxV * 10) / 10}
        </text>
        <text
          x={padX - 6}
          y={height - padY + 4}
          textAnchor="end"
          className="fill-slate-400"
          fontSize="10"
        >
          {Math.round(minV * 10) / 10}
        </text>
        <path
          d={path}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c) => (
          <g key={c.id}>
            <circle cx={c.x} cy={c.y} r="4" fill="var(--brand)" />
            <text
              x={c.x}
              y={height - 6}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize="9"
            >
              {c.label}
            </text>
            <title>{`${c.label}: ${c.value}`}</title>
          </g>
        ))}
      </svg>
      {points.length === 1 ? (
        <p className="mt-1 text-center text-[11px] text-slate-500">
          Uma medição registrada — novas coletas aparecerão na linha.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Modal Visualizar: editar a avaliação atual e ver histórico em gráfico de linha.
 */
export function EvaluationDetailModal({
  evaluation,
  allEvaluations,
  evidences = [],
  canEdit,
  featureId,
  channelContextId,
  primaryFccId,
  channelName,
  onClose,
  onAddEvidence,
}: {
  evaluation: FeatureChannelEvaluation;
  allEvaluations: FeatureChannelEvaluation[];
  /** Evidence rows com owner EVALUATION (canônico). */
  evidences?: Evidence[];
  canEdit: boolean;
  featureId: string;
  channelContextId: string;
  primaryFccId: string;
  channelName: string;
  onClose: () => void;
  onAddEvidence?: (evaluation: FeatureChannelEvaluation) => void;
}) {
  const [editingEval, setEditingEval] =
    useState<FeatureChannelEvaluation | null>(null);
  const linkedEvidences = useMemo(
    () => getEvidenceForOwner(evidences, "EVALUATION", evaluation.id),
    [evidences, evaluation.id],
  );
  const methodLabel = evaluationMethodLabel(
    evaluation.area,
    evaluation.methodCode,
    evaluation.methodCustomName,
  );
  const lines = formatEvaluationResultLines(
    evaluation.area,
    evaluation.methodCode,
    evaluation.results,
    evaluation.methodCustomName,
  );
  const series = useMemo(() => {
    const key = methodKey(evaluation);
    return allEvaluations
      .filter((e) => methodKey(e) === key)
      .sort((a, b) =>
        (a.evaluatedAt ?? a.createdAt).localeCompare(
          b.evaluatedAt ?? b.createdAt,
        ),
      );
  }, [allEvaluations, evaluation]);

  const listNewestFirst = useMemo(
    () => [...series].sort(sortByRecency),
    [series],
  );

  if (editingEval) {
    return (
      <EvaluationWizard
        featureId={featureId}
        channelContextId={channelContextId}
        primaryFccId={primaryFccId}
        channelName={channelName}
        evaluation={editingEval}
        onClose={onClose}
        onCancel={() => setEditingEval(null)}
      />
    );
  }

  return (
    <EvaluationOverlay
      title={evaluation.name || methodLabel}
      subtitle={`${evaluationAreaLabel(evaluation.area)} · ${methodLabel}`}
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        <section className="space-y-2">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            Histórico
            {series.length > 0 ? ` · ${series.length} medições` : ""}
          </p>
          <EvaluationHistoryLineChart series={series} />

          {listNewestFirst.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {listNewestFirst.map((e) => {
                const isCurrent = e.id === evaluation.id;
                const resultLines = formatEvaluationResultLines(
                  e.area,
                  e.methodCode,
                  e.results,
                  e.methodCustomName,
                );
                return (
                  <li
                    key={e.id}
                    className={cn(
                      "flex items-start justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2.5",
                      isCurrent ? "bg-white" : "bg-slate-50/70",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isCurrent ? (
                          <span className="rounded-md bg-[var(--brand-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--brand)]">
                            Atual
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">
                            Histórico
                          </span>
                        )}
                        <StatusBadge status={e.status} />
                        {formatDate(e.evaluatedAt) ? (
                          <span className="text-xs text-slate-500">
                            {formatDate(e.evaluatedAt)}
                          </span>
                        ) : null}
                      </div>
                      {resultLines.length > 0 ? (
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {resultLines.slice(0, 2).join(" · ")}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-slate-500">
                          Sem resultado registrado
                        </p>
                      )}
                    </div>
                    {canEdit ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingEval(e)}
                      >
                        Editar
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        <section className="space-y-2 border-t border-[var(--border)] pt-4">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            Avaliação atual
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <StatusBadge status={evaluation.status} />
            {formatDate(evaluation.evaluatedAt) ? (
              <span>{formatDate(evaluation.evaluatedAt)}</span>
            ) : null}
            {evaluation.responsible ? (
              <span>· {evaluation.responsible}</span>
            ) : null}
          </div>
          {lines.length > 0 ? (
            <p className="text-sm font-medium text-slate-800">
              {lines.join(" · ")}
            </p>
          ) : null}
          {evaluation.findings ? (
            <p className="text-sm text-slate-600">{evaluation.findings}</p>
          ) : null}
          {evaluation.objective ? (
            <p className="text-xs text-slate-500">
              Objetivo: {evaluation.objective}
            </p>
          ) : null}
          {(() => {
            const legacyOnly = filterEmbeddedNotYetMaterialized(
              listEvaluationEmbeddedAttachments(evaluation),
              evidences,
            );
            if (legacyOnly.length === 0) return null;
            return (
            <div className="space-y-1 text-xs">
              <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Anexos embutidos (legado)
              </p>
              {legacyOnly.map((att) =>
                att.href ? (
                  <a
                    key={att.id}
                    href={att.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[var(--brand)] hover:underline"
                  >
                    {att.label}
                  </a>
                ) : (
                  <p key={att.id} className="text-slate-600">
                    {att.label}
                  </p>
                ),
              )}
            </div>
            );
          })()}

          <div className="space-y-2 border-t border-[var(--border)] pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Evidências da avaliação
              </p>
              {canEdit && onAddEvidence ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onAddEvidence(evaluation)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              ) : null}
            </div>
            {linkedEvidences.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nenhuma evidência canônica vinculada a esta avaliação.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {linkedEvidences.map((ev) => {
                  const href = ev.link || ev.fileUrl || null;
                  return (
                    <li
                      key={ev.id}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-xs"
                    >
                      <p className="font-medium text-slate-800">{ev.title}</p>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-block text-[var(--brand)] hover:underline"
                        >
                          Abrir
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setEditingEval(evaluation)}
            >
              Editar avaliação
            </Button>
          ) : null}
        </div>
      </div>
    </EvaluationOverlay>
  );
}

function EvaluationWizard({
  featureId,
  channelContextId,
  primaryFccId,
  channelName,
  evaluation,
  forceNew = false,
  onClose,
  onCancel,
}: {
  featureId: string;
  channelContextId: string;
  primaryFccId: string;
  channelName: string;
  evaluation: FeatureChannelEvaluation | null;
  forceNew?: boolean;
  onClose: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(evaluation?.id) && !forceNew;
  const [step, setStep] = useState(isEdit ? 4 : 1);
  const [area, setArea] = useState(evaluation?.area ?? "");
  const [studyType, setStudyType] = useState(evaluation?.studyType ?? "");
  const [methodCode, setMethodCode] = useState(evaluation?.methodCode ?? "");
  const [customName, setCustomName] = useState(
    evaluation?.methodCustomName ?? "",
  );
  const [status, setStatus] = useState(
    evaluation?.status ?? ("PLANNED" as EvaluationStatusCode),
  );
  const [needsEvolution, setNeedsEvolution] = useState(
    Boolean(evaluation?.needsEvolution),
  );

  const studyOptions = area ? studyTypesForArea(area) : [];
  const methodOptions =
    area && studyType ? methodsForAreaAndStudy(area, studyType) : [];
  const method =
    methodCode === "CUSTOM" || methodCode === "OTHER"
      ? CUSTOM_METHOD
      : getMethod(area, methodCode);

  const maxStep = 5;

  function goNext() {
    if (step === 1 && !area) return;
    if (step === 2 && !studyType) return;
    if (step === 3 && !methodCode) return;
    if (step === 3 && methodCode === "CUSTOM" && !customName.trim()) return;
    setStep((s) => Math.min(maxStep, s + 1));
  }

  return (
    <EvaluationOverlay
      title={isEdit ? "Editar avaliação" : "Nova avaliação"}
      subtitle={channelName}
      onClose={onCancel ?? onClose}
      wide
    >
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="mb-3 text-xs font-medium text-[var(--brand)] underline-offset-2 hover:underline"
        >
          ← Voltar para visualização
        </button>
      ) : null}
      {!isEdit ? (
        <p className="mb-4 text-xs text-slate-500">
          Etapa {Math.min(step, 4)} de 4
          {step === 5 ? " · Resultado e evidências" : ""}
        </p>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-800">Área</p>
          <div className="grid grid-cols-2 gap-2">
            {EVALUATION_AREAS.map((a) => (
              <button
                key={a.code}
                type="button"
                onClick={() => {
                  setArea(a.code);
                  setStudyType("");
                  setMethodCode("");
                }}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  area === a.code
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "border-[var(--border)] bg-white text-slate-700 hover:border-slate-300",
                )}
              >
                <span className="font-semibold">{a.shortLabel}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                  {a.label.includes("—")
                    ? a.label.split("—")[1]?.trim()
                    : a.label}
                </span>
              </button>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button type="button" disabled={!area} onClick={goNext}>
              Continuar
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-800">
            Tipo de estudo / avaliação
          </p>
          <p className="text-xs text-slate-500">
            Área: {evaluationAreaLabel(area)}
          </p>
          <div className="space-y-2">
            {studyOptions.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => {
                  setStudyType(s.code);
                  setMethodCode("");
                }}
                className={cn(
                  "flex w-full rounded-lg border px-3 py-2.5 text-left text-sm",
                  studyType === s.code
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "border-[var(--border)] bg-white hover:border-slate-300",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button type="button" disabled={!studyType} onClick={goNext}>
              Continuar
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-800">Pesquisa / método</p>
          <p className="text-xs text-slate-500">
            {evaluationAreaLabel(area)} ·{" "}
            {STUDY_TYPE_LABEL[studyType as keyof typeof STUDY_TYPE_LABEL] ??
              studyType}
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {methodOptions.map((m) => (
              <button
                key={m.code}
                type="button"
                onClick={() => setMethodCode(m.code)}
                className={cn(
                  "flex w-full rounded-lg border px-3 py-2.5 text-left text-sm",
                  methodCode === m.code
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "border-[var(--border)] bg-white hover:border-slate-300",
                )}
              >
                {m.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMethodCode("CUSTOM")}
              className={cn(
                "flex w-full rounded-lg border border-dashed px-3 py-2.5 text-left text-sm",
                methodCode === "CUSTOM"
                  ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                  : "border-[var(--border)] text-slate-600 hover:border-slate-300",
              )}
            >
              + Outra avaliação
            </button>
          </div>
          {methodCode === "CUSTOM" ? (
            <label className="block text-sm">
              <span className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                Nome da avaliação
              </span>
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="Ex.: Mystery shopping"
              />
            </label>
          ) : null}
          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Voltar
            </Button>
            <Button
              type="button"
              disabled={
                !methodCode ||
                (methodCode === "CUSTOM" && !customName.trim())
              }
              onClick={goNext}
            >
              Continuar
            </Button>
          </div>
        </div>
      ) : null}

      {step >= 4 ? (
        <CrudForm
          action={upsertFeatureChannelEvaluation}
          submitLabel={isEdit ? "Salvar alterações" : "Salvar avaliação"}
          onSuccess={onClose}
        >
          {isEdit && evaluation?.id ? (
            <input type="hidden" name="id" value={evaluation.id} />
          ) : null}
          <input type="hidden" name="feature_id" value={featureId} />
          <input
            type="hidden"
            name="channel_context_id"
            value={channelContextId}
          />
          <input
            type="hidden"
            name="feature_channel_context_id"
            value={primaryFccId}
          />
          <input type="hidden" name="area" value={area} />
          <input type="hidden" name="study_type" value={studyType || "CUSTOM"} />
          <input type="hidden" name="method_code" value={methodCode} />
          <input type="hidden" name="method_custom_name" value={customName} />
          <input
            type="hidden"
            name="needs_evolution"
            value={needsEvolution ? "true" : "false"}
          />

          <div className="mb-3 rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span className="font-medium text-slate-800">
              {evaluationAreaLabel(area)}
            </span>
            {" · "}
            {evaluationMethodLabel(area, methodCode, customName)}
            {!isEdit ? (
              <button
                type="button"
                className="ml-2 text-[var(--brand)] underline-offset-2 hover:underline"
                onClick={() => setStep(1)}
              >
                Alterar
              </button>
            ) : null}
          </div>

          <Field
            label="Nome da pesquisa"
            name="name"
            required
            defaultValue={
              evaluation?.name ||
              (methodCode === "CUSTOM"
                ? customName
                : method?.label ?? "")
            }
          />
          <Field
            label="Objetivo"
            name="objective"
            as="textarea"
            defaultValue={evaluation?.objective}
          />

          <label className="block text-sm">
            <span className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
              Status
            </span>
            <select
              name="status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as EvaluationStatusCode)
              }
              className="mt-1 flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              {(
                Object.keys(EVALUATION_STATUS_LABEL) as EvaluationStatusCode[]
              )
                .filter((s) => s !== "NOT_EVALUATED")
                .map((s) => (
                  <option key={s} value={s}>
                    {EVALUATION_STATUS_LABEL[s]}
                  </option>
                ))}
            </select>
          </label>

          <Field
            label="Data da avaliação"
            name="evaluated_at"
            type="date"
            defaultValue={evaluation?.evaluatedAt?.slice(0, 10)}
          />
          <Field
            label="Público / segmento"
            name="audience_segment"
            defaultValue={evaluation?.audienceSegment}
          />
          <Field
            label="Responsável"
            name="responsible"
            defaultValue={evaluation?.responsible}
          />

          {method?.fields.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              name={`result_${f.key}`}
              as={f.kind === "textarea" ? "textarea" : "input"}
              type={f.kind === "number" ? "number" : "text"}
              required={f.required}
              defaultValue={
                evaluation?.results?.[f.key] != null
                  ? String(evaluation.results[f.key])
                  : ""
              }
            />
          ))}

          <Field
            label="Principais achados"
            name="findings"
            as="textarea"
            defaultValue={evaluation?.findings}
          />
          <Field
            label="Observações"
            name="notes"
            as="textarea"
            defaultValue={evaluation?.notes}
          />

          <p className="pt-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Evidências
          </p>
          <Field
            label="Link da pesquisa"
            name="research_url"
            defaultValue={evaluation?.researchUrl ?? ""}
          />
          <Field
            label="Link do relatório"
            name="report_url"
            defaultValue={evaluation?.reportUrl ?? ""}
          />
          <Field
            label="Link do Figma"
            name="figma_url"
            defaultValue={evaluation?.figmaUrl ?? ""}
          />
          <EvidenceFileField
            label="Arquivo / evidência (PDF ou imagem)"
            inputName="research_file"
            removeName="remove_research_file"
            existingFileName={evaluation?.evidenceFileName}
            existingFileMime={evaluation?.evidenceFileMime}
            existingFileSize={evaluation?.evidenceFileSize}
            existingFileUrl={evaluation?.evidenceFileUrl}
          />

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
              Precisa de evolução?
            </legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setNeedsEvolution(true)}
                className={
                  needsEvolution
                    ? "rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-3.5 py-1.5 text-sm font-medium text-[var(--brand)]"
                    : "rounded-full border border-slate-200 bg-slate-100 px-3.5 py-1.5 text-sm text-slate-500"
                }
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setNeedsEvolution(false)}
                className={
                  !needsEvolution
                    ? "rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-3.5 py-1.5 text-sm font-medium text-[var(--brand)]"
                    : "rounded-full border border-slate-200 bg-slate-100 px-3.5 py-1.5 text-sm text-slate-500"
                }
              >
                Não
              </button>
            </div>
          </fieldset>

          {!isEdit ? (
            <div className="flex justify-start pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(3)}
              >
                Voltar
              </Button>
            </div>
          ) : null}
        </CrudForm>
      ) : null}
    </EvaluationOverlay>
  );
}
