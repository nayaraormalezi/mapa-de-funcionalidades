import Link from "next/link";
import {
  PageHeader,
  ProgressBar,
  SectionTitle,
  StatCard,
  SurfaceCard,
} from "@/components/ui/prototype";
import { Button } from "@/components/ui/button";
import {
  experienceLabel,
  featureStatusLabel,
  priorityLabel,
} from "@/lib/labels";
import { formatPercent } from "@/lib/utils";
import {
  getCoverageByAudience,
  getCoverageByChannel,
  getCoverageByMoment,
  getStatusDistribution,
} from "@/services/dashboard";
import {
  getExperienceHealth,
  getGapIntelligence,
  getIntelligenceInsights,
  getMigrationIntelligence,
} from "@/services/intelligence";
import { buildFeatureMapRows } from "@/services/channels";
import type { FeatureStatus } from "@/types";
import { RelatoriosTabs } from "./relatorios-tabs";

export default async function RelatoriosPage() {
  const [
    insights,
    byChannel,
    byAudience,
    byMoment,
    statusDist,
    gapIntel,
    migration,
    experience,
    rows,
  ] = await Promise.all([
    getIntelligenceInsights(),
    getCoverageByChannel(),
    getCoverageByAudience(),
    getCoverageByMoment(),
    getStatusDistribution(),
    getGapIntelligence(),
    getMigrationIntelligence(),
    getExperienceHealth(),
    buildFeatureMapRows(),
  ]);

  const featureTotal = new Set(rows.map((r) => r.featureId)).size;
  const available = new Set(
    rows.filter((r) => r.phase === "AVAILABLE").map((r) => r.featureId),
  ).size;
  const plannedOrDev = new Set(
    rows
      .filter((r) =>
        ["BACKLOG", "UX_UI", "DEVELOPMENT", "HOMOLOGATION", "PAUSED"].includes(
          r.phase,
        ),
      )
      .map((r) => r.featureId),
  ).size;
  const statusTotal = statusDist.reduce((a, s) => a + s.count, 0) || 1;

  const gapsByJourney = gapIntel.transitionGaps.length;

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="Relatórios › Visão geral"
        title="Relatórios"
        description="Acompanhe a evolução da cobertura de funcionalidades, a experiência dos usuários e os principais insights."
      />

      <RelatoriosTabs
        periodOptions={[
          { value: "90d", label: "Jul/2026 – Set/2026" },
          { value: "30d", label: "Últimos 30 dias" },
          { value: "ytd", label: "Ano corrente" },
        ]}
      >
        {{
          overview: (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Funcionalidades mapeadas"
                  value={featureTotal}
                  tone="info"
                  trend="▲ inventário atual"
                />
                <StatCard
                  label="Funcionalidades disponíveis"
                  value={available}
                  tone="success"
                  hint={`${formatPercent(featureTotal ? (available / featureTotal) * 100 : 0)} de cobertura`}
                />
                <StatCard
                  label="Em desenvolvimento ou planejadas"
                  value={plannedOrDev}
                  tone="warning"
                  hint={`${formatPercent(featureTotal ? (plannedOrDev / featureTotal) * 100 : 0)} de cobertura`}
                />
                <StatCard
                  label="Gaps identificados"
                  value={gapIntel.totalOpen}
                  tone="danger"
                  hint={`${gapIntel.criticalGaps.length} críticos`}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <SurfaceCard className="p-4">
                  <SectionTitle>Cobertura por público</SectionTitle>
                  <div className="space-y-3">
                    {byAudience.map((item) => (
                      <div key={item.id}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{item.name}</span>
                          <span className="font-semibold tabular-nums">
                            {formatPercent(item.percentage)}
                          </span>
                        </div>
                        <ProgressBar value={item.percentage} />
                      </div>
                    ))}
                  </div>
                </SurfaceCard>
                <SurfaceCard className="p-4">
                  <SectionTitle>Cobertura por momento</SectionTitle>
                  <div className="space-y-3">
                    {byMoment.map((item) => (
                      <div key={item.id}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{item.name}</span>
                          <span className="font-semibold tabular-nums">
                            {formatPercent(item.percentage)}
                          </span>
                        </div>
                        <ProgressBar value={item.percentage} />
                      </div>
                    ))}
                  </div>
                </SurfaceCard>
                <SurfaceCard className="p-4">
                  <SectionTitle>Status das funcionalidades</SectionTitle>
                  <ul className="space-y-2">
                    {statusDist.map((item) => (
                      <li
                        key={item.status}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          {featureStatusLabel[item.status as FeatureStatus] ??
                            item.status}
                        </span>
                        <span className="text-[var(--muted-foreground)]">
                          {item.count} (
                          {formatPercent((item.count / statusTotal) * 100)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </SurfaceCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <SurfaceCard className="p-4">
                  <SectionTitle>Canais com maior potencial de melhoria</SectionTitle>
                  <ul className="space-y-2">
                    {[...byChannel]
                      .sort((a, b) => a.percentage - b.percentage)
                      .slice(0, 5)
                      .map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-[var(--muted-foreground)]">
                            {formatPercent(item.percentage)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </SurfaceCard>
                <SurfaceCard className="p-4">
                  <SectionTitle
                    action={
                      <Link
                        href="/inteligencia"
                        className="text-xs font-medium text-[var(--brand)] hover:underline"
                      >
                        Ver todos os insights →
                      </Link>
                    }
                  >
                    Últimos insights
                  </SectionTitle>
                  <ul className="space-y-2">
                    {insights.slice(0, 3).map((insight) => (
                      <li
                        key={insight.id}
                        className="rounded-lg border border-[var(--border)] px-3 py-2.5"
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {insight.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                          {insight.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                </SurfaceCard>
              </div>

              <SurfaceCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">Relatórios salvos</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Panorama executivo · Gaps críticos · Evolução SuperApp
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/configuracoes?tab=cadastros">Gerar relatório personalizado</Link>
                </Button>
              </SurfaceCard>
            </div>
          ),
          coverage: (
            <SurfaceCard className="p-4">
              <SectionTitle>Cobertura por canal</SectionTitle>
              <div className="space-y-3">
                {byChannel.map((item) => (
                  <div key={item.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {item.available}/{item.total} ·{" "}
                        {formatPercent(item.percentage)}
                      </span>
                    </div>
                    <ProgressBar value={item.percentage} />
                  </div>
                ))}
              </div>
            </SurfaceCard>
          ),
          gaps: (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard className="p-4">
                <SectionTitle>Gaps por tipo</SectionTitle>
                <div className="grid grid-cols-2 gap-2">
                  {gapIntel.byType.map((item) => (
                    <div
                      key={item.type}
                      className="rounded-lg border border-[var(--border)] px-3 py-2"
                    >
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {item.label}
                      </p>
                      <p className="text-xl font-semibold">{item.count}</p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
              <SurfaceCard className="p-4">
                <SectionTitle>Gaps por impacto</SectionTitle>
                <ul className="space-y-2">
                  {gapIntel.byImpact.map((item) => (
                    <li
                      key={item.impact}
                      className="flex justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                    >
                      <span>
                        {priorityLabel[
                          item.impact as keyof typeof priorityLabel
                        ] ?? item.impact}
                      </span>
                      <span className="font-semibold">{item.count}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                  {gapIntel.withoutActionPlan} sem plano de ação ·{" "}
                  {gapsByJourney} de transição
                </p>
              </SurfaceCard>
            </div>
          ),
          experience: (
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceCard className="p-4">
                <SectionTitle>Saúde da experiência</SectionTitle>
                <div className="space-y-3">
                  {experience.map((item) => (
                    <div key={item.level}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{experienceLabel[item.level]}</span>
                        <span className="text-[var(--muted-foreground)]">
                          {item.count} · {formatPercent(item.percentage)}
                        </span>
                      </div>
                      <ProgressBar value={item.percentage} />
                    </div>
                  ))}
                </div>
              </SurfaceCard>
              <SurfaceCard className="p-4">
                <SectionTitle>Migração Atual → Futuro</SectionTitle>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <MiniStat label="A migrar" value={migration.totalMigrate} />
                  <MiniStat label="A criar" value={migration.totalCreate} />
                  <MiniStat
                    label="Indefinidas"
                    value={migration.totalUndefined}
                  />
                  <MiniStat
                    label="Descontinuar"
                    value={migration.totalDiscontinue}
                  />
                </div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Prontidão</span>
                  <span>{formatPercent(migration.readinessPercent)}</span>
                </div>
                <ProgressBar value={migration.readinessPercent} />
                <Link
                  href="/transformacao"
                  className="mt-4 inline-block text-sm font-medium text-[var(--brand)] hover:underline"
                >
                  Abrir transformação
                </Link>
              </SurfaceCard>
            </div>
          ),
        }}
      </RelatoriosTabs>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
