/**
 * Montagem de dados para /relatorios (Fase 15.4).
 * Não altera entidades estruturais — agrega fontes existentes.
 */

import {
  getCoverageByDimension,
  getCoverageFeature,
  getCoverageOfNeeds,
  getCoverageOfNeedsByDimension,
  getDeadlineStatusDistribution,
  getEvaluationCoverage,
  getExperienceHealthByFeature,
  getMappedFeatures,
  getOpenImprovementsCount,
  getPhaseDistribution,
  type RatioMetric,
} from "@/lib/report-metrics";
import type { TemporalEvent } from "@/lib/report-period";
import { METHOD_VALIDITY_DAYS } from "@/lib/evaluation-governance";
import { CONCEPT_LABEL, featureStageLabel, priorityLabel } from "@/lib/labels";
import { PRODUCT_CATALOG } from "@/lib/products";
import {
  buildFeatureMapRows,
  getAudiences,
  getChannels,
  getJourneys,
  getMoments,
} from "@/services/channels";
import { getDatabase } from "@/services/db";
import { getHubSignals } from "@/services/gaps-opportunities";
import {
  getIntelligenceInsights,
  getMigrationIntelligence,
} from "@/services/intelligence";
import type {
  Feature,
  FeatureMapRow,
  FeatureStage,
  Priority,
  UserNeed,
} from "@/types";

export type ReportOption = { id: string; name: string };

export type ReportAttentionItem = {
  id: string;
  kind: "lacuna" | "problema" | "oportunidade" | "insight";
  title: string;
  subtitle: string;
  href: string;
};

export type ReportMelhoriasBucket = {
  total: number;
  byImpact: { key: string; label: string; count: number }[];
  byAudience: { key: string; label: string; count: number }[];
  byProduct: { key: string; label: string; count: number }[];
  byChannel: { key: string; label: string; count: number }[];
  byJourney: { key: string; label: string; count: number }[];
  byStatus: { key: string; label: string; count: number }[];
  items: {
    id: string;
    title: string;
    subtitle: string;
    href: string;
    impact?: string;
  }[];
};

export type EvalFreshness = {
  updated: number;
  nearingExpiry: number;
  expired: number;
  neverEvaluatedFeatures: number;
  byMethod: { method: string; count: number }[];
};

export type ReportPayload = {
  rows: FeatureMapRow[];
  needs: UserNeed[];
  features: Feature[];
  temporalEvents: TemporalEvent[];
  options: {
    audiences: ReportOption[];
    products: ReportOption[];
    moments: ReportOption[];
    journeys: ReportOption[];
    stages: ReportOption[];
    channels: ReportOption[];
  };
  /** Inventário / cobertura / saúde — somente estado atual. */
  current: {
    mappedFeatures: number;
    coverageNeeds: RatioMetric;
    coverageFunctional: RatioMetric;
    evaluationCoverage: RatioMetric;
    openImprovements: number;
    openBreakdown: {
      lacunas: number;
      problemas: number;
      oportunidades: number;
    };
    health: ReturnType<typeof getExperienceHealthByFeature>;
    freshness: EvalFreshness;
    coverage: {
      needsByAudience: ReturnType<typeof getCoverageOfNeedsByDimension>;
      needsByProduct: ReturnType<typeof getCoverageOfNeedsByDimension>;
      needsByStage: ReturnType<typeof getCoverageOfNeedsByDimension>;
      byChannel: ReturnType<typeof getCoverageByDimension>;
    };
    phaseDistribution: ReturnType<typeof getPhaseDistribution>;
    deadlineDistribution: ReturnType<typeof getDeadlineStatusDistribution>;
  };
  overview: {
    attention: ReportAttentionItem[];
    insights: {
      id: string;
      title: string;
      description: string;
      href: string;
    }[];
  };
  melhorias: {
    lacunas: ReportMelhoriasBucket;
    problemas: ReportMelhoriasBucket;
    oportunidades: ReportMelhoriasBucket;
  };
  evolution: {
    evolutions: {
      total: number;
      byStatus: { key: string; label: string; count: number }[];
      completed: number;
      inProgress: number;
      items: {
        id: string;
        title: string;
        status: string;
        completedDate: string | null;
        createdAt: string;
        startDate: string | null;
      }[];
    };
    migration: {
      migrate: number;
      create: number;
      undefined: number;
      discontinue: number;
      readinessPercent: number | null;
    };
  };
};

function tally(
  items: { key: string; label: string }[],
): { key: string; label: string; count: number }[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const item of items) {
    const prev = map.get(item.key);
    if (prev) prev.count += 1;
    else map.set(item.key, { label: item.label, count: 1 });
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count);
}

function daysBetween(fromIso: string, to = new Date()): number {
  const from = new Date(fromIso.slice(0, 10) + "T12:00:00");
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / 86400000);
}

function buildFreshness(
  evaluations: {
    methodCode?: string | null;
    evaluatedAt: string | null;
    status?: string | null;
  }[],
  featureCount: number,
  evaluatedFeatureCount: number,
): EvalFreshness {
  let updated = 0;
  let nearingExpiry = 0;
  let expired = 0;
  const methodCounts = new Map<string, number>();

  for (const ev of evaluations) {
    const method = (ev.methodCode || "CUSTOM").toUpperCase();
    methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);
    const validity = METHOD_VALIDITY_DAYS[method] ?? 180;
    if (validity == null) {
      updated += 1;
      continue;
    }
    if (!ev.evaluatedAt) {
      expired += 1;
      continue;
    }
    const age = daysBetween(ev.evaluatedAt);
    if (ev.status === "NEEDS_UPDATE" || age > validity) {
      expired += 1;
    } else if (age > validity * 0.8) {
      nearingExpiry += 1;
    } else {
      updated += 1;
    }
  }

  return {
    updated,
    nearingExpiry,
    expired,
    neverEvaluatedFeatures: Math.max(0, featureCount - evaluatedFeatureCount),
    byMethod: Array.from(methodCounts.entries())
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function getReportPayload(): Promise<ReportPayload> {
  const [
    rows,
    audiences,
    moments,
    journeys,
    channels,
    hub,
    insights,
    migration,
    db,
  ] = await Promise.all([
    buildFeatureMapRows(),
    getAudiences(),
    getMoments(),
    getJourneys(),
    getChannels(),
    getHubSignals(),
    getIntelligenceInsights(),
    getMigrationIntelligence(),
    getDatabase(),
  ]);

  const needs = db.userNeeds.filter((n) => n.active);
  const features = db.features.filter((f) => f.active);

  const stages = db.journeyStages
    .filter((s) => s.active)
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ id: s.id, name: s.name }));

  const products = PRODUCT_CATALOG.map((p) => ({
    id: p.id,
    name: p.shortName,
  }));
  const audienceOpts = audiences.map((a) => ({ id: a.id, name: a.name }));
  const momentOpts = moments.map((m) => ({ id: m.id, name: m.name }));
  const journeyOpts = journeys.map((j) => ({ id: j.id, name: j.name }));
  const channelOpts = channels.map((c) => ({ id: c.id, name: c.name }));

  const openProblemas = hub.issues.filter(
    (i) => i.status === "OPEN" || i.status === "IN_PROGRESS",
  );

  const mappedFeatures = getMappedFeatures(rows);
  const coverageNeeds = getCoverageOfNeeds(needs, features, rows);
  const coverageFunctional = getCoverageFeature(rows);
  const evaluationCoverage = getEvaluationCoverage(rows);
  const openBreakdown = {
    lacunas: hub.coverageGaps.length,
    problemas: openProblemas.length,
    oportunidades: hub.opportunities.length,
  };
  const openImprovements = getOpenImprovementsCount({
    lacunas: openBreakdown.lacunas,
    problemasAbertos: openBreakdown.problemas,
    oportunidades: openBreakdown.oportunidades,
  });

  const activeEvals = db.featureChannelEvaluations.filter((e) => e.active);
  const freshness = buildFreshness(
    activeEvals.map((e) => ({
      methodCode: e.methodCode,
      evaluatedAt: e.evaluatedAt,
      status: e.status,
    })),
    mappedFeatures,
    evaluationCoverage.numerator,
  );

  const temporalEvents: TemporalEvent[] = [];
  for (const ev of activeEvals) {
    const date = (ev.evaluatedAt || ev.createdAt || "").slice(0, 10);
    if (!date) continue;
    temporalEvents.push({
      id: ev.id,
      kind: "evaluation",
      date,
      label: ev.methodCode || "Avaliação",
    });
  }
  for (const evo of db.featureEvolutions.filter((e) => e.active)) {
    for (const date of [
      evo.completedDate,
      evo.startDate,
      evo.createdAt,
    ]) {
      if (!date) continue;
      temporalEvents.push({
        id: `${evo.id}-${date.slice(0, 10)}`,
        kind: "evolution",
        date: date.slice(0, 10),
        label: evo.title,
      });
    }
  }
  for (const row of rows) {
    for (const date of [row.launchDate, row.startDate, row.expectedDate]) {
      if (!date) continue;
      temporalEvents.push({
        id: `${row.featureChannelContextId}-${date.slice(0, 10)}`,
        kind: "fcc_date",
        date: date.slice(0, 10),
        label: row.featureName,
      });
    }
  }

  const attention: ReportAttentionItem[] = [
    ...hub.coverageGaps.slice(0, 4).map((g) => ({
      id: g.id,
      kind: "lacuna" as const,
      title: g.title,
      subtitle: `${g.featureName} · ${g.channelName}`,
      href: g.href,
    })),
    ...openProblemas
      .filter((i) => i.impact === "CRITICAL" || i.priority === "CRITICAL")
      .slice(0, 4)
      .map((i) => ({
        id: i.id,
        kind: "problema" as const,
        title: i.title,
        subtitle: i.featureName ?? CONCEPT_LABEL.problema,
        href: i.href,
      })),
    ...hub.opportunities.slice(0, 3).map((o) => ({
      id: o.id,
      kind: "oportunidade" as const,
      title: o.title,
      subtitle: `${o.featureName} · ${o.channelName}`,
      href: o.href,
    })),
  ];

  if (migration.totalUndefined > 0) {
    attention.push({
      id: "undefined-destination",
      kind: "insight",
      title: `${migration.totalUndefined} funcionalidade(s) sem destino futuro`,
      subtitle: "Transformação Atual → Futuro",
      href: "/inteligencia/transformacoes",
    });
  }
  if (freshness.expired > 0 || freshness.neverEvaluatedFeatures > 0) {
    attention.push({
      id: "stale-evals",
      kind: "insight",
      title: `${freshness.expired} avaliações vencidas · ${freshness.neverEvaluatedFeatures} Features nunca avaliadas`,
      subtitle: "Cobertura de avaliação",
      href: "/relatorios",
    });
  }

  const impactLabel = (impact: string) =>
    priorityLabel[impact as Priority] ?? impact;

  const lacunas: ReportMelhoriasBucket = {
    total: hub.coverageGaps.length,
    byImpact: [],
    byAudience: tally(
      hub.coverageGaps.map((g) => ({
        key: g.audienceId || "—",
        label: g.audienceName || "—",
      })),
    ),
    byProduct: tally(
      hub.coverageGaps.map((g) => ({
        key: g.productId || "—",
        label: g.productShortName || "—",
      })),
    ),
    byChannel: tally(
      hub.coverageGaps.map((g) => ({
        key: g.channelName,
        label: g.channelName,
      })),
    ),
    byJourney: [],
    byStatus: tally(
      hub.coverageGaps.map((g) => ({
        key: g.reason,
        label: g.reason === "BACKLOG" ? "Em backlog" : "Sem previsão",
      })),
    ),
    items: hub.coverageGaps.slice(0, 12).map((g) => ({
      id: g.id,
      title: g.title,
      subtitle: `${g.featureName} · ${g.channelName}`,
      href: g.href,
    })),
  };

  const problemas: ReportMelhoriasBucket = {
    total: openProblemas.length,
    byImpact: tally(
      openProblemas.map((i) => ({
        key: i.impact,
        label: impactLabel(i.impact),
      })),
    ),
    byAudience: tally(
      openProblemas.map((i) => ({
        key: i.audienceId || "—",
        label: i.audienceName || "—",
      })),
    ),
    byProduct: [],
    byChannel: [],
    byJourney: tally(
      openProblemas.map((i) => ({
        key: i.journeyId || "—",
        label: i.journeyName || "—",
      })),
    ),
    byStatus: tally(
      openProblemas.map((i) => ({
        key: i.status,
        label: i.status,
      })),
    ),
    items: openProblemas.slice(0, 12).map((i) => ({
      id: i.id,
      title: i.title,
      subtitle: i.featureName ?? "—",
      href: i.href,
      impact: i.impact,
    })),
  };

  const oportunidades: ReportMelhoriasBucket = {
    total: hub.opportunities.length,
    byImpact: tally(
      hub.opportunities.map((o) => ({
        key: o.impact,
        label: o.impact,
      })),
    ),
    byAudience: tally(
      hub.opportunities.map((o) => ({
        key: o.audienceId || "—",
        label: o.audienceName || "—",
      })),
    ),
    byProduct: tally(
      hub.opportunities.map((o) => ({
        key: o.productId || "—",
        label: o.productShortName || "—",
      })),
    ),
    byChannel: tally(
      hub.opportunities.map((o) => ({
        key: o.channelName,
        label: o.channelName,
      })),
    ),
    byJourney: [],
    byStatus: tally(
      hub.opportunities.map((o) => ({
        key: o.origin,
        label: o.origin,
      })),
    ),
    items: hub.opportunities.slice(0, 12).map((o) => ({
      id: o.id,
      title: o.title,
      subtitle: `${o.featureName} · ${o.channelName}`,
      href: o.href,
      impact: o.impact,
    })),
  };

  const evolutions = db.featureEvolutions.filter((e) => e.active);
  const readinessDenom =
    migration.totalMigrate + migration.totalUndefined + migration.totalCreate;

  return {
    rows,
    needs,
    features,
    temporalEvents,
    options: {
      audiences: audienceOpts,
      products,
      moments: momentOpts,
      journeys: journeyOpts,
      stages,
      channels: channelOpts,
    },
    current: {
      mappedFeatures,
      coverageNeeds,
      coverageFunctional,
      evaluationCoverage,
      openImprovements,
      openBreakdown,
      health: getExperienceHealthByFeature(rows),
      freshness,
      coverage: {
        needsByAudience: getCoverageOfNeedsByDimension(
          needs,
          features,
          rows,
          audienceOpts,
          "audience",
        ),
        needsByProduct: getCoverageOfNeedsByDimension(
          needs,
          features,
          rows,
          products,
          "product",
        ),
        needsByStage: getCoverageOfNeedsByDimension(
          needs,
          features,
          rows,
          stages,
          "stage",
        ),
        byChannel: getCoverageByDimension(
          rows,
          channelOpts,
          (r) => r.channelId,
        ),
      },
      phaseDistribution: getPhaseDistribution(rows),
      deadlineDistribution: getDeadlineStatusDistribution(rows),
    },
    overview: {
      attention: attention.slice(0, 10),
      insights: insights.slice(0, 5).map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        href: i.href || "/inteligencia",
      })),
    },
    melhorias: { lacunas, problemas, oportunidades },
    evolution: {
      evolutions: {
        total: evolutions.length,
        byStatus: tally(
          evolutions.map((e) => ({ key: e.status, label: e.status })),
        ),
        completed: evolutions.filter((e) => e.status === "DONE").length,
        inProgress: evolutions.filter((e) => e.status === "IN_PROGRESS")
          .length,
        items: evolutions.map((e) => ({
          id: e.id,
          title: e.title,
          status: e.status,
          completedDate: e.completedDate,
          createdAt: e.createdAt,
          startDate: e.startDate,
        })),
      },
      migration: {
        migrate: migration.totalMigrate,
        create: migration.totalCreate,
        undefined: migration.totalUndefined,
        discontinue: migration.totalDiscontinue,
        readinessPercent:
          readinessDenom === 0
            ? null
            : ((migration.totalMigrate + migration.totalCreate) /
                readinessDenom) *
              100,
      },
    },
  };
}

/** @deprecated kept for accidental imports */
export const REPORT_STAGE_LABEL = featureStageLabel;
