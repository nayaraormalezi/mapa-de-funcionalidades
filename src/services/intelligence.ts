import {
  DEVELOPMENT_STATUSES,
  PLANNED_STATUSES,
  experienceLabel,
  featureStatusLabel,
  gapTypeLabel,
} from "@/lib/labels";
import {
  buildFeatureMapRows,
  getAudiences,
  getMoments,
} from "@/services/channels";
import { getDatabase } from "@/services/db";
import { getOpenGaps } from "@/services/gaps";
import { getTransformationSummaries } from "@/services/transformation";
import type {
  ExperienceLevel,
  FeatureMapRow,
  FeatureStatus,
  Gap,
  GapType,
  TransformationSummary,
} from "@/types";

export type InsightSeverity = "critical" | "warning" | "opportunity" | "info";

export interface IntelligenceInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  href?: string;
  metric?: string;
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

export interface ExperienceHealth {
  level: ExperienceLevel;
  count: number;
  percentage: number;
}

export interface GapIntelligence {
  totalOpen: number;
  byType: { type: GapType; label: string; count: number }[];
  byImpact: { impact: string; count: number }[];
  transitionGaps: Gap[];
  criticalGaps: Gap[];
  withoutActionPlan: number;
}

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
      const total = uniqueFeatureIds(scoped).size;
      const available = uniqueFeatureIds(
        scoped.filter((r) => r.status === "AVAILABLE"),
      ).size;
      const planned = uniqueFeatureIds(
        scoped.filter((r) => PLANNED_STATUSES.includes(r.status)),
      ).size;
      const inDevelopment = uniqueFeatureIds(
        scoped.filter((r) => DEVELOPMENT_STATUSES.includes(r.status)),
      ).size;
      const problems = uniqueFeatureIds(
        scoped.filter((r) => (r.experience === "NEEDS_IMPROVEMENT" || r.experience === "CRITICAL")),
      ).size;
      const notAvailable = uniqueFeatureIds(
        scoped.filter((r) => r.status === "REMOVED"),
      ).size;

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

export async function getExperienceHealth(): Promise<ExperienceHealth[]> {
  const rows = await buildFeatureMapRows();
  const evaluated = rows.filter((r) => r.experience !== "NOT_EVALUATED");
  const total = evaluated.length || 1;
  const levels: ExperienceLevel[] = [
    "GOOD",
    "ADEQUATE",
    "NEEDS_IMPROVEMENT",
    "CRITICAL",
    "NOT_EVALUATED",
  ];

  return levels.map((level) => {
    const count = rows.filter((r) => r.experience === level).length;
    return {
      level,
      count,
      percentage:
        level === "NOT_EVALUATED"
          ? (count / Math.max(rows.length, 1)) * 100
          : (count / total) * 100,
    };
  });
}

export async function getGapIntelligence(): Promise<GapIntelligence> {
  const gaps = await getOpenGaps();
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
        .filter((r) => r.status !== "REMOVED")
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

    const hasCurrentAvailable = current.some((r) => r.status !== "REMOVED");
    const futureDefined = future.some((r) => r.status !== "REMOVED");

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
  const problems = rows.filter((r) => (r.experience === "NEEDS_IMPROVEMENT" || r.experience === "CRITICAL"));
  const criticalExp = experience.find((e) => e.level === "CRITICAL");

  if (gapIntel.criticalGaps.length > 0) {
    insights.push({
      id: "critical-gaps",
      severity: "critical",
      title: `${gapIntel.criticalGaps.length} gap(s) críticos abertos`,
      description:
        "Existem gaps com impacto/prioridade crítica que exigem plano de ação imediato.",
      href: "/gaps",
      metric: String(gapIntel.criticalGaps.length),
    });
  }

  if (migration.totalUndefined > 0) {
    insights.push({
      id: "undefined-future",
      severity: "warning",
      title: `${migration.totalUndefined} funcionalidade(s) sem destino no futuro`,
      description:
        "Há cobertura no canal atual sem definição no canal futuro — risco de transição.",
      href: "/transformacao",
      metric: String(migration.totalUndefined),
    });
  }

  if (problems.length > 0) {
    insights.push({
      id: "problem-status",
      severity: "critical",
      title: `${uniqueFeatureIds(problems).size} funcionalidade(s) com problema`,
      description:
        "Experiência crítica/precisa melhorar indica fricção mesmo com funcionalidade disponível.",
      href: "/mapa",
      metric: String(uniqueFeatureIds(problems).size),
    });
  }

  if (criticalExp && criticalExp.count > 0) {
    insights.push({
      id: "critical-experience",
      severity: "warning",
      title: `${criticalExp.count} contexto(s) com experiência crítica`,
      description: `${experienceLabel.CRITICAL}: usuários encontram fricção severa mesmo com a feature disponível.`,
      href: "/mapa",
      metric: String(criticalExp.count),
    });
  }

  const missingFuture = parity.filter((p) => p.issue === "missing_on_future");
  if (missingFuture.length > 0) {
    insights.push({
      id: "parity-future",
      severity: "opportunity",
      title: `${missingFuture.length} oportunidade(s) de paridade futuro`,
      description:
        "Funcionalidades atuais ainda não mapeadas com status no canal futuro.",
      href: "/inteligencia",
      metric: String(missingFuture.length),
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
      href: "/comparacao",
      metric: String(inconsistent.length),
    });
  }

  if (gapIntel.transitionGaps.length > 0) {
    insights.push({
      id: "transition-gaps",
      severity: "opportunity",
      title: `${gapIntel.transitionGaps.length} gap(s) de transição`,
      description:
        "Priorize estes itens no roadmap de migração Atual → Futuro.",
      href: "/transformacao",
      metric: String(gapIntel.transitionGaps.length),
    });
  }

  const planned = uniqueFeatureIds(
    rows.filter((r) => PLANNED_STATUSES.includes(r.status)),
  ).size;
  if (planned > 0) {
    insights.push({
      id: "planned-pipeline",
      severity: "info",
      title: `${planned} funcionalidade(s) planejadas no pipeline`,
      description: "Itens com status Planejado prontos para priorização de discovery/UX.",
      href: "/mapa",
      metric: String(planned),
    });
  }

  return insights;
}

export async function getChannelCoverageDetail() {
  const rows = await buildFeatureMapRows();
  const db = await getDatabase();

  return db.channels
    .filter((c) => c.active)
    .map((channel) => {
      const scoped = rows.filter((r) => r.channelId === channel.id);
      const total = uniqueFeatureIds(scoped).size;
      const available = uniqueFeatureIds(
        scoped.filter((r) => r.status === "AVAILABLE"),
      ).size;
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
      if (row.status !== "REMOVED" && !map.has(row.featureId)) {
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

  const experienceDiffs = commonIds
    .map((id) => {
      const a = mapA.get(id)!;
      const b = mapB.get(id)!;
      return {
        featureId: id,
        featureName: a.featureName,
        statusA: a.status,
        statusB: b.status,
        experienceA: a.experience,
        experienceB: b.experience,
        differentStatus: a.status !== b.status,
        differentExperience: a.experience !== b.experience,
      };
    })
    .filter((d) => d.differentStatus || d.differentExperience);

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
    experienceDiffs,
    common: commonIds.map((id) => mapA.get(id)!),
    onlyA: onlyAIds.map((id) => mapA.get(id)!),
    onlyB: onlyBIds.map((id) => mapB.get(id)!),
  };
}
