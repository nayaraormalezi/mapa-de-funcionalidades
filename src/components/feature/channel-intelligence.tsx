"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveRecord } from "@/app/actions/crud";
import {
  ChannelEvaluationsList,
  EvaluationDetailModal,
  EvaluationWizardHost,
} from "@/components/feature/channel-evaluations";
import { Button } from "@/components/ui/button";
import {
  SIGNAL_LABEL,
  buildChannelIntelligence,
  type Opportunity,
} from "@/lib/evaluation-intelligence";
import {
  evaluationAreaLabel,
} from "@/lib/evaluation-taxonomy";
import { cn } from "@/lib/utils";
import type { FeatureChannelEvaluation } from "@/types";
import { X } from "lucide-react";

function signalDot(signal: string) {
  const color =
    signal === "GOOD"
      ? "bg-emerald-500"
      : signal === "ATTENTION"
        ? "bg-amber-500"
        : signal === "CRITICAL"
          ? "bg-rose-500"
          : "bg-slate-300";
  return cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", color);
}

function HealthRing({
  score,
  signal,
}: {
  score: number | null;
  signal: string;
}) {
  const value = score ?? 0;
  const deg = (value / 100) * 360;
  const color =
    signal === "GOOD"
      ? "#059669"
      : signal === "CRITICAL"
        ? "#e11d48"
        : signal === "ATTENTION"
          ? "#d97706"
          : "#94a3b8";

  return (
    <div
      className="relative mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full"
      style={{
        background:
          score == null
            ? "#e2e8f0"
            : `conic-gradient(${color} ${deg}deg, #e2e8f0 0deg)`,
      }}
    >
      <div className="flex h-[56px] w-[56px] flex-col items-center justify-center rounded-full bg-white">
        <span className="text-lg font-semibold tabular-nums text-slate-900">
          {score != null ? score : "—"}
        </span>
        {score != null ? (
          <span className="text-[9px] font-medium tracking-wide text-slate-400 uppercase">
            /100
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Resumo escaneável sob as tabs (sempre visível). */
export function HealthGlance({
  evaluations,
}: {
  evaluations: FeatureChannelEvaluation[];
}) {
  const intel = useMemo(
    () => buildChannelIntelligence(evaluations),
    [evaluations],
  );

  if (intel.healthScore == null) {
    return (
      <p className="mt-2 text-[11px] text-slate-500">
        Saúde — · Sem evidências
      </p>
    );
  }

  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
      <span className="font-medium text-slate-800">
        Saúde {intel.healthScore}
      </span>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1">
        <span className={signalDot(intel.healthSignal)} />
        {SIGNAL_LABEL[intel.healthSignal]}
      </span>
    </p>
  );
}

/**
 * Conteúdo da tab Avaliações: saúde + scores + lista + updates + oportunidades.
 */
export type EvaluationLaunchRequest = {
  mode: "duplicate" | "view" | "new";
  evaluationId?: string;
  /** Força remount do wizard ao reutilizar o mesmo canal. */
  nonce?: number;
};

function initialEditorFromLaunch(
  launchRequest: EvaluationLaunchRequest | null | undefined,
  evaluations: FeatureChannelEvaluation[],
): FeatureChannelEvaluation | null | "new" | { duplicate: FeatureChannelEvaluation } {
  if (!launchRequest) return null;
  if (launchRequest.mode === "new") return "new";
  if (!launchRequest.evaluationId) return launchRequest.mode === "duplicate" ? "new" : null;
  const source = evaluations.find((e) => e.id === launchRequest.evaluationId);
  if (launchRequest.mode === "duplicate") {
    return source ? { duplicate: source } : "new";
  }
  return null;
}

function initialViewingFromLaunch(
  launchRequest: EvaluationLaunchRequest | null | undefined,
  evaluations: FeatureChannelEvaluation[],
): FeatureChannelEvaluation | null {
  if (!launchRequest || launchRequest.mode !== "view" || !launchRequest.evaluationId) {
    return null;
  }
  return evaluations.find((e) => e.id === launchRequest.evaluationId) ?? null;
}

export function ChannelAssessmentsTab({
  featureId,
  channelContextId,
  primaryFccId,
  channelName,
  evaluations,
  evidences = [],
  canEdit,
  onCreateEvolution,
  launchRequest,
  onAddEvidence,
}: {
  featureId: string;
  channelContextId: string;
  primaryFccId: string;
  channelName: string;
  evaluations: FeatureChannelEvaluation[];
  evidences?: import("@/types").Evidence[];
  canEdit: boolean;
  onCreateEvolution?: (opportunity?: Opportunity) => void;
  launchRequest?: EvaluationLaunchRequest | null;
  onLaunchHandled?: () => void;
  onAddEvidence?: (evaluation: FeatureChannelEvaluation) => void;
}) {
  const intel = useMemo(
    () => buildChannelIntelligence(evaluations),
    [evaluations],
  );
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [editor, setEditor] = useState<
    FeatureChannelEvaluation | null | "new" | { duplicate: FeatureChannelEvaluation }
  >(() => initialEditorFromLaunch(launchRequest, evaluations));
  const [viewing, setViewing] = useState<FeatureChannelEvaluation | null>(() =>
    initialViewingFromLaunch(launchRequest, evaluations),
  );
  const router = useRouter();
  const [, startTransition] = useTransition();

  function removeEvaluation(id: string) {
    if (!confirm("Arquivar esta avaliação?")) return;
    startTransition(async () => {
      const result = await archiveRecord("feature_channel_evaluations", id);
      if (result.ok) router.refresh();
      else alert(result.message);
    });
  }

  const areaScores = intel.areas.filter((a) =>
    ["CX", "UX", "UI", "ACCESSIBILITY"].includes(a.area),
  );

  const staleMethods = intel.methods.filter((m) => m.stale);

  return (
    <div className="mt-3 space-y-4">
      {/* Saúde */}
      <section className="rounded-lg border border-[var(--border)] bg-slate-50/70 p-3">
        <p className="text-center text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
          Saúde da experiência
        </p>

        {intel.healthScore == null ? (
          <div className="mt-2 text-center">
            <p className="text-sm font-medium text-slate-800">
              Sem evidências suficientes
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              A ausência de evidências não significa que exista um problema.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-2">
              <HealthRing
                score={intel.healthScore}
                signal={intel.healthSignal}
              />
            </div>
            <p className="mt-1.5 text-center text-xs font-medium text-slate-700">
              <span className={cn("mr-1.5", signalDot(intel.healthSignal))} />
              {SIGNAL_LABEL[intel.healthSignal]}
            </p>
            <div className="mt-3 grid grid-cols-4 gap-1 text-center">
              {areaScores.map((a) => (
                <div key={a.area} className="min-w-0">
                  <p className="truncate text-[10px] font-medium text-slate-500">
                    {a.label}
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-slate-800">
                    {a.score != null ? a.score : "—"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
              <span>Cobertura: {intel.coveragePercent}%</span>
              <span>Confiança: {intel.confidenceLabel}</span>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-600">
              {intel.opportunities.length > 0
                ? `${intel.opportunities.length} oportunidade${intel.opportunities.length === 1 ? "" : "s"}`
                : "Sem oportunidades"}
              {intel.staleCount > 0
                ? ` · ${intel.staleCount} avaliação${intel.staleCount === 1 ? "" : "ões"} precisam de atualização`
                : ""}
            </p>
          </>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          disabled={intel.evidenceCount === 0}
          onClick={() => setIntelligenceOpen(true)}
        >
          Mostrar inteligência
        </Button>
      </section>

      {/* Lista de avaliações */}
      <ChannelEvaluationsList
        evaluations={evaluations}
        canEdit={canEdit}
        onView={(e) => setViewing(e)}
        onEdit={(e) => setEditor(e)}
        onDuplicate={(e) => setEditor({ duplicate: e })}
        onArchive={(id) => removeEvaluation(id)}
        onAdd={() => setEditor("new")}
      />

      {/* Atualizações necessárias */}
      {staleMethods.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            Atualizações necessárias
          </p>
          {staleMethods.map((m) => (
            <div
              key={m.evaluationId}
              className="rounded-lg border border-amber-200/80 bg-amber-50/40 px-3 py-2.5"
            >
              <p className="text-sm font-medium text-slate-800">
                ⚠ {m.methodLabel} precisa ser atualizado
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {m.evaluatedAt
                  ? `Última avaliação: ${m.evaluatedAt.slice(0, 10).split("-").reverse().join("/")}`
                  : "Data não registrada"}
                {m.validityDays != null
                  ? ` · Periodicidade: ${m.validityDays} dias`
                  : ""}
              </p>
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    const source = evaluations.find(
                      (e) => e.id === m.evaluationId,
                    );
                    if (source) setEditor({ duplicate: source });
                    else setEditor("new");
                  }}
                >
                  Iniciar nova avaliação
                </Button>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {/* Oportunidades */}
      {intel.opportunities.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            Oportunidades de evolução
          </p>
          <p className="text-[11px] text-slate-500">
            Geradas a partir de notas baixas nas avaliações deste canal.
          </p>
          {intel.opportunities.slice(0, 3).map((op) => (
            <div
              key={op.id}
              className="rounded-lg border border-[var(--border)] px-3 py-2.5"
            >
              <p className="text-sm font-semibold text-slate-800">
                <span className={cn("mr-1.5", signalDot(op.severity))} />
                {op.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {op.areas.map((a) => evaluationAreaLabel(a)).join(" + ")}
                {op.evidence[0] ? ` · ${op.evidence[0]}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIntelligenceOpen(true)}
                >
                  Mostrar oportunidade
                </Button>
                {onCreateEvolution ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onCreateEvolution(op)}
                  >
                    Criar evolução
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {intelligenceOpen ? (
        <IntelligencePanel
          evaluations={evaluations}
          channelName={channelName}
          onClose={() => setIntelligenceOpen(false)}
          onCreateEvolution={(op) => {
            setIntelligenceOpen(false);
            onCreateEvolution?.(op);
          }}
        />
      ) : null}

      {viewing ? (
        <EvaluationDetailModal
          evaluation={viewing}
          allEvaluations={evaluations}
          evidences={evidences}
          canEdit={canEdit}
          featureId={featureId}
          channelContextId={channelContextId}
          primaryFccId={primaryFccId}
          channelName={channelName}
          onClose={() => setViewing(null)}
          onAddEvidence={onAddEvidence}
        />
      ) : null}

      <EvaluationWizardHost
        featureId={featureId}
        channelContextId={channelContextId}
        primaryFccId={primaryFccId}
        channelName={channelName}
        editor={editor}
        onClose={() => setEditor(null)}
      />
    </div>
  );
}

export function IntelligencePanel({
  evaluations,
  channelName,
  onClose,
  onCreateEvolution,
}: {
  evaluations: FeatureChannelEvaluation[];
  channelName: string;
  onClose: () => void;
  onCreateEvolution?: (opportunity?: Opportunity) => void;
}) {
  const intel = useMemo(
    () => buildChannelIntelligence(evaluations),
    [evaluations],
  );
  const [showMethod, setShowMethod] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-0 sm:p-4">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl sm:rounded-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              {channelName}
            </p>
            <h2 className="text-base font-semibold text-slate-900">
              Inteligência da experiência
            </h2>
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

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section className="text-center">
            <HealthRing
              score={intel.healthScore}
              signal={intel.healthSignal}
            />
            <p className="mt-2 text-sm font-semibold text-slate-900">
              Saúde da experiência
            </p>
            <p className="text-xs text-slate-500">
              {intel.healthScore != null
                ? `${SIGNAL_LABEL[intel.healthSignal]} · Confiança ${intel.confidenceLabel}`
                : "Aguardando evidências"}
            </p>
            <button
              type="button"
              onClick={() => setShowMethod(true)}
              className="mt-2 text-xs font-medium text-[var(--brand)] underline-offset-2 hover:underline"
            >
              Como essa nota foi calculada?
            </button>
          </section>

          <section className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--border)] bg-slate-50/80 px-3 py-3">
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                Cobertura
              </p>
              <p className="text-lg font-semibold tabular-nums text-slate-900">
                {intel.coveragePercent}%
              </p>
              <p className="text-[11px] text-slate-500">
                {intel.coveredCount} de {intel.expectedCount} dimensões
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                Confiança
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {intel.confidenceLabel}
              </p>
              <p className="text-[11px] text-slate-500">
                {intel.evidenceCount} evidência
                {intel.evidenceCount === 1 ? "" : "s"}
              </p>
            </div>
          </section>

          {intel.narrative.map((line) => (
            <p key={line} className="text-xs leading-relaxed text-slate-600">
              {line}
            </p>
          ))}

          {intel.crossInsights.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Evidências convergentes
              </h3>
              {intel.crossInsights.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-amber-200/80 bg-amber-50/40 px-3 py-2.5"
                >
                  <p className="text-sm text-slate-800">{c.hypothesis}</p>
                  <ul className="mt-2 space-y-0.5">
                    {c.evidence.map((e) => (
                      <li key={e} className="text-[11px] text-slate-600">
                        · {e}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}

          {intel.opportunities.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Oportunidades
              </h3>
              {intel.opportunities.map((op) => (
                <div
                  key={op.id}
                  className="rounded-lg border border-[var(--border)] px-3 py-2.5"
                >
                  <p className="text-sm font-semibold text-slate-800">
                    <span className={cn("mr-1.5", signalDot(op.severity))} />
                    {op.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">{op.summary}</p>
                  <ul className="mt-2 space-y-0.5">
                    {op.evidence.slice(0, 4).map((e) => (
                      <li key={e} className="text-[11px] text-slate-500">
                        · {e}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-slate-700">
                    <span className="font-medium">Recomendação:</span>{" "}
                    {op.suggestion}
                  </p>
                  {onCreateEvolution ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => onCreateEvolution(op)}
                    >
                      Criar evolução
                    </Button>
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}

          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Por área
            </h3>
            {intel.areas
              .filter((a) => a.covered)
              .map((a) => (
                <div
                  key={a.area}
                  className="rounded-lg border border-[var(--border)] px-3 py-2"
                >
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      <span className={cn("mr-1.5", signalDot(a.signal))} />
                      {a.label}
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      {a.score}/100
                    </p>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {a.reasons.map((r) => (
                      <li key={r} className="text-xs text-slate-600">
                        · {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </section>
        </div>
      </div>

      {showMethod ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                Como essa nota foi calculada?
              </h3>
              <button
                type="button"
                onClick={() => setShowMethod(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">
              {intel.methodology.healthScore ?? "—"}
              <span className="text-sm font-medium text-slate-400"> /100</span>
            </p>
            <div className="mt-4 space-y-2">
              {intel.methodology.lines.map((line) => (
                <div
                  key={line.area}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">
                      {line.label} {line.score}
                    </span>
                    <span className="tabular-nums text-slate-500">
                      × {(line.effectiveWeight * 100).toFixed(0)}% ={" "}
                      {line.contribution}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {intel.methodology.uncoveredAreas.length > 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                Sem dados:{" "}
                {intel.methodology.uncoveredAreas.map((a) => a.label).join(", ")}
              </p>
            ) : null}
            <Button
              type="button"
              className="mt-4 w-full"
              onClick={() => setShowMethod(false)}
            >
              Entendi
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
