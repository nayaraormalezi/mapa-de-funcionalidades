"use client";

import Link from "next/link";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { Button } from "@/components/ui/button";
import type { DetectedCoverageGap } from "@/lib/coverage-gaps";
import { SIGNAL_LABEL } from "@/lib/evaluation-intelligence";
import type { Opportunity } from "@/lib/evaluation-intelligence";
import {
  CONCEPT_LABEL,
  featureStageLabel,
  gapStatusLabel,
  gapTypeLabel,
  priorityLabel,
} from "@/lib/labels";
import { formatMonthYear } from "@/app/roadmap/roadmap-types";
import type { FeatureChannelEvaluation, Gap } from "@/types";
import { AlertTriangle, Lightbulb, RefreshCw, ShieldAlert } from "lucide-react";

export type FeatureStaleUpdate = {
  evaluationId: string;
  channelContextId: string;
  channelName: string;
  audienceName: string;
  momentName: string;
  methodLabel: string;
  evaluatedAt: string | null;
  staleDays: number | null;
  validityDays: number | null;
  signalReason: string;
  evaluation: FeatureChannelEvaluation | null;
};

export type FeatureOpportunityRow = {
  channelName: string;
  channelContextId: string;
  audienceName: string;
  momentName: string;
  opportunity: Opportunity;
  fccId: string;
};

export function FeatureSignalsSection({
  coverageGaps,
  opportunities,
  issues,
  updates,
  canEdit,
  onViewImplementation,
  onCreateEvolutionFromGap,
  onCreateEvolutionFromOpportunity,
  onCreateEvolutionFromIssue,
  onViewEvaluation,
  onStartNewEvaluation,
  onAddIssue,
  onEditIssue,
  onResolveIssue,
  cleanDescription,
}: {
  coverageGaps: DetectedCoverageGap[];
  opportunities: FeatureOpportunityRow[];
  issues: Gap[];
  updates: FeatureStaleUpdate[];
  canEdit: boolean;
  onViewImplementation: (gap: DetectedCoverageGap) => void;
  onCreateEvolutionFromGap: (gap: DetectedCoverageGap) => void;
  onCreateEvolutionFromOpportunity: (row: FeatureOpportunityRow) => void;
  onCreateEvolutionFromIssue: (issue: Gap) => void;
  onViewEvaluation: (channelContextId: string, evaluationId: string) => void;
  onStartNewEvaluation: (update: FeatureStaleUpdate) => void;
  onAddIssue: () => void;
  onEditIssue: (issue: Gap) => void;
  onResolveIssue: (issue: Gap) => void;
  cleanDescription: (text: string) => string;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Sinais</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
          O que precisa de atenção nesta funcionalidade —{" "}
          {CONCEPT_LABEL.lacunas.toLowerCase()}, experiência,{" "}
          {CONCEPT_LABEL.problemas.toLowerCase()} e pesquisas desatualizadas.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {CONCEPT_LABEL.lacunas} · {coverageGaps.length}
          {" · "}
          {CONCEPT_LABEL.opportunities} · {opportunities.length}
          {" · "}
          {CONCEPT_LABEL.problemas} · {issues.length}
          {" · "}
          Atualizações · {updates.length}
        </p>
      </div>

      <SignalCategory
        icon={RefreshCw}
        title="Atualizações necessárias"
        count={updates.length}
        empty="Nenhuma atualização necessária."
      >
        {updates.map((u) => (
          <div
            key={`${u.channelContextId}-${u.evaluationId}`}
            className="rounded-xl border border-amber-200/80 bg-amber-50/40 px-4 py-3"
          >
            <p className="text-sm font-medium text-slate-800">
              ⚠ {u.methodLabel} precisa ser atualizado
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Canal: {u.channelName}
              {" · "}
              {u.audienceName} · {u.momentName}
              {u.evaluatedAt
                ? ` · Última: ${u.evaluatedAt.slice(0, 10).split("-").reverse().join("/")}`
                : ""}
              {u.validityDays != null
                ? ` · Periodicidade: ${u.validityDays} dias`
                : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onStartNewEvaluation(u)}
                >
                  Iniciar nova avaliação
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  onViewEvaluation(u.channelContextId, u.evaluationId)
                }
              >
                Mostrar avaliação anterior
              </Button>
            </div>
          </div>
        ))}
      </SignalCategory>

      <SignalCategory
        icon={Lightbulb}
        title={CONCEPT_LABEL.opportunities}
        count={opportunities.length}
        empty={`Nenhuma ${CONCEPT_LABEL.opportunity.toLowerCase()} identificada.`}
      >
        {opportunities.map((row) => (
          <div
            key={`${row.channelContextId}-${row.opportunity.id}`}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {row.opportunity.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {row.opportunity.summary}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Canal: {row.channelName}
                  {" · "}
                  {row.audienceName} · {row.momentName}
                  {" · "}
                  {SIGNAL_LABEL[row.opportunity.severity]}
                  {row.opportunity.evidence[0]
                    ? ` · ${row.opportunity.evidence[0]}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.opportunity.evaluationIds[0] ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onViewEvaluation(
                        row.channelContextId,
                        row.opportunity.evaluationIds[0],
                      )
                    }
                  >
                    Mostrar avaliação
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onCreateEvolutionFromOpportunity(row)}
                  >
                    Criar evolução
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </SignalCategory>

      <SignalCategory
        icon={ShieldAlert}
        title={CONCEPT_LABEL.coverageGaps}
        count={coverageGaps.length}
        empty={`Nenhum ${CONCEPT_LABEL.coverageGap.toLowerCase()} identificado.`}
      >
        {coverageGaps.map((gap) => (
          <div
            key={gap.id}
            className="rounded-xl border border-amber-200/80 bg-amber-50/40 px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
                    {CONCEPT_LABEL.coverageGap}
                  </span>
                  <p className="text-sm font-semibold text-slate-900">
                    {gap.title}
                  </p>
                  <span className="inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
                    {gap.reason === "BACKLOG" ? "Em backlog" : "Não prevista"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{gap.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Canal: {gap.channelName}
                  {" · "}
                  Fase:{" "}
                  {featureStageLabel[
                    gap.phase as keyof typeof featureStageLabel
                  ] ?? gap.phase}
                  {gap.expectedDate
                    ? ` · Previsão: ${formatMonthYear(gap.expectedDate)}`
                    : " · Sem previsão"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onViewImplementation(gap)}
                >
                  Mostrar implementação
                </Button>
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onCreateEvolutionFromGap(gap)}
                  >
                    Criar evolução
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </SignalCategory>

      <SignalCategory
        icon={AlertTriangle}
        title={`${CONCEPT_LABEL.issues} vinculadas`}
        count={issues.length}
        empty={`Nenhuma ${CONCEPT_LABEL.issue.toLowerCase()} cadastrada.`}
        action={
          canEdit ? (
            <Button type="button" size="sm" onClick={onAddIssue}>
              Adicionar {CONCEPT_LABEL.issue.toLowerCase()}
            </Button>
          ) : undefined
        }
      >
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                    {CONCEPT_LABEL.issue}
                  </span>
                  <p className="text-sm font-semibold text-slate-900">
                    {issue.title}
                  </p>
                  <PriorityBadge priority={issue.priority} />
                </div>
                {issue.description ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {cleanDescription(issue.description)}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  {gapTypeLabel[issue.type]}
                  {" · "}
                  {gapStatusLabel[issue.status]}
                  {" · "}
                  Impacto: {priorityLabel[issue.impact]}
                  {issue.responsible
                    ? ` · Responsável: ${issue.responsible}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/gaps/${issue.id}`}>
                    Mostrar {CONCEPT_LABEL.problema.toLowerCase()}
                  </Link>
                </Button>
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onCreateEvolutionFromIssue(issue)}
                  >
                    Criar evolução
                  </Button>
                ) : null}
                {canEdit &&
                (issue.status === "OPEN" || issue.status === "IN_PROGRESS") ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onResolveIssue(issue)}
                  >
                    Resolver
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onEditIssue(issue)}
                  >
                    Editar
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </SignalCategory>
    </section>
  );
}

function SignalCategory({
  icon: Icon,
  title,
  count,
  empty,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  empty: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <Icon className="h-3.5 w-3.5" />
          {title}
          <span className="tabular-nums text-slate-400">· {count}</span>
        </h3>
        {action}
      </div>
      {count === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">{empty}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}
