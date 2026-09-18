import {
  CONCEPT_LABEL,
  DEVELOPMENT_STAGES,
  PLANNED_STAGES,
  featureStatusLabel,
  gapTypeLabel,
  normalizeInsightSeverity,
  type InsightSeverityCode,
} from "@/lib/labels";
import type { HealthBucket } from "@/lib/health";
import {
  buildFeatureMapRows,
  getAudiences,
  getMoments,
} from "@/services/channels";
import { getDatabase } from "@/services/db";
import { getOpenIssues } from "@/services/gaps";
import { getTransformationSummaries } from "@/services/transformation";
import type {
  FeatureMapRow,
  FeatureStatus,
  GapType,
  Issue,
  TransformationSummary,
} from "@/types";

/** Severidade de Insight — `watch` (legado: `opportunity`). */
export type InsightSeverity = InsightSeverityCode;

/** Origem do insight (quando conhecida). */
export type InsightOrigin =
  | "COVERAGE"
  | "EXPERIENCE"
  | "COMPARISON"
  | "TRANSFORMATION"
  | "ROADMAP"
  | "MELHORIAS"
  | "EVALUATION";

/**
 * Insight = resultado derivado da inteligência.
 * NÃO é entidade de cadastro; NÃO é sinônimo de Problema/Oportunidade.
 * Conversão para Melhoria deve ser ação explícita do usuário.
 */
export interface IntelligenceInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  href?: string;
  metric?: string;
  origin?: InsightOrigin;
  actionLabel?: string;
  context?: string;
}

/** Filtra insights por origem (camada transversal). */
export function filterInsightsByOrigin(
  insights: IntelligenceInsight[],
  origin: InsightOrigin,
): IntelligenceInsight[] {
  return insights.filter((i) => i.origin === origin);
}

/** Garante compatibilidade se algum consumidor ainda enviar o valor legado. */
export function coerceInsightSeverity(
  value: string | null | undefined,
): InsightSeverity {
  return normalizeInsightSeverity(value);
}

export interface CoverageCell {
  audienceId: string;
  audienceName: string;
  momentId: string;
  momentName: string;
  total: number;
  available: number;
  planned: number;
  inDevelopment: number;
  problems: number;
  notAvailable: number;
  coveragePercent: number;
}

/** Distribuição de Health canônico (Evaluation → Intelligence). */
export interface ExperienceHealth {
  level: HealthBucket;
  count: number;
  percentage: number;
}

/** Inteligência sobre Issues abertas (catálogo persistido — ≠ Coverage Gap). */
export interface GapIntelligence {
  totalOpen: number;
  byType: { type: GapType; label: string; count: number }[];
  byImpact: { impact: string; count: number }[];
  transitionGaps: Issue[];
  criticalGaps: Issue[];
  withoutActionPlan: number;
}

/** Alias canônico. */
export type IssueIntelligence = GapIntelligence;

export interface MigrationIntelligence {
  summaries: TransformationSummary[];
  totalMigrate: number;
  totalCreate: number;
  totalUndefined: number;
  totalDiscontinue: number;
  readinessPercent: number;
  risks: {
    audienceName: string;
    momentName: string;
    undefinedCount: number;
    migrateCount: number;
  }[];
}

export interface ParityFinding {
  featureId: string;
  featureName: string;
  audienceName: string;
  momentName: string;
  statuses: { channelName: string; status: FeatureStatus; temporalStatus: string }[];
  issue: "inconsistent_status" | "missing_on_current" | "missing_on_future";
}

function uniqueFeatureIds(rows: FeatureMapRow[]): Set<string> {
  return new Set(rows.map((r) => r.featureId));
}

export async function getCoverageMatrix(): Promise<CoverageCell[]> {
  const [rows, audiences, moments] = await Promise.all([
    buildFeatureMapRows(),
    getAudiences(),
    getMoments(),
  ]);

  const cells: CoverageCell[] = [];

  for (const audience of audiences) {
    for (const moment of moments) {
      const scoped = rows.filter(
        (r) => r.audienceId === audience.id && r.momentId === moment.id,
      );
      const total = scoped.length;
      const available = scoped.filter((r) => r.phase === "AVAILABLE").length;
      const planned = scoped.filter((r) =>
        PLANNED_STAGES.includes(r.phase),
      ).length;
      const inDevelopment = scoped.filter((r) =>
        DEVELOPMENT_STAGES.includes(r.phase),
      ).length;
      const problems = scoped.filter(
        (r) =>
          r.healthScore != null &&
          (r.healthSignal === "ATTENTION" || r.healthSignal === "CRITICAL"),
      ).length;
      const notAvailable = scoped.filter((r) => r.phase === "REMOVED").length;

      cells.push({
        audienceId: audience.id,
        audienceName: audience.name,
        momentId: moment.id,
        momentName: moment.name,
        total,
        available,
        planned,
        inDevelopment,
        problems,
        notAvailable,
        coveragePercent: total === 0 ? 0 : (available / total) * 100,
      });
    }
  }

  return cells;
}

/**
 * Distribuição de Health no mapa (nome legado `getExperienceHealth`).
 * @deprecated Fase 14 — preferir nome alinhado a Health quando houver rename
 * seguro dos consumidores (insights/relatórios). Fonte: Evaluation → healthSignal.
 */
export async function getExperienceHealth(): Promise<ExperienceHealth[]> {
  /**
   * Fase 11: distribuição a partir de Health canônico (Evaluations),
   * não mais do campo legado ExperienceLevel.
   * NOT_EVALUATED = sem score — nunca conta como CRITICAL/0.
   */
  const rows = await buildFeatureMapRows();
  const buckets: Array<ExperienceHealth["level"]> = [
    "GOOD",
    "ATTENTION",
    "CRITICAL",
    "NOT_EVALUATED",
  ];

  const classified = rows.map((r) => {
    if (r.healthScore == null || r.healthSignal === "UNKNOWN") {
      return "NOT_EVALUATED" as const;
    }
    if (r.healthSignal === "GOOD") return "GOOD" as const;
    if (r.healthSignal === "ATTENTION") return "ATTENTION" as const;
    return "CRITICAL" as const;
  });

  const evaluated = classified.filter((l) => l !== "NOT_EVALUATED");
  const totalEvaluated = evaluated.length || 1;

  return buckets.map((level) => {
    const count = classified.filter((l) => l === level).length;
    return {
      level,
      count,
      percentage:
        level === "NOT_EVALUATED"
          ? (count / Math.max(rows.length, 1)) * 100
          : (count / totalEvaluated) * 100,
    };
  });
}

export async function getGapIntelligence(): Promise<GapIntelligence> {
  const gaps = await getOpenIssues();
  const types = Object.keys(gapTypeLabel) as GapType[];

  const byType = types
    .map((type) => ({
      type,
      label: gapTypeLabel[type],
      count: gaps.filter((g) => g.type === type).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const impacts = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const byImpact = impacts
    .map((impact) => ({
      impact,
      count: gaps.filter((g) => g.impact === impact).length,
    }))
    .filter((item) => item.count > 0);

  return {
    totalOpen: gaps.length,
    byType,
    byImpact,
    transitionGaps: gaps.filter((g) => g.type === "TRANSITION"),
    criticalGaps: gaps.filter(
      (g) => g.impact === "CRITICAL" || g.priority === "CRITICAL",
    ),
    withoutActionPlan: gaps.filter((g) => !g.actionPlan.trim()).length,
  };
}

export async function getMigrationIntelligence(): Promise<MigrationIntelligence> {
  const summaries = await getTransformationSummaries();
  const totalMigrate = summaries.reduce((acc, s) => acc + s.migrate.length, 0);
  const totalCreate = summaries.reduce((acc, s) => acc + s.create.length, 0);
  const totalUndefined = summaries.reduce(
    (acc, s) => acc + s.undefined.length,
    0,
  );
  const totalDiscontinue = summaries.reduce(
    (acc, s) => acc + s.discontinue.length,
    0,
  );
  const denominator = totalMigrate + totalUndefined + totalCreate || 1;
  const readinessPercent =
    ((totalMigrate + totalCreate) / denominator) * 100;

  return {
    summaries,
    totalMigrate,
    totalCreate,
    totalUndefined,
    totalDiscontinue,
    readinessPercent,
    risks: summaries
      .map((s) => ({
        audienceName: s.audienceName,
        momentName: s.momentName,
        undefinedCount: s.undefined.length,
        migrateCount: s.migrate.length,
      }))
      .filter((r) => r.undefinedCount > 0)
      .sort((a, b) => b.undefinedCount - a.undefinedCount),
  };
}

export async function getParityFindings(): Promise<ParityFinding[]> {
  const rows = await buildFeatureMapRows();
  const groups = new Map<string, FeatureMapRow[]>();

  for (const row of rows) {
    const key = `${row.featureId}::${row.audienceId}::${row.momentId}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const findings: ParityFinding[] = [];

  for (const group of groups.values()) {
    const first = group[0];
    const current = group.filter((r) => r.temporalStatus === "CURRENT");
    const future = group.filter((r) => r.temporalStatus === "FUTURE");
    const statuses = group.map((r) => ({
      channelName: r.channelName,
      status: r.status,
      temporalStatus: r.temporalStatus,
    }));

    const uniqueStatuses = new Set(
      current
        .filter((r) => r.phase !== "REMOVED")
        .map((r) => r.status),
    );

    if (uniqueStatuses.size > 1) {
      findings.push({
        featureId: first.featureId,
        featureName: first.featureName,
        audienceName: first.audienceName,
        momentName: first.momentName,
        statuses,
        issue: "inconsistent_status",
      });
    }

    const hasCurrentAvailable = current.some((r) => r.phase !== "REMOVED");
    const futureDefined = future.some((r) => r.phase !== "REMOVED");

    if (hasCurrentAvailable && future.length > 0 && !futureDefined) {
      findings.push({
        featureId: first.featureId,
        featureName: first.featureName,
        audienceName: first.audienceName,
        momentName: first.momentName,
        statuses,
        issue: "missing_on_future",
      });
    }
  }

  return findings.slice(0, 20);
}

export async function getIntelligenceInsights(): Promise<IntelligenceInsight[]> {
  const [
    rows,
    gapIntel,
    migration,
    parity,
    experience,
  ] = await Promise.all([
    buildFeatureMapRows(),
    getGapIntelligence(),
    getMigrationIntelligence(),
    getParityFindings(),
    getExperienceHealth(),
  ]);

  const insights: IntelligenceInsight[] = [];
  const problems = rows.filter(
    (r) =>
      r.healthScore != null &&
      (r.healthSignal === "ATTENTION" || r.healthSignal === "CRITICAL"),
  );
  const criticalExp = experience.find((e) => e.level === "CRITICAL");

  if (gapIntel.criticalGaps.length > 0) {
    insights.push({
      id: "critical-gaps",
      severity: "critical",
      title: `${gapIntel.criticalGaps.length} ${CONCEPT_LABEL.problema.toLowerCase()}(s) crítica(s) no catálogo`,
      description: `Há ${CONCEPT_LABEL.problemas.toLowerCase()} cadastrados com impacto/prioridade crítica. Registro gerenciável em Melhorias — este insight apenas sinaliza.`,
      href: "/gaps?tab=issues",
      metric: String(gapIntel.criticalGaps.length),
      origin: "MELHORIAS",
      actionLabel: `Mostrar ${CONCEPT_LABEL.problemas.toLowerCase()}`,
    });
  }

  if (migration.totalUndefined > 0) {
    insights.push({
      id: "undefined-future",
      severity: "warning",
      title: `${migration.totalUndefined} funcionalidade(s) sem destino futuro`,
      description:
        "Há cobertura no canal atual sem definição no canal futuro — risco de transição.",
      href: "/inteligencia/transformacoes",
      metric: String(migration.totalUndefined),
      origin: "TRANSFORMATION",
      actionLabel: "Mostrar transformação",
    });
  }

  if (problems.length > 0) {
    insights.push({
      id: "problem-status",
      severity: "critical",
      title: `${uniqueFeatureIds(problems).size} funcionalidade(s) com saúde em atenção/crítica`,
      description:
        "Health derivado de Evaluation abaixo do esperado (canais sem avaliação não entram nesta contagem).",
      href: "/relatorios",
      metric: String(uniqueFeatureIds(problems).size),
      origin: "EXPERIENCE",
      actionLabel: "Mostrar relatório de experiência",
    });
  }

  if (criticalExp && criticalExp.count > 0) {
    insights.push({
      id: "critical-experience",
      severity: "warning",
      title: `${criticalExp.count} implementação(ões) com saúde crítica`,
      description:
        "Score de Health crítico a partir de avaliações — ausência de Evaluation não gera este sinal.",
      href: "/relatorios",
      metric: String(criticalExp.count),
      origin: "EXPERIENCE",
      actionLabel: "Mostrar relatório",
    });
  }

  const missingFuture = parity.filter((p) => p.issue === "missing_on_future");
  if (missingFuture.length > 0) {
    insights.push({
      id: "parity-future",
      severity: "watch",
      title: `${missingFuture.length} sinal(is) de paridade futuro`,
      description:
        "Funcionalidades atuais ainda não mapeadas com status no canal futuro.",
      href: "/inteligencia/transformacoes",
      metric: String(missingFuture.length),
      origin: "TRANSFORMATION",
      actionLabel: "Mostrar transformação",
    });
  }

  const inconsistent = parity.filter((p) => p.issue === "inconsistent_status");
  if (inconsistent.length > 0) {
    insights.push({
      id: "parity-inconsistent",
      severity: "warning",
      title: `${inconsistent.length} inconsistência(s) entre canais atuais`,
      description:
        "A mesma funcionalidade tem status diferentes entre canais do mesmo público/momento.",
      href: "/inteligencia/comparacoes",
      metric: String(inconsistent.length),
      origin: "COMPARISON",
      actionLabel: "Abrir comparações",
    });
  }

  if (gapIntel.transitionGaps.length > 0) {
    insights.push({
      id: "transition-gaps",
      severity: "watch",
      title: `${gapIntel.transitionGaps.length} ${CONCEPT_LABEL.problema.toLowerCase()}(s) de transição`,
      description:
        "Itens de transição no catálogo de Melhorias — priorize no plano Atual → Futuro.",
      href: "/gaps?tab=issues",
      metric: String(gapIntel.transitionGaps.length),
      origin: "MELHORIAS",
      actionLabel: `Mostrar ${CONCEPT_LABEL.problemas.toLowerCase()}`,
    });
  }

  const planned = uniqueFeatureIds(
    rows.filter((r) => PLANNED_STAGES.includes(r.phase)),
  ).size;
  if (planned > 0) {
    insights.push({
      id: "planned-pipeline",
      severity: "info",
      title: `${planned} funcionalidade(s) planejadas no pipeline`,
      description:
        "Itens com fase planejada prontos para priorização de discovery/UX.",
      href: "/roadmap",
      metric: String(planned),
      origin: "ROADMAP",
      actionLabel: "Mostrar gestão de entregas",
    });
  }

  return insights.map((insight) => ({
    ...insight,
    severity: coerceInsightSeverity(insight.severity),
  }));
}

export async function getChannelCoverageDetail() {
  const rows = await buildFeatureMapRows();
  const db = await getDatabase();

  return db.channels
    .filter((c) => c.active)
    .map((channel) => {
      const scoped = rows.filter((r) => r.channelId === channel.id);
      const total = scoped.length;
      const available = scoped.filter((r) => r.phase === "AVAILABLE").length;
      const future = scoped.some((r) => r.temporalStatus === "FUTURE");
      const current = scoped.some((r) => r.temporalStatus === "CURRENT");

      return {
        id: channel.id,
        name: channel.name,
        total,
        available,
        percentage: total === 0 ? 0 : (available / total) * 100,
        isFuture: future && !current ? true : future && current ? "both" : false,
        statusBreakdown: Object.entries(
          scoped.reduce<Record<string, number>>((acc, row) => {
            acc[row.status] = (acc[row.status] ?? 0) + 1;
            return acc;
          }, {}),
        )
          .map(([status, count]) => ({
            status: status as FeatureStatus,
            label: featureStatusLabel[status as FeatureStatus],
            count,
          }))
          .sort((a, b) => b.count - a.count),
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
}

export async function getAdvancedComparison(channelAId: string, channelBId: string) {
  const rows = await buildFeatureMapRows();
  const aRows = rows.filter((r) => r.channelId === channelAId);
  const bRows = rows.filter((r) => r.channelId === channelBId);

  const mapByFeature = (list: FeatureMapRow[]) => {
    const map = new Map<string, FeatureMapRow>();
    for (const row of list) {
      if (row.phase !== "REMOVED" && !map.has(row.featureId)) {
        map.set(row.featureId, row);
      }
    }
    return map;
  };

  const mapA = mapByFeature(aRows);
  const mapB = mapByFeature(bRows);

  const commonIds = [...mapA.keys()].filter((id) => mapB.has(id));
  const onlyAIds = [...mapA.keys()].filter((id) => !mapB.has(id));
  const onlyBIds = [...mapB.keys()].filter((id) => !mapA.has(id));

  /** Diferenças de Health canônico (Evaluation) + status de prazo — não ExperienceLevel. */
  const healthDiffs = commonIds
    .map((id) => {
      const a = mapA.get(id)!;
      const b = mapB.get(id)!;
      return {
        featureId: id,
        featureName: a.featureName,
        statusA: a.status,
        statusB: b.status,
        healthScoreA: a.healthScore,
        healthScoreB: b.healthScore,
        healthSignalA: a.healthSignal,
        healthSignalB: b.healthSignal,
        differentStatus: a.status !== b.status,
        differentHealth:
          a.healthScore !== b.healthScore || a.healthSignal !== b.healthSignal,
      };
    })
    .filter((d) => d.differentStatus || d.differentHealth);

  return {
    channelAId,
    channelBId,
    commonCount: commonIds.length,
    onlyACount: onlyAIds.length,
    onlyBCount: onlyBIds.length,
    parityPercent:
      (commonIds.length /
        Math.max(commonIds.length + onlyAIds.length + onlyBIds.length, 1)) *
      100,
    healthDiffs,
    /** @deprecated Fase 13 — preferir healthDiffs */
    experienceDiffs: healthDiffs.map((d) => ({
      featureId: d.featureId,
      featureName: d.featureName,
      statusA: d.statusA,
      statusB: d.statusB,
      experienceA: mapA.get(d.featureId)!.experience,
      experienceB: mapB.get(d.featureId)!.experience,
      differentStatus: d.differentStatus,
      differentExperience: d.differentHealth,
    })),
    common: commonIds.map((id) => mapA.get(id)!),
    onlyA: onlyAIds.map((id) => mapA.get(id)!),
    onlyB: onlyBIds.map((id) => mapB.get(id)!),
  };
}
