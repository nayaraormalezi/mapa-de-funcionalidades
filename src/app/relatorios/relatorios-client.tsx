"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FilterSelect,
  PageHeader,
  ProgressBar,
  SectionTitle,
  StatCard,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { EmptyState } from "@/components/shared/empty-state";
import {
  CONCEPT_LABEL,
  featureStageLabel,
  featureStatusLabel,
} from "@/lib/labels";
import { HEALTH_BUCKET_LABEL } from "@/lib/health";
import {
  filterMapRows,
  formatCoverageLabel,
  formatPercentOrEmpty,
  getCoverageByDimension,
  getCoverageFeature,
  getCoverageOfNeeds,
  getCoverageOfNeedsByDimension,
  getDeadlineStatusDistribution,
  getEvaluationCoverage,
  getExperienceHealthByFeature,
  getMappedFeatures,
  getPhaseDistribution,
  type ReportScopeFilter,
  type RatioMetric,
} from "@/lib/report-metrics";
import {
  allPeriodRange,
  customPeriodRange,
  dateInRange,
  eventsInRange,
  formatRangeBR,
  periodHasReportResults,
  periodIncludesToday,
  validateComparison,
  type DateRange,
} from "@/lib/report-period";
import type { ReportPayload } from "@/services/relatorios";
import type { FeatureStatus } from "@/types";
import { CalendarDays, Download, Inbox } from "lucide-react";

const MAIN_TABS = [
  { id: "overview", label: "Visão geral" },
  { id: "coverage", label: "Cobertura" },
  { id: "experience", label: "Experiência" },
  { id: "melhorias", label: CONCEPT_LABEL.melhorias },
  { id: "evolution", label: "Evolução & entregas" },
] as const;

type MainTab = (typeof MAIN_TABS)[number]["id"];
type MelhoriasTab = "lacunas" | "problemas" | "oportunidades";
type CompareMode = "none" | "custom";

function RatioText({ metric }: { metric: RatioMetric }) {
  if (metric.percentage == null) {
    return <span className="text-[var(--muted-foreground)]">Sem dados</span>;
  }
  return (
    <span className="tabular-nums">
      {metric.numerator} / {metric.denominator} ·{" "}
      {formatPercentOrEmpty(metric.percentage)}
    </span>
  );
}

function StateBadge({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600 uppercase">
      {label}
    </span>
  );
}

function MetricUnavailable({ message }: { message: string }) {
  return (
    <SurfaceCard className="p-4">
      <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
    </SurfaceCard>
  );
}

function CoverageBars({
  title,
  items,
  unitHint,
}: {
  title: string;
  items: Array<{ id: string; name: string } & RatioMetric>;
  unitHint: string;
}) {
  return (
    <SurfaceCard className="p-4">
      <SectionTitle>{title}</SectionTitle>
      <p className="mb-3 text-[11px] text-[var(--muted-foreground)]">{unitHint}</p>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="mb-1 flex justify-between gap-2 text-sm">
              <span className="font-medium">{item.name}</span>
              <RatioText metric={item} />
            </div>
            {item.percentage == null ? (
              <div className="h-2 rounded-full bg-slate-100" />
            ) : (
              <ProgressBar value={item.percentage} />
            )}
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

function MelhoriasPanel({
  question,
  bucket,
  empty,
}: {
  question: string;
  bucket: ReportPayload["melhorias"]["lacunas"];
  empty: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted-foreground)]">{question}</p>
      <StatCard label="Total" value={bucket.total} tone="info" hint="Estado atual" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { title: "Por impacto", rows: bucket.byImpact },
          { title: "Por público", rows: bucket.byAudience },
          { title: "Por produto", rows: bucket.byProduct },
          { title: "Por jornada", rows: bucket.byJourney },
          { title: "Por canal", rows: bucket.byChannel },
          { title: "Por status / origem", rows: bucket.byStatus },
        ].map((block) => (
          <SurfaceCard key={block.title} className="p-4">
            <SectionTitle>{block.title}</SectionTitle>
            {block.rows.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">—</p>
            ) : (
              <ul className="space-y-2">
                {block.rows.map((row) => (
                  <li key={row.key} className="flex justify-between text-sm">
                    <span>{row.label}</span>
                    <span className="font-semibold tabular-nums">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>
        ))}
      </div>
      {bucket.items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={empty}
          description="Quando houver registros, eles aparecerão aqui."
        />
      ) : (
        <SurfaceCard className="p-4">
          <SectionTitle>Itens</SectionTitle>
          <ul className="space-y-2">
            {bucket.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="block rounded-lg border border-[var(--border)] px-3 py-2.5 hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]/40"
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {item.subtitle}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function RelatoriosClient({ data }: { data: ReportPayload }) {
  const [tab, setTab] = useState<MainTab>("overview");
  const [melhoriasTab, setMelhoriasTab] = useState<MelhoriasTab>("lacunas");
  const [period, setPeriod] = useState<DateRange>(() => allPeriodRange());
  const [compareMode, setCompareMode] = useState<CompareMode>("none");
  const [comparePeriod, setComparePeriod] = useState<DateRange>(() =>
    customPeriodRange("2026-04-01", "2026-06-30"),
  );
  const [filter, setFilter] = useState<ReportScopeFilter>({});

  const includesToday = periodIncludesToday(period);
  const hasResults = periodHasReportResults(period, data.temporalEvents);
  const periodEvents = useMemo(
    () => eventsInRange(data.temporalEvents, period),
    [data.temporalEvents, period],
  );

  const compareError =
    compareMode === "custom" ? validateComparison(period, comparePeriod) : null;

  const scopedRows = useMemo(
    () => filterMapRows(data.rows, filter),
    [data.rows, filter],
  );

  const scoped = useMemo(() => {
    const opts = data.options;
    return {
      mapped: getMappedFeatures(scopedRows),
      needs: getCoverageOfNeeds(data.needs, data.features, scopedRows, filter),
      functional: getCoverageFeature(scopedRows),
      evaluated: getEvaluationCoverage(scopedRows),
      health: getExperienceHealthByFeature(scopedRows),
      needsByAudience: getCoverageOfNeedsByDimension(
        data.needs,
        data.features,
        scopedRows,
        opts.audiences,
        "audience",
        filter,
      ),
      needsByProduct: getCoverageOfNeedsByDimension(
        data.needs,
        data.features,
        scopedRows,
        opts.products,
        "product",
        filter,
      ),
      needsByStage: getCoverageOfNeedsByDimension(
        data.needs,
        data.features,
        scopedRows,
        opts.stages,
        "stage",
        filter,
      ),
      byChannel: getCoverageByDimension(
        scopedRows,
        opts.channels,
        (r) => r.channelId,
      ),
      phases: getPhaseDistribution(scopedRows),
      deadlines: getDeadlineStatusDistribution(scopedRows),
    };
  }, [scopedRows, data.needs, data.features, data.options, filter]);

  const evolutionsInPeriod = useMemo(() => {
    return data.evolution.evolutions.items.filter(
      (e) =>
        dateInRange(e.completedDate, period) ||
        dateInRange(e.startDate, period) ||
        dateInRange(e.createdAt, period),
    );
  }, [data.evolution.evolutions.items, period]);

  function handleExport() {
    if (!hasResults) {
      alert("Não há dados suficientes para exportar este período.");
      return;
    }
    window.print();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: "Relatórios" }]}
        title="Relatórios"
        description="Visão consolidada da experiência, cobertura e evolução do ecossistema Consórcio."
      />

      <SurfaceCard className="flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <DateRangePicker
              label="Período"
              value={period}
              onChange={setPeriod}
            />
          </div>
          <FilterSelect
            label="Comparar com"
            value={compareMode}
            onChange={(v) => setCompareMode(v as CompareMode)}
            options={[
              { value: "none", label: "Não comparar" },
              { value: "custom", label: "Período personalizado" },
            ]}
            className="min-w-[200px]"
          />
          {compareMode === "custom" ? (
            <DateRangePicker
              label="Período de comparação"
              value={comparePeriod}
              onChange={setComparePeriod}
            />
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" />
          Exportar relatório
        </Button>
      </SurfaceCard>

      {compareError ? (
        <SurfaceCard className="border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {compareError}
        </SurfaceCard>
      ) : null}

      {!hasResults ? (
        <EmptyState
          icon={CalendarDays}
          title="Não encontramos resultados para este período"
          description="Não há dados suficientes para gerar este relatório no intervalo selecionado. Selecione outro período ou faça uma nova busca."
          action={
            <Button type="button" size="sm" onClick={() => setPeriod(allPeriodRange())}>
              Mostrar todo o período
            </Button>
          }
        />
      ) : (
        <>
          <UnderlineTabs
            value={tab}
            onChange={(id) => setTab(id as MainTab)}
            options={MAIN_TABS.map((t) => ({ id: t.id, label: t.label }))}
          />

          {tab === "overview" ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Como está a experiência e o que merece atenção?
              </p>
              {includesToday ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Funcionalidades mapeadas"
                    value={data.current.mappedFeatures}
                    tone="info"
                    hint={`${data.current.mappedFeatures} funcionalidades únicas`}
                    trend="Estado atual"
                  />
                  <StatCard
                    label="Cobertura de necessidades"
                    value={formatPercentOrEmpty(data.current.coverageNeeds.percentage)}
                    tone="success"
                    hint={
                      data.current.coverageNeeds.percentage == null
                        ? "Sem necessidades aplicáveis"
                        : `${formatCoverageLabel(data.current.coverageNeeds)} necessidades atendidas`
                    }
                    trend="Estado atual"
                  />
                  <StatCard
                    label="Funcionalidades avaliadas"
                    value={formatPercentOrEmpty(
                      data.current.evaluationCoverage.percentage,
                    )}
                    tone="warning"
                    hint={
                      data.current.evaluationCoverage.percentage == null
                        ? "Sem Features no escopo"
                        : `${formatCoverageLabel(data.current.evaluationCoverage)} com avaliação`
                    }
                    trend="Estado atual"
                  />
                  <StatCard
                    label="Melhorias em aberto"
                    value={data.current.openImprovements}
                    tone="danger"
                    hint={`${data.current.openBreakdown.lacunas + data.current.openBreakdown.problemas} lacunas/problemas · ${data.current.openBreakdown.oportunidades} oportunidades`}
                    trend="Estado atual"
                  />
                </div>
              ) : (
                <MetricUnavailable message="Não há dados históricos de inventário/cobertura para este período. As métricas de estado atual só aparecem quando o intervalo inclui a data de hoje." />
              )}

              <SurfaceCard className="p-4">
                <SectionTitle>Evolução da cobertura</SectionTitle>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Não há histórico suficiente para apresentar a evolução da
                  cobertura.
                </p>
              </SurfaceCard>

              <div className="grid gap-4 xl:grid-cols-2">
                <SurfaceCard className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <SectionTitle>Principais pontos de atenção</SectionTitle>
                    {includesToday ? <StateBadge label="Estado atual" /> : null}
                  </div>
                  {!includesToday ? (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Pontos de atenção do catálogo exigem estado atual (período
                      que inclui hoje).
                    </p>
                  ) : data.overview.attention.length === 0 ? (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Nenhum ponto de atenção no momento.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {data.overview.attention.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            className="block rounded-lg border border-[var(--border)] px-3 py-2.5 hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]/40"
                          >
                            <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                              {item.kind === "lacuna"
                                ? CONCEPT_LABEL.lacuna
                                : item.kind === "problema"
                                  ? CONCEPT_LABEL.problema
                                  : item.kind === "oportunidade"
                                    ? CONCEPT_LABEL.opportunity
                                    : "Insight"}
                            </p>
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                              {item.subtitle}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </SurfaceCard>

                <SurfaceCard className="p-4">
                  <SectionTitle
                    action={
                      <Link
                        href="/inteligencia"
                        className="text-xs font-medium text-[var(--brand)] hover:underline"
                      >
                        Mostrar inteligência →
                      </Link>
                    }
                  >
                    Principais insights
                  </SectionTitle>
                  {data.overview.insights.length === 0 ? (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Nenhum insight identificado neste contexto.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {data.overview.insights.map((insight) => (
                        <li
                          key={insight.id}
                          className="rounded-lg border border-[var(--border)] px-3 py-2.5"
                        >
                          <p className="text-sm font-medium">{insight.title}</p>
                          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                            {insight.description}
                          </p>
                          <Link
                            href={insight.href}
                            className="mt-1 inline-block text-xs font-medium text-[var(--brand)] hover:underline"
                          >
                            Aprofundar →
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </SurfaceCard>
              </div>

              {periodEvents.length > 0 ? (
                <SurfaceCard className="p-4">
                  <SectionTitle>Eventos no período</SectionTitle>
                  <p className="mb-2 text-xs text-[var(--muted-foreground)]">
                    {periodEvents.length} evento(s) datado(s) em{" "}
                    {formatRangeBR(period)}
                  </p>
                </SurfaceCard>
              ) : null}
            </div>
          ) : null}

          {tab === "coverage" ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Em quais contextos estamos atendendo as necessidades?
              </p>
              {!includesToday ? (
                <MetricUnavailable message="Não há dados históricos de cobertura para este período." />
              ) : (
                <>
                  <SurfaceCard className="p-4">
                    <div className="flex flex-wrap items-end gap-3">
                      {(
                        [
                          ["audienceId", "Público", data.options.audiences],
                          ["productId", "Produto", data.options.products],
                          ["momentId", "Momento", data.options.moments],
                          ["journeyId", "Jornada", data.options.journeys],
                          ["journeyStageId", "Etapa", data.options.stages],
                          ["channelId", "Canal", data.options.channels],
                        ] as const
                      ).map(([key, label, opts]) => (
                        <FilterSelect
                          key={key}
                          label={label}
                          value={(filter[key] as string) ?? ""}
                          onChange={(v) =>
                            setFilter((f) => ({
                              ...f,
                              [key]: v || undefined,
                            }))
                          }
                          options={[
                            { value: "", label: "Todos" },
                            ...opts.map((o) => ({ value: o.id, label: o.name })),
                          ]}
                        />
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setFilter({})}
                      >
                        Limpar
                      </Button>
                    </div>
                  </SurfaceCard>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <StatCard
                      label="Cobertura de necessidades"
                      value={formatPercentOrEmpty(scoped.needs.percentage)}
                      hint={
                        scoped.needs.percentage == null
                          ? "Sem necessidades aplicáveis"
                          : `${formatCoverageLabel(scoped.needs)} necessidades`
                      }
                      tone="success"
                      trend="Estado atual · Feature via Need"
                    />
                    <StatCard
                      label="Cobertura funcional"
                      value={formatPercentOrEmpty(scoped.functional.percentage)}
                      hint={
                        scoped.functional.percentage == null
                          ? "Sem Features no recorte"
                          : `${formatCoverageLabel(scoped.functional)} Features disponíveis`
                      }
                      tone="info"
                      trend="Estado atual · Feature"
                    />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <CoverageBars
                      title="Cobertura por público"
                      items={scoped.needsByAudience}
                      unitHint="Necessidades atendidas / aplicáveis"
                    />
                    <CoverageBars
                      title="Cobertura por produto"
                      items={scoped.needsByProduct}
                      unitHint="Somente Imobiliário, Veículos leves e Veículos pesados"
                    />
                  </div>

                  <CoverageBars
                    title="Cobertura por etapa da jornada"
                    items={scoped.needsByStage}
                    unitHint="10 etapas canônicas · necessidades"
                  />

                  <SurfaceCard className="p-4">
                    <SectionTitle>Cobertura por canal</SectionTitle>
                    <p className="mb-3 text-[11px] text-[var(--muted-foreground)]">
                      Unidade: FCC (implementação). Features distintas listadas à
                      parte.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="text-xs text-[var(--muted-foreground)] uppercase">
                          <tr>
                            <th className="px-2 py-2">Canal</th>
                            <th className="px-2 py-2">Aplicáveis</th>
                            <th className="px-2 py-2">Disponíveis</th>
                            <th className="px-2 py-2">Em evolução</th>
                            <th className="px-2 py-2">Sem cobertura</th>
                            <th className="px-2 py-2">Cobertura</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scoped.byChannel.map((ch) => (
                            <tr
                              key={ch.id}
                              className="border-t border-[var(--border)]"
                            >
                              <td className="px-2 py-2 font-medium">{ch.name}</td>
                              <td className="px-2 py-2 tabular-nums">
                                {ch.denominator}
                              </td>
                              <td className="px-2 py-2 tabular-nums">
                                {ch.available}
                              </td>
                              <td className="px-2 py-2 tabular-nums">
                                {ch.inEvolution}
                              </td>
                              <td className="px-2 py-2 tabular-nums">
                                {ch.withoutCoverage}
                              </td>
                              <td className="px-2 py-2 tabular-nums">
                                {formatPercentOrEmpty(ch.percentage)}
                                <span className="ml-1 text-xs text-slate-400">
                                  ({ch.featureCount} Features)
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SurfaceCard>
                </>
              )}
            </div>
          ) : null}

          {tab === "experience" ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Qual é a qualidade da experiência das funcionalidades avaliadas?
              </p>
              {!includesToday ? (
                <MetricUnavailable message="Não há dados históricos de experiência agregada para este período." />
              ) : (
                <>
                  <StatCard
                    label="Cobertura de avaliação"
                    value={formatPercentOrEmpty(scoped.evaluated.percentage)}
                    hint={
                      scoped.evaluated.percentage == null
                        ? "Sem Features"
                        : `${formatCoverageLabel(scoped.evaluated)} Features com ≥1 canal avaliado`
                    }
                    tone="info"
                    trend="Estado atual · Feature"
                  />

                  <div className="grid gap-4 xl:grid-cols-2">
                    <SurfaceCard className="p-4">
                      <SectionTitle>Saúde da experiência</SectionTitle>
                      <p className="mb-3 text-[11px] text-[var(--muted-foreground)]">
                        Somente Features avaliadas. Denominador = Features com
                        score.
                      </p>
                      {scoped.health.every((h) => h.percentage == null) ? (
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Sem dados para calcular.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {scoped.health.map((item) => (
                            <div key={item.level}>
                              <div className="mb-1 flex justify-between text-sm">
                                <span>{HEALTH_BUCKET_LABEL[item.level]}</span>
                                <span className="tabular-nums text-[var(--muted-foreground)]">
                                  {item.count} ·{" "}
                                  {formatPercentOrEmpty(item.percentage)}
                                </span>
                              </div>
                              {item.percentage == null ? (
                                <div className="h-2 rounded-full bg-slate-100" />
                              ) : (
                                <ProgressBar value={item.percentage} />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </SurfaceCard>

                    <SurfaceCard className="p-4">
                      <SectionTitle>Cobertura de avaliação</SectionTitle>
                      <div className="grid grid-cols-2 gap-2">
                        <MiniStat
                          label="Avaliadas"
                          value={scoped.evaluated.numerator}
                        />
                        <MiniStat
                          label="Não avaliadas"
                          value={Math.max(
                            0,
                            scoped.evaluated.denominator -
                              scoped.evaluated.numerator,
                          )}
                        />
                      </div>
                    </SurfaceCard>
                  </div>

                  <SurfaceCard className="p-4">
                    <SectionTitle>Tipos de avaliação</SectionTitle>
                    {data.current.freshness.byMethod.length === 0 ? (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Sem avaliações cadastradas.
                      </p>
                    ) : (
                      <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {data.current.freshness.byMethod.map((m) => (
                          <li
                            key={m.method}
                            className="rounded-lg border border-[var(--border)] px-3 py-2"
                          >
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {m.method}
                            </p>
                            <p className="text-lg font-semibold tabular-nums">
                              {m.count}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SurfaceCard>

                  <SurfaceCard className="p-4">
                    <SectionTitle>Atualização das avaliações</SectionTitle>
                    <p className="mb-3 text-[11px] text-[var(--muted-foreground)]">
                      Periodicidade por método (METHOD_VALIDITY_DAYS).
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <MiniStat
                        label="Atualizadas"
                        value={data.current.freshness.updated}
                      />
                      <MiniStat
                        label="Próximas do vencimento"
                        value={data.current.freshness.nearingExpiry}
                      />
                      <MiniStat
                        label="Vencidas"
                        value={data.current.freshness.expired}
                      />
                      <MiniStat
                        label="Nunca avaliadas"
                        value={data.current.freshness.neverEvaluatedFeatures}
                      />
                    </div>
                  </SurfaceCard>

                  <SurfaceCard className="p-4">
                    <SectionTitle>Evolução da experiência</SectionTitle>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Não há histórico suficiente para apresentar a evolução da
                      experiência neste período.
                    </p>
                  </SurfaceCard>
                </>
              )}
            </div>
          ) : null}

          {tab === "melhorias" ? (
            <div className="space-y-4">
              {!includesToday ? (
                <MetricUnavailable message="Lacunas, problemas e oportunidades refletem o estado atual do catálogo e só são exibidos quando o período inclui hoje." />
              ) : (
                <>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    O que precisa ser resolvido ou evoluído?
                  </p>
                  <UnderlineTabs
                    value={melhoriasTab}
                    onChange={(id) => setMelhoriasTab(id as MelhoriasTab)}
                    options={[
                      {
                        id: "lacunas",
                        label: CONCEPT_LABEL.lacunas,
                        count: data.melhorias.lacunas.total,
                      },
                      {
                        id: "problemas",
                        label: CONCEPT_LABEL.problemas,
                        count: data.melhorias.problemas.total,
                      },
                      {
                        id: "oportunidades",
                        label: CONCEPT_LABEL.opportunities,
                        count: data.melhorias.oportunidades.total,
                      },
                    ]}
                  />
                  {melhoriasTab === "lacunas" ? (
                    <MelhoriasPanel
                      question="O que está faltando?"
                      bucket={data.melhorias.lacunas}
                      empty={`Nenhuma ${CONCEPT_LABEL.lacuna.toLowerCase()} encontrada.`}
                    />
                  ) : null}
                  {melhoriasTab === "problemas" ? (
                    <MelhoriasPanel
                      question="O que existe, mas apresenta falha ou fricção?"
                      bucket={data.melhorias.problemas}
                      empty={`Nenhum ${CONCEPT_LABEL.problema.toLowerCase()} em aberto.`}
                    />
                  ) : null}
                  {melhoriasTab === "oportunidades" ? (
                    <MelhoriasPanel
                      question="Onde podemos melhorar?"
                      bucket={data.melhorias.oportunidades}
                      empty={`Nenhuma ${CONCEPT_LABEL.opportunity.toLowerCase()} identificada.`}
                    />
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {tab === "evolution" ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                O que mudou e o que estamos fazendo?
              </p>

              <SurfaceCard className="p-4">
                <SectionTitle>Mudanças no período</SectionTitle>
                {evolutionsInPeriod.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Nenhuma evolução com data no intervalo {formatRangeBR(period)}.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {evolutionsInPeriod.slice(0, 10).map((e) => (
                      <li
                        key={e.id}
                        className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{e.title}</span>
                        <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                          {e.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </SurfaceCard>

              {includesToday ? (
                <>
                  <SurfaceCard className="p-4">
                    <SectionTitle>Fase das implementações</SectionTitle>
                    <p className="mb-3 text-[11px] text-[var(--muted-foreground)]">
                      Unidade: FCC. Estado atual.
                    </p>
                    {scopedRows.length === 0 ? (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Sem dados para calcular.
                      </p>
                    ) : (
                      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {scoped.phases.map((row) => (
                          <li
                            key={row.phase}
                            className="rounded-lg border border-[var(--border)] px-3 py-2"
                          >
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {featureStageLabel[row.phase]}
                            </p>
                            <p className="text-xl font-semibold tabular-nums">
                              {row.count}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SurfaceCard>

                  <SurfaceCard className="p-4">
                    <SectionTitle>Prazos das implementações</SectionTitle>
                    <ul className="space-y-2">
                      {scoped.deadlines.map((row) => {
                        const total = scopedRows.length;
                        const pct =
                          total === 0 ? null : (row.count / total) * 100;
                        return (
                          <li
                            key={row.status}
                            className="flex justify-between text-sm"
                          >
                            <span>
                              {featureStatusLabel[row.status as FeatureStatus]}
                            </span>
                            <span className="tabular-nums text-[var(--muted-foreground)]">
                              {row.count}
                              {pct == null
                                ? ""
                                : ` · ${formatPercentOrEmpty(pct)}`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </SurfaceCard>

                  <SurfaceCard className="p-4">
                    <SectionTitle>Atual → Futuro</SectionTitle>
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <MiniStat
                        label="A migrar"
                        value={data.evolution.migration.migrate}
                      />
                      <MiniStat
                        label="A criar"
                        value={data.evolution.migration.create}
                      />
                      <MiniStat
                        label="Sem destino"
                        value={data.evolution.migration.undefined}
                      />
                      <MiniStat
                        label="Descontinuar"
                        value={data.evolution.migration.discontinue}
                      />
                    </div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Prontidão</span>
                      <span>
                        {formatPercentOrEmpty(
                          data.evolution.migration.readinessPercent,
                        )}
                      </span>
                    </div>
                    {data.evolution.migration.readinessPercent == null ? (
                      <div className="h-2 rounded-full bg-slate-100" />
                    ) : (
                      <ProgressBar
                        value={data.evolution.migration.readinessPercent}
                      />
                    )}
                    <Link
                      href="/inteligencia/transformacoes"
                      className="mt-3 inline-block text-sm font-medium text-[var(--brand)] hover:underline"
                    >
                      Abrir transformação
                    </Link>
                  </SurfaceCard>
                </>
              ) : (
                <MetricUnavailable message="Inventário de fases, entregas e transformação são estado atual — disponíveis quando o período inclui hoje." />
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
