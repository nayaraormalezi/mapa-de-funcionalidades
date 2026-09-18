"use client";

/**
 * @deprecated Fase 15.5 — página Insights removida do hub.
 * A geração de insights permanece em `@/services/intelligence` (`getIntelligenceInsights`).
 * UI de exibição: `InsightCard` + Comparações / Transformações / Relatórios.
 * Este arquivo é mantido apenas como referência de layout legado; não é importado.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FilterSelect,
  PageHeader,
  ProgressBar,
  SectionTitle,
  StatCard,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { useAuth } from "@/components/auth/auth-provider";
import {
  evidenceTypeLabel,
  gapTypeLabel,
  insightSeverityLabel,
  normalizeInsightSeverity,
  CONCEPT_LABEL,
} from "@/lib/labels";
import {
  HEALTH_BUCKET_LABEL,
  type HealthBucket,
} from "@/lib/health";
import { cn, formatDate, formatPercent } from "@/lib/utils";
import type {
  EvidenceType,
  GapStatus,
  GapType,
  Priority,
} from "@/types";
import type { InsightSeverity, IntelligenceInsight } from "@/services/intelligence";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  FileText,
  Sparkles,
  Target,
} from "lucide-react";

type ExperienceItem = {
  level: HealthBucket;
  count: number;
  percentage: number;
};

type GapIntelLite = {
  totalOpen: number;
  criticalCount: number;
  withoutActionPlan: number;
  byType: { type: GapType; label: string; count: number }[];
  criticalGaps: {
    id: string;
    title: string;
    type: GapType;
    impact: Priority;
    priority: Priority;
    status: GapStatus;
  }[];
};

type MigrationLite = {
  readinessPercent: number;
  totalUndefined: number;
  totalMigrate: number;
  totalCreate: number;
  risks: {
    audienceName: string;
    momentName: string;
    undefinedCount: number;
    migrateCount: number;
  }[];
};

type ParityLite = {
  featureId: string;
  featureName: string;
  audienceName: string;
  momentName: string;
  issue: "inconsistent_status" | "missing_on_current" | "missing_on_future";
};

type EvidenceLite = {
  id: string;
  title: string;
  type: EvidenceType;
  description: string;
  date: string;
  responsible: string;
  featureId: string;
  featureName: string;
  link: string | null;
};

type ProblemFeature = {
  id: string;
  name: string;
  experience?: string;
  healthScore: number | null;
  healthSignal: "GOOD" | "ATTENTION" | "CRITICAL" | "UNKNOWN";
  audienceName: string;
  channelName: string;
};

const SEVERITY_META: Record<
  InsightSeverity,
  { label: string; className: string; bar: string }
> = {
  critical: {
    label: insightSeverityLabel.critical,
    className: "bg-rose-50 text-rose-800 ring-rose-200",
    bar: "bg-rose-500",
  },
  warning: {
    label: insightSeverityLabel.warning,
    className: "bg-amber-50 text-amber-900 ring-amber-200",
    bar: "bg-amber-500",
  },
  watch: {
    label: insightSeverityLabel.watch,
    className: "bg-[var(--brand-soft)] text-[var(--brand)] ring-[var(--brand-ring)]",
    bar: "bg-[var(--brand)]",
  },
  info: {
    label: insightSeverityLabel.info,
    className: "bg-slate-100 text-slate-700 ring-slate-200",
    bar: "bg-slate-400",
  },
};

const PARITY_LABEL: Record<ParityLite["issue"], string> = {
  inconsistent_status: "Status inconsistente entre canais",
  missing_on_current: "Ausente no canal atual",
  missing_on_future: "Ausente no canal futuro",
};

type Tab = "insights" | "experience" | "evidences";

export function InsightsClient({
  insights,
  experience,
  gapIntel,
  migration,
  parity,
  evidences,
  problemFeatures,
}: {
  insights: IntelligenceInsight[];
  experience: ExperienceItem[];
  gapIntel: GapIntelLite;
  migration: MigrationLite;
  parity: ParityLite[];
  evidences: EvidenceLite[];
  problemFeatures: ProblemFeature[];
}) {
  const { canAdmin } = useAuth();
  const [severity, setSeverity] = useState<"" | InsightSeverity>("");
  const [tab, setTab] = useState<Tab>("insights");

  const filteredInsights = useMemo(() => {
    if (!severity) return insights;
    return insights.filter(
      (item) => normalizeInsightSeverity(item.severity) === severity,
    );
  }, [insights, severity]);

  const counts = useMemo(() => {
    const base = { critical: 0, warning: 0, watch: 0, info: 0 };
    for (const item of insights) {
      base[normalizeInsightSeverity(item.severity)] += 1;
    }
    return base;
  }, [insights]);

  const evaluatedExperience = experience.filter(
    (e) => e.level !== "NOT_EVALUATED",
  );
  const frictionCount =
    (experience.find((e) => e.level === "CRITICAL")?.count ?? 0) +
    (experience.find((e) => e.level === "ATTENTION")?.count ?? 0);

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[
          { label: "Inteligência", href: "/inteligencia" },
          { label: "Insights" },
        ]}
        title="Insights"
        description={`Sinais de experiência, ${CONCEPT_LABEL.lacunas.toLowerCase()}, ${CONCEPT_LABEL.problemas.toLowerCase()} e ${CONCEPT_LABEL.opportunities.toLowerCase()}. Comparações e Transformações estão nas abas deste domínio.`}
      />

      <SurfaceCard className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Severidade"
            value={severity}
            onChange={(v) => setSeverity(v as "" | InsightSeverity)}
            options={[
              { value: "", label: "Todas" },
              { value: "critical", label: insightSeverityLabel.critical },
              { value: "warning", label: insightSeverityLabel.warning },
              { value: "watch", label: insightSeverityLabel.watch },
              { value: "info", label: insightSeverityLabel.info },
            ]}
            className="min-w-[160px]"
          />
        </div>
      </SurfaceCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Insights ativos"
          value={insights.length}
          hint={`${counts.critical} críticos · ${counts.warning} atenção`}
          icon={Sparkles}
          tone="info"
        />
        <StatCard
          label={`${CONCEPT_LABEL.issues} abertas`}
          value={gapIntel.totalOpen}
          hint={`${gapIntel.criticalCount} críticas · catálogo`}
          tone={gapIntel.criticalCount > 0 ? "warning" : "default"}
          icon={AlertTriangle}
        />
        <StatCard
          label="Fricção de experiência"
          value={frictionCount}
          hint="Crítica + precisa melhorar"
          tone={frictionCount > 0 ? "danger" : "success"}
          icon={Target}
        />
        <StatCard
          label="Prontidão da transição"
          value={formatPercent(migration.readinessPercent)}
          hint={`${migration.totalUndefined} sem destino futuro`}
          tone="accent"
          icon={Clock3}
        />
      </div>

      <UnderlineTabs
        value={tab}
        onChange={(id) => setTab(id as Tab)}
        options={[
          { id: "insights", label: "Insights", count: filteredInsights.length },
          { id: "experience", label: "Experiência", count: frictionCount },
          { id: "evidences", label: "Evidências", count: evidences.length },
        ]}
      />

      {tab === "insights" ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {filteredInsights.length === 0 ? (
              <SurfaceCard className="p-6 text-sm text-[var(--muted-foreground)]">
                Nenhum insight para o filtro selecionado.
              </SurfaceCard>
            ) : (
              filteredInsights.map((insight) => {
                const meta = SEVERITY_META[normalizeInsightSeverity(insight.severity)];
                return (
                  <SurfaceCard key={insight.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1",
                              meta.className,
                            )}
                          >
                            {meta.label}
                          </span>
                          {insight.metric ? (
                            <span className="text-xs font-semibold tabular-nums text-slate-500">
                              {insight.metric}
                            </span>
                          ) : null}
                        </div>
                        <h2 className="mt-2 text-sm font-semibold text-slate-900">
                          {insight.title}
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
                          {insight.description}
                        </p>
                      </div>
                      {insight.href || insight.id === "critical-gaps" ? (
                        <Link
                          href={
                            insight.id === "critical-gaps"
                              ? "/gaps?tab=issues"
                              : (insight.href as string)
                          }
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
                        >
                          Investigar
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </div>
                  </SurfaceCard>
                );
              })
            )}
          </div>

          <div className="space-y-4">
            <SurfaceCard className="p-4">
              <SectionTitle>{CONCEPT_LABEL.issues} críticas</SectionTitle>
              <p className="mb-2 text-[11px] text-[var(--muted-foreground)]">
                Catálogo cadastrado — distinto dos {CONCEPT_LABEL.coverageGaps.toLowerCase()} do hub.
              </p>
              {gapIntel.criticalGaps.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nenhuma {CONCEPT_LABEL.issue.toLowerCase()} crítica aberta no momento.
                </p>
              ) : (
                <ul className="space-y-2">
                  {gapIntel.criticalGaps.map((gap) => (
                    <li key={gap.id}>
                      <Link
                        href={`/gaps/${gap.id}`}
                        className="block rounded-lg border border-[var(--border)] px-3 py-2.5 transition-colors hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]/40"
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {gap.title}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <PriorityBadge priority={gap.priority} />
                          <span className="text-[11px] text-[var(--muted-foreground)]">
                            {gapTypeLabel[gap.type]}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/gaps?tab=issues"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
              >
                Mostrar {CONCEPT_LABEL.issues.toLowerCase()} no hub
                <ArrowRight className="h-3 w-3" />
              </Link>
            </SurfaceCard>

            <SurfaceCard className="p-4">
              <SectionTitle>Paridade entre canais</SectionTitle>
              {parity.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nenhuma inconsistência relevante encontrada.
                </p>
              ) : (
                <ul className="space-y-2">
                  {parity.map((item) => (
                    <li
                      key={`${item.featureId}-${item.issue}-${item.audienceName}`}
                      className="rounded-lg border border-[var(--border)] px-3 py-2"
                    >
                      <p className="text-sm font-medium text-slate-900">
                        {item.featureName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                        {item.audienceName} · {item.momentName}
                      </p>
                      <p className="mt-1 text-xs text-amber-800">
                        {PARITY_LABEL[item.issue]}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/inteligencia/comparacoes"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
              >
                Abrir comparação
                <ArrowRight className="h-3 w-3" />
              </Link>
            </SurfaceCard>
          </div>
        </div>
      ) : null}

      {tab === "experience" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SurfaceCard className="p-4">
            <SectionTitle>Saúde da experiência</SectionTitle>
            <div className="space-y-3">
              {evaluatedExperience.map((item) => (
                <div key={item.level}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">
                      {HEALTH_BUCKET_LABEL[item.level]}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {item.count} · {formatPercent(item.percentage)}
                    </span>
                  </div>
                  <ProgressBar
                    value={item.percentage}
                    barClassName={
                      item.level === "CRITICAL"
                        ? "bg-rose-500"
                        : item.level === "ATTENTION"
                          ? "bg-amber-500"
                          : item.level === "GOOD"
                            ? "bg-emerald-500"
                            : "bg-[var(--brand)]"
                    }
                  />
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-4">
            <SectionTitle>Funcionalidades com fricção</SectionTitle>
            {problemFeatures.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Nenhuma funcionalidade com experiência crítica ou em melhoria.
              </p>
            ) : (
              <ul className="space-y-2">
                {problemFeatures.map((feature) => (
                  <li key={`${feature.id}-${feature.channelName}`}>
                    <Link
                      href={`/funcionalidades/${feature.id}`}
                      className="block rounded-lg border border-[var(--border)] px-3 py-2.5 transition-colors hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]/40"
                    >
                      <p className="text-sm font-medium text-slate-900">
                        {feature.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                        {feature.audienceName} · {feature.channelName} ·{" "}
                        {feature.healthScore != null
                          ? `Saúde ${feature.healthScore}`
                          : "Não avaliada"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>

          <SurfaceCard className="p-4 xl:col-span-2">
            <SectionTitle>Riscos de transição Atual → Futuro</SectionTitle>
            {migration.risks.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Nenhum risco de transição destacado.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {migration.risks.map((risk) => (
                  <div
                    key={`${risk.audienceName}-${risk.momentName}`}
                    className="rounded-lg border border-[var(--border)] px-3 py-2.5"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {risk.audienceName} · {risk.momentName}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {risk.undefinedCount} sem destino · {risk.migrateCount}{" "}
                      para migrar
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/inteligencia/transformacoes"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
            >
              Abrir transformação de canais
              <ArrowRight className="h-3 w-3" />
            </Link>
          </SurfaceCard>
        </div>
      ) : null}

      {tab === "evidences" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SurfaceCard className="p-4 xl:col-span-2">
            <SectionTitle
              action={
                canAdmin ? (
                  <Link
                    href="/configuracoes?tab=cadastros"
                    className="text-xs font-medium text-[var(--brand)] hover:underline"
                  >
                    Gerenciar evidências
                  </Link>
                ) : undefined
              }
            >
              Evidências recentes
            </SectionTitle>
            {evidences.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Nenhuma evidência cadastrada ainda.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {evidences.map((evidence) => (
                  <div
                    key={evidence.id}
                    className="rounded-xl border border-[var(--border)] bg-slate-50/60 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-700 uppercase ring-1 ring-slate-200">
                        {evidenceTypeLabel[evidence.type]}
                      </span>
                      <span className="text-[11px] text-[var(--muted-foreground)]">
                        {formatDate(evidence.date)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {evidence.title}
                    </p>
                    {evidence.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--muted-foreground)]">
                        {evidence.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <Link
                        href={`/funcionalidades/${evidence.featureId}`}
                        className="inline-flex items-center gap-1 font-medium text-[var(--brand)] hover:underline"
                      >
                        <FileText className="h-3 w-3" />
                        {evidence.featureName}
                      </Link>
                      {evidence.responsible ? (
                        <span className="text-[var(--muted-foreground)]">
                          · {evidence.responsible}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="p-4 xl:col-span-2">
            <SectionTitle>
              {CONCEPT_LABEL.problemas} por tipo
            </SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {gapIntel.byType.map((item) => (
                <div
                  key={item.type}
                  className="rounded-lg border border-[var(--border)] px-3 py-2"
                >
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {item.label}
                  </p>
                  <p className="text-xl font-semibold tabular-nums">
                    {item.count}
                  </p>
                </div>
              ))}
            </div>
            {gapIntel.withoutActionPlan > 0 ? (
              <p className="mt-3 text-xs text-amber-800">
                {gapIntel.withoutActionPlan}{" "}
                {gapIntel.withoutActionPlan === 1
                  ? CONCEPT_LABEL.problema.toLowerCase()
                  : CONCEPT_LABEL.problemas.toLowerCase()}{" "}
                sem plano de ação cadastrado.
              </p>
            ) : null}
          </SurfaceCard>
        </div>
      ) : null}
    </div>
  );
}
