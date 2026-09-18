import {
  DEVELOPMENT_STAGES,
  PLANNED_STAGES,
} from "@/lib/labels";
import {
  buildFeatureMapRows,
  getAudiences,
  getChannels,
  getMoments,
} from "@/services/channels";
import { getDatabase } from "@/services/db";
import type {
  CoverageItem,
  DashboardKpis,
  FeatureMapRow,
} from "@/types";

function uniqueFeatureIds(rows: FeatureMapRow[]): Set<string> {
  return new Set(rows.map((r) => r.featureId));
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const rows = await buildFeatureMapRows();
  const features = uniqueFeatureIds(rows);
  const available = uniqueFeatureIds(
    rows.filter((r) => r.phase === "AVAILABLE"),
  );
  const inDevelopment = uniqueFeatureIds(
    rows.filter((r) => DEVELOPMENT_STAGES.includes(r.phase)),
  );
  const planned = uniqueFeatureIds(
    rows.filter((r) => PLANNED_STAGES.includes(r.phase)),
  );
  const withProblem = uniqueFeatureIds(
    rows.filter(
      (r) =>
        r.healthScore != null &&
        (r.healthSignal === "ATTENTION" || r.healthSignal === "CRITICAL"),
    ),
  );
  const gaps = (await getDatabase()).gaps.filter(
    (g) => g.status === "OPEN" || g.status === "IN_PROGRESS",
  ).length;

  return {
    totalFeatures: features.size,
    available: available.size,
    inDevelopment: inDevelopment.size,
    planned: planned.size,
    gaps,
    withProblem: withProblem.size,
  };
}

async function coverageFor(
  items: { id: string; name: string }[],
  predicate: (row: FeatureMapRow, id: string) => boolean,
): Promise<CoverageItem[]> {
  const rows = await buildFeatureMapRows();
  return items.map((item) => {
    const scoped = rows.filter((r) => predicate(r, item.id));
    // Cobertura por IMPLEMENTAÇÃO (contexto de canal), não por funcionalidade distinta.
    const total = scoped.length;
    const available = scoped.filter((r) => r.phase === "AVAILABLE").length;
    const featureCount = uniqueFeatureIds(scoped).size;
    return {
      id: item.id,
      name: item.name,
      total,
      available,
      featureCount,
      percentage: total === 0 ? 0 : (available / total) * 100,
    };
  });
}

export async function getCoverageByAudience(): Promise<CoverageItem[]> {
  return coverageFor(await getAudiences(), (row, id) => row.audienceId === id);
}

export async function getCoverageByMoment(): Promise<CoverageItem[]> {
  return coverageFor(await getMoments(), (row, id) => row.momentId === id);
}

export async function getCoverageByChannel(): Promise<CoverageItem[]> {
  return coverageFor(await getChannels(), (row, id) => row.channelId === id);
}

export async function getEvolutionSummary() {
  const rows = await buildFeatureMapRows();
  const currentChannels = new Set(
    rows
      .filter((r) => r.temporalStatus === "CURRENT")
      .map((r) => r.channelId),
  );
  const futureChannels = new Set(
    rows
      .filter((r) => r.temporalStatus === "FUTURE")
      .map((r) => r.channelId),
  );
  const currentFeatures = uniqueFeatureIds(
    rows.filter((r) => r.temporalStatus === "CURRENT"),
  );
  const futureFeatures = uniqueFeatureIds(
    rows.filter((r) => r.temporalStatus === "FUTURE"),
  );

  return {
    currentFeatureCount: currentFeatures.size,
    currentChannelCount: currentChannels.size,
    futureFeatureCount: futureFeatures.size,
    futureChannelCount: futureChannels.size,
    narrative: `${currentFeatures.size} funcionalidades atualmente distribuídas em ${currentChannels.size} canais serão migradas/concentradas em ${futureChannels.size} canais futuros (dados DEMO).`,
  };
}

export async function getStatusDistribution() {
  const rows = await buildFeatureMapRows();
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}
