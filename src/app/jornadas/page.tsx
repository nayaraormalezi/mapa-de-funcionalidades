import { JornadasClient } from "@/app/jornadas/jornadas-client";
import { PRODUCT_CATALOG } from "@/lib/products";
import { buildFeatureMapRows } from "@/services/channels";
import { getDatabase } from "@/services/db";

export default async function JornadasPage({
  searchParams,
}: {
  searchParams: Promise<{ journey?: string }>;
}) {
  const { journey: initialJourneyId } = await searchParams;
  const [db, rows] = await Promise.all([getDatabase(), buildFeatureMapRows()]);

  const catalogById = new Map(db.journeys.map((j) => [j.id, j]));

  const journeyStages = db.journeyAudienceStages
    .filter((s) => s.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => {
      const catalog = catalogById.get(s.journeyId);
      return {
        id: s.journeyId,
        stageId: s.id,
        audienceId: s.audienceId,
        name: s.displayName,
        description: catalog?.description ?? "",
        order: s.sortOrder,
        momentId: s.momentId,
      };
    });

  const needs = db.userNeeds
    .filter((n) => n.active)
    .map((n) => ({
      id: n.id,
      journeyId: n.journeyId,
      name: n.name,
      description: n.description,
      priority: n.priority,
    }));

  const gaps = db.gaps
    .filter((g) => {
      const record = g as typeof g & { active?: boolean };
      return record.active !== false;
    })
    .map((g) => ({
      id: g.id,
      title: g.title,
      journeyId: g.journeyId,
      status: g.status,
      type: g.type,
      priority: g.priority,
      impact: g.impact,
    }));

  const evidences = db.evidences.map((e) => ({
    id: e.id,
    featureId: e.featureId,
    title: e.title,
    type: e.type,
    date: e.date,
  }));

  const products = PRODUCT_CATALOG.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  return (
    <JornadasClient
      journeyStages={journeyStages}
      needs={needs}
      gaps={gaps}
      evidences={evidences}
      rows={rows}
      audiences={db.audiences
        .filter((a) => a.active)
        .map((a) => ({
          id: a.id,
          name: a.name,
          code: a.code,
          description: a.description,
        }))}
      products={products}
      moments={db.moments
        .filter((m) => m.active)
        .map((m) => ({ value: m.id, label: m.name }))}
      journeysCatalog={db.journeys
        .filter((j) => j.active)
        .map((j) => ({
          value: j.id,
          label: j.name,
          momentIds: j.momentIds,
        }))}
      channels={db.channels
        .filter((c) => c.active)
        .map((c) => ({ value: c.id, label: c.name }))}
      initialJourneyId={initialJourneyId}
    />
  );
}
