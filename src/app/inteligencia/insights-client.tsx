"use client";

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
import {
  evidenceTypeLabel,
  experienceLabel,
  gapTypeLabel,
} from "@/lib/labels";
import { cn, formatDate, formatPercent } from "@/lib/utils";
import type {
  EvidenceType,
  ExperienceLevel,
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
  Lightbulb,
  Sparkles,
  Target,
} from "lucide-react";

type ExperienceItem = {
  level: ExperienceLevel;
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
  experience: ExperienceLevel;
  audienceName: string;
  channelName: string;
};

const SEVERITY_META: Record<
  InsightSeverity,
  { label: string; className: string; bar: string }
> = {
  critical: {
    label: "Crítico",
    className: "bg-rose-50 text-rose-800 ring-rose-200",
    bar: "bg-rose-500",
  },
  warning: {
    label: "Atenção",
    className: "bg-amber-50 text-amber-900 ring-amber-200",
    bar: "bg-amber-500",
  },
  opportunity: {
    label: "Oportunidade",
    className: "bg-[var(--brand-soft)] text-[var(--brand)] ring-[var(--brand-ring)]",
    bar: "bg-[var(--brand)]",
  },
  info: {
    label: "Info",
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
  const [severity, setSeverity] = useState<"" | InsightSeverity>("");
  const [tab, setTab] = useState<Tab>("insights");

  const filteredInsights = useMemo(() => {
    if (!severity) return insights;
    return insights.filter((item) => item.severity === severity);
  }, [insights, severity]);

  const counts = useMemo(() => {
    const base = { critical: 0, warning: 0, opportunity: 0, info: 0 };
    for (const item of insights) base[item.severity] += 1;
    return base;
  }, [insights]);

  const evaluatedExperience = experience.filter(
    (e) => e.level !== "NOT_EVALUATED",
  );
  const frictionCount =
    (experience.find((e) => e.level === "CRITICAL")?.count ?? 0) +
    (experience.find((e) => e.level === "NEEDS_IMPROVEMENT")?.count ?? 0);

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="Análises › Insights"
        title="Insights"
        description="Sinais de experiência, gaps, evidências e oportunidades para orientar decisões de produto e UX."
        callout={{
          title: "Do sinal à ação",
          body: "Priorize alertas críticos, valide com evidências e leve oportunidades para o roadmap.",
          icon: Lightbulb,
        }}
      />

      <SurfaceCard className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Severidade"
            value={severity}
            onChange={(v) => setSeverity(v as "" | InsightSeverity)}
            options={[
              { value: "", label: "Todas" },
              { value: "critical", label: "Crítico" },
              { value: "warning", label: "Atenção" },
              { value: "opportunity", label: "Oportunidade" },
              { value: "info", label: "Info" },
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
          label="Gaps abertos"
          value={gapIntel.totalOpen}
          hint={`${gapIntel.criticalCount} críticos`}
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
                const meta = SEVERITY_META[insight.severity];
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
                      {insight.href ? (
                        <Link
                          href={insight.href}
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
              <SectionTitle>Gaps críticos</SectionTitle>
              {gapIntel.criticalGaps.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nenhum gap crítico aberto no momento.
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
                href="/gaps"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
              >
                Ver todos os gaps
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
                href="/comparacao"
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
                      {experienceLabel[item.level]}
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
                        : item.level === "NEEDS_IMPROVEMENT"
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
                        {experienceLabel[feature.experience]}
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
              href="/transformacao"
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
                <Link
                  href="/cadastros/evidencias"
                  className="text-xs font-medium text-[var(--brand)] hover:underline"
                >
                  Gerenciar evidências
                </Link>
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
            <SectionTitle>Gaps por tipo</SectionTitle>
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
                {gapIntel.withoutActionPlan} gap(s) sem plano de ação
                cadastrado.
              </p>
            ) : null}
          </SurfaceCard>
        </div>
      ) : null}
    </div>
  );
}
