import { InsightsClient } from "@/app/inteligencia/insights-client";
import { getDatabase } from "@/services/db";
import {
  getExperienceHealth,
  getGapIntelligence,
  getIntelligenceInsights,
  getMigrationIntelligence,
  getParityFindings,
} from "@/services/intelligence";
import { buildFeatureMapRows } from "@/services/channels";

export default async function InsightsPage() {
  const [
    insights,
    experience,
    gapIntel,
    migration,
    parity,
    rows,
    db,
  ] = await Promise.all([
    getIntelligenceInsights(),
    getExperienceHealth(),
    getGapIntelligence(),
    getMigrationIntelligence(),
    getParityFindings(),
    buildFeatureMapRows(),
    getDatabase(),
  ]);

  const featureNameById = new Map(
    rows.map((r) => [r.featureId, r.featureName]),
  );

  const evidences = db.evidences
    .map((evidence) => ({
      id: evidence.id,
      title: evidence.title,
      type: evidence.type,
      description: evidence.description,
      date: evidence.date,
      responsible: evidence.responsible,
      featureId: evidence.featureId,
      featureName: featureNameById.get(evidence.featureId) ?? "Funcionalidade",
      link: evidence.link,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 12);

  const problemFeatures = Array.from(
    new Map(
      rows
        .filter(
          (r) =>
            r.experience === "NEEDS_IMPROVEMENT" || r.experience === "CRITICAL",
        )
        .map((r) => [
          r.featureId,
          {
            id: r.featureId,
            name: r.featureName,
            experience: r.experience,
            audienceName: r.audienceName,
            channelName: r.channelName,
          },
        ]),
    ).values(),
  ).slice(0, 8);

  return (
    <InsightsClient
      insights={insights}
      experience={experience}
      gapIntel={{
        totalOpen: gapIntel.totalOpen,
        criticalCount: gapIntel.criticalGaps.length,
        withoutActionPlan: gapIntel.withoutActionPlan,
        byType: gapIntel.byType,
        criticalGaps: gapIntel.criticalGaps.slice(0, 5).map((g) => ({
          id: g.id,
          title: g.title,
          type: g.type,
          impact: g.impact,
          priority: g.priority,
          status: g.status,
        })),
      }}
      migration={{
        readinessPercent: migration.readinessPercent,
        totalUndefined: migration.totalUndefined,
        totalMigrate: migration.totalMigrate,
        totalCreate: migration.totalCreate,
        risks: migration.risks.slice(0, 5),
      }}
      parity={parity.slice(0, 8).map((p) => ({
        featureId: p.featureId,
        featureName: p.featureName,
        audienceName: p.audienceName,
        momentName: p.momentName,
        issue: p.issue,
      }))}
      evidences={evidences}
      problemFeatures={problemFeatures}
    />
  );
}
