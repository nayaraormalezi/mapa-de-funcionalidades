/**
 * Camada centralizada de métricas de Relatórios (Fase 15.4).
 *
 * REGRA TEMPORAL
 * --------------
 * Sem snapshots de cobertura/fase: métricas de inventário/cobertura/saúde
 * são ESTADO ATUAL e só devem ser exibidas quando o período inclui hoje
 * (rotuladas como "Estado atual"). Eventos datados (avaliações, evoluções,
 * datas de FCC) alimentam seções do período. Ausência de dados ≠ zero.
 *
 * COBERTURA DE NECESSIDADES (estratégica)
 * ---------------------------------------
 * numerador = necessidades aplicáveis com ≥1 Feature ligada que possui
 *             ≥1 FCC AVAILABLE no escopo
 * denominador = necessidades aplicáveis ao escopo
 *
 * COBERTURA FUNCIONAL
 * -------------------
 * Features com ≥1 FCC AVAILABLE / Features distintas no escopo
 *
 * COBERTURA FCC (por canal)
 * -------------------------
 * FCCs AVAILABLE / FCCs no canal
 *
 * denominador 0 → percentage null (“Sem dados”), nunca 0% fictício.
 */

import {
  DEVELOPMENT_STAGES,
  FEATURE_STAGE_ORDER,
} from "@/lib/labels";
import { aggregateFeatureHealth, type HealthBucket } from "@/lib/health";
import type {
  Feature,
  FeatureMapRow,
  FeatureStage,
  FeatureStatus,
  Priority,
  UserNeed,
} from "@/types";

export type MetricTemporal = "current_state" | "period_history";

export type MetricGrain = "feature" | "fcc" | "issue" | "opportunity" | "lacuna";

export type MetricDefinition = {
  id: string;
  label: string;
  definition: string;
  numerator: string;
  denominator: string;
  grain: MetricGrain;
  temporal: MetricTemporal;
};

export type RatioMetric = {
  numerator: number;
  denominator: number;
  /** null quando denominator === 0 (sem dados). */
  percentage: number | null;
};

export type CoverageSlice = {
  id: string;
  name: string;
} & RatioMetric & {
    /** Features distintas no escopo (auxiliar quando grain=fcc). */
    featureCount: number;
    available: number;
    inEvolution: number;
    withoutCoverage: number;
  };

export type PhaseSlice = {
  phase: FeatureStage;
  count: number;
};

export type StatusSlice = {
  status: FeatureStatus;
  count: number;
};

export type HealthSlice = {
  level: HealthBucket;
  count: number;
  /** % sobre o mesmo denominador (Features no escopo). null se sem dados. */
  percentage: number | null;
};

export const REPORT_METRIC_DEFS: Record<string, MetricDefinition> = {
  mappedFeatures: {
    id: "mappedFeatures",
    label: "Funcionalidades mapeadas",
    definition:
      "Features distintas com pelo menos uma implementação (FCC) no escopo.",
    numerator: "count(unique featureId)",
    denominator: "— (contagem absoluta)",
    grain: "feature",
    temporal: "current_state",
  },
  coverageFeature: {
    id: "coverageFeature",
    label: "Cobertura funcional",
    definition:
      "Share de Features no escopo que possuem ≥1 FCC com phase AVAILABLE.",
    numerator: "Features com ≥1 FCC AVAILABLE",
    denominator: "Features distintas no escopo",
    grain: "feature",
    temporal: "current_state",
  },
  coverageOfNeeds: {
    id: "coverageOfNeeds",
    label: "Cobertura de necessidades",
    definition:
      "Necessidades aplicáveis com ≥1 Feature ligada que possui ≥1 FCC AVAILABLE no escopo.",
    numerator: "Necessidades atendidas",
    denominator: "Necessidades aplicáveis",
    grain: "feature",
    temporal: "current_state",
  },
  coverageFcc: {
    id: "coverageFcc",
    label: "Cobertura (implementações)",
    definition:
      "Share de implementações (FCC) com phase AVAILABLE no escopo.",
    numerator: "FCCs AVAILABLE",
    denominator: "FCCs no escopo",
    grain: "fcc",
    temporal: "current_state",
  },
  experienceHealth: {
    id: "experienceHealth",
    label: "Saúde da experiência",
    definition:
      "Distribuição de Health entre Features AVALIADAS (média dos canais com score). Não inclui não avaliadas.",
    numerator: "Features avaliadas no bucket",
    denominator: "Features com ≥1 score",
    grain: "feature",
    temporal: "current_state",
  },
  evaluationCoverage: {
    id: "evaluationCoverage",
    label: "Cobertura de avaliação",
    definition: "Features com ≥1 canal com healthScore / Features no escopo.",
    numerator: "Features avaliadas",
    denominator: "Features distintas no escopo",
    grain: "feature",
    temporal: "current_state",
  },
  openImprovements: {
    id: "openImprovements",
    label: "Melhorias em aberto",
    definition:
      "Lacunas de cobertura + Problemas abertos (OPEN|IN_PROGRESS) + Oportunidades derivadas.",
    numerator: "lacunas + problemas abertos + oportunidades",
    denominator: "— (contagem absoluta)",
    grain: "issue",
    temporal: "current_state",
  },
};

export type ReportScopeFilter = {
  audienceId?: string;
  productId?: string;
  momentId?: string;
  journeyId?: string;
  journeyStageId?: string;
  channelId?: string;
  phase?: FeatureStage | "";
};

export function filterMapRows(
  rows: FeatureMapRow[],
  filter: ReportScopeFilter,
): FeatureMapRow[] {
  return rows.filter((r) => {
    if (filter.audienceId && r.audienceId !== filter.audienceId) return false;
    if (filter.productId && r.productId !== filter.productId) return false;
    if (filter.momentId && r.momentId !== filter.momentId) return false;
    if (filter.journeyId && r.journeyId !== filter.journeyId) return false;
    if (filter.journeyStageId && r.journeyStageId !== filter.journeyStageId)
      return false;
    if (filter.channelId && r.channelId !== filter.channelId) return false;
    if (filter.phase && r.phase !== filter.phase) return false;
    return true;
  });
}

export function uniqueFeatureIds(rows: FeatureMapRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.featureId)));
}

export function getMappedFeatures(rows: FeatureMapRow[]): number {
  return uniqueFeatureIds(rows).length;
}

/** Cobertura em grain Feature (definição canônica do relatório). */
export function getCoverageFeature(rows: FeatureMapRow[]): RatioMetric {
  const featureIds = uniqueFeatureIds(rows);
  const denominator = featureIds.length;
  if (denominator === 0) {
    return { numerator: 0, denominator: 0, percentage: null };
  }
  const covered = new Set(
    rows.filter((r) => r.phase === "AVAILABLE").map((r) => r.featureId),
  );
  const numerator = featureIds.filter((id) => covered.has(id)).length;
  return {
    numerator,
    denominator,
    percentage: (numerator / denominator) * 100,
  };
}

/** Cobertura em grain FCC (implementação). */
export function getCoverageFcc(rows: FeatureMapRow[]): RatioMetric {
  const denominator = rows.length;
  if (denominator === 0) {
    return { numerator: 0, denominator: 0, percentage: null };
  }
  const numerator = rows.filter((r) => r.phase === "AVAILABLE").length;
  return {
    numerator,
    denominator,
    percentage: (numerator / denominator) * 100,
  };
}

function coverageSliceFor(
  id: string,
  name: string,
  scoped: FeatureMapRow[],
): CoverageSlice {
  const fcc = getCoverageFcc(scoped);
  const inEvolution = scoped.filter((r) =>
    DEVELOPMENT_STAGES.includes(r.phase),
  ).length;
  // Sem cobertura plena = não AVAILABLE (inclui backlog, evolução, pausado…).
  const notAvailable = scoped.filter((r) => r.phase !== "AVAILABLE").length;
  return {
    id,
    name,
    numerator: fcc.numerator,
    denominator: fcc.denominator,
    percentage: fcc.percentage,
    featureCount: uniqueFeatureIds(scoped).length,
    available: fcc.numerator,
    inEvolution,
    withoutCoverage: notAvailable,
  };
}

export function getCoverageByDimension(
  rows: FeatureMapRow[],
  items: { id: string; name: string }[],
  pick: (row: FeatureMapRow) => string,
): CoverageSlice[] {
  return items.map((item) => {
    const scoped = rows.filter((r) => pick(r) === item.id);
    return coverageSliceFor(item.id, item.name, scoped);
  });
}

/** Cobertura Feature por dimensão (público/produto/etapa). */
export function getCoverageFeatureByDimension(
  rows: FeatureMapRow[],
  items: { id: string; name: string }[],
  pick: (row: FeatureMapRow) => string | null,
): Array<{ id: string; name: string } & RatioMetric & { featureCount: number }> {
  return items.map((item) => {
    const scoped = rows.filter((r) => pick(r) === item.id);
    const cov = getCoverageFeature(scoped);
    return {
      id: item.id,
      name: item.name,
      ...cov,
      featureCount: cov.denominator,
    };
  });
}

/**
 * Saúde entre Features AVALIADAS (GOOD/ATTENTION/CRITICAL).
 * "Não avaliada" NÃO entra como nível de saúde — use getEvaluationCoverage.
 */
export function getExperienceHealthByFeature(
  rows: FeatureMapRow[],
): HealthSlice[] {
  const byFeature = new Map<string, Array<number | null>>();
  for (const row of rows) {
    const list = byFeature.get(row.featureId) ?? [];
    list.push(row.healthScore);
    byFeature.set(row.featureId, list);
  }

  const counts = { GOOD: 0, ATTENTION: 0, CRITICAL: 0 };
  let evaluated = 0;

  for (const scores of byFeature.values()) {
    const agg = aggregateFeatureHealth(scores);
    if (agg.score == null || agg.signal === "UNKNOWN") continue;
    evaluated += 1;
    if (agg.signal === "GOOD") counts.GOOD += 1;
    else if (agg.signal === "ATTENTION") counts.ATTENTION += 1;
    else counts.CRITICAL += 1;
  }

  const buckets: Array<"GOOD" | "ATTENTION" | "CRITICAL"> = [
    "GOOD",
    "ATTENTION",
    "CRITICAL",
  ];
  return buckets.map((level) => ({
    level,
    count: counts[level],
    percentage: evaluated === 0 ? null : (counts[level] / evaluated) * 100,
  }));
}

/** Features avaliadas (pelo menos um canal com score) / Features no escopo. */
export function getEvaluationCoverage(rows: FeatureMapRow[]): RatioMetric {
  const byFeature = new Map<string, boolean>();
  for (const row of rows) {
    const prev = byFeature.get(row.featureId) ?? false;
    byFeature.set(row.featureId, prev || row.healthScore != null);
  }
  const denominator = byFeature.size;
  if (denominator === 0) {
    return { numerator: 0, denominator: 0, percentage: null };
  }
  let numerator = 0;
  for (const ok of byFeature.values()) if (ok) numerator += 1;
  return {
    numerator,
    denominator,
    percentage: (numerator / denominator) * 100,
  };
}

function needAppliesToScope(
  need: UserNeed,
  filter: ReportScopeFilter,
): boolean {
  if (!need.active) return false;
  if (
    filter.audienceId &&
    need.audienceIds.length > 0 &&
    !need.audienceIds.includes(filter.audienceId)
  ) {
    return false;
  }
  if (
    filter.productId &&
    need.productIds.length > 0 &&
    !need.productIds.includes(filter.productId)
  ) {
    return false;
  }
  if (filter.journeyId && need.journeyId !== filter.journeyId) return false;
  if (
    filter.journeyStageId &&
    need.journeyStageId !== filter.journeyStageId
  ) {
    return false;
  }
  return true;
}

function buildNeedFeatureIndex(features: Feature[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const f of features) {
    if (!f.active) continue;
    for (const needId of f.needIds ?? []) {
      const list = map.get(needId) ?? [];
      list.push(f.id);
      map.set(needId, list);
    }
  }
  return map;
}

/**
 * Cobertura de necessidades (métrica estratégica).
 * Necessidade atendida = ≥1 Feature ligada com ≥1 FCC AVAILABLE no escopo.
 */
export function getCoverageOfNeeds(
  needs: UserNeed[],
  features: Feature[],
  rows: FeatureMapRow[],
  filter: ReportScopeFilter = {},
): RatioMetric {
  const scopedNeeds = needs.filter((n) => needAppliesToScope(n, filter));
  const denominator = scopedNeeds.length;
  if (denominator === 0) {
    return { numerator: 0, denominator: 0, percentage: null };
  }

  const needFeatures = buildNeedFeatureIndex(features);
  const scopedRows = filterMapRows(rows, filter);
  const availableFeatureIds = new Set(
    scopedRows.filter((r) => r.phase === "AVAILABLE").map((r) => r.featureId),
  );

  let numerator = 0;
  for (const need of scopedNeeds) {
    const linked = needFeatures.get(need.id) ?? [];
    if (linked.some((fid) => availableFeatureIds.has(fid))) numerator += 1;
  }

  return {
    numerator,
    denominator,
    percentage: (numerator / denominator) * 100,
  };
}

export function getCoverageOfNeedsByDimension(
  needs: UserNeed[],
  features: Feature[],
  rows: FeatureMapRow[],
  items: { id: string; name: string }[],
  dimension: "audience" | "product" | "stage",
  baseFilter: ReportScopeFilter = {},
): Array<{ id: string; name: string } & RatioMetric> {
  return items.map((item) => {
    const filter: ReportScopeFilter = { ...baseFilter };
    if (dimension === "audience") filter.audienceId = item.id;
    if (dimension === "product") filter.productId = item.id;
    if (dimension === "stage") filter.journeyStageId = item.id;
    return {
      id: item.id,
      name: item.name,
      ...getCoverageOfNeeds(needs, features, rows, filter),
    };
  });
}

export function getPhaseDistribution(rows: FeatureMapRow[]): PhaseSlice[] {
  const counts = Object.fromEntries(
    FEATURE_STAGE_ORDER.map((p) => [p, 0]),
  ) as Record<FeatureStage, number>;
  for (const row of rows) {
    if (row.phase in counts) counts[row.phase] += 1;
  }
  return FEATURE_STAGE_ORDER.map((phase) => ({
    phase,
    count: counts[phase],
  }));
}

/** Distribuição de prazo (FeatureStatus) em grain FCC. */
export function getDeadlineStatusDistribution(
  rows: FeatureMapRow[],
): StatusSlice[] {
  const order: FeatureStatus[] = ["ON_TRACK", "DELAYED", "NO_DEADLINE"];
  const counts = new Map<FeatureStatus, number>();
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  return order.map((status) => ({
    status,
    count: counts.get(status) ?? 0,
  }));
}

export function formatCoverageLabel(metric: RatioMetric): string {
  if (metric.percentage == null) return "Sem dados";
  return `${metric.numerator} / ${metric.denominator}`;
}

export function formatPercentOrEmpty(
  percentage: number | null,
  digits = 0,
): string {
  if (percentage == null) return "Sem dados";
  return `${percentage.toFixed(digits)}%`;
}

/** Contagem aberta de melhorias (estado atual). */
export function getOpenImprovementsCount(input: {
  lacunas: number;
  problemasAbertos: number;
  oportunidades: number;
}): number {
  return input.lacunas + input.problemasAbertos + input.oportunidades;
}

export function countByKey<T>(
  items: T[],
  key: (item: T) => string,
): { key: string; count: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([k, count]) => ({ key: k, count }))
    .sort((a, b) => b.count - a.count);
}

export function countByPriority(
  items: { impact?: Priority; priority?: Priority; severity?: string }[],
  pick: (item: (typeof items)[number]) => string,
): { key: string; count: number }[] {
  return countByKey(items, pick);
}
