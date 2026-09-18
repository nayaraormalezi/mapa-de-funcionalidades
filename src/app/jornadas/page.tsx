import { JornadasClient } from "@/app/jornadas/jornadas-client";
import { PRODUCT_CATALOG } from "@/lib/products";
import { buildFeatureMapRows } from "@/services/channels";
import { getDatabase } from "@/services/db";

/**
 * /jornadas — Jornada → Etapas → Necessidades.
 * Fase 15: etapas vêm de JourneyStage; JourneyAudienceStage só customiza
 * rótulo/ordem/momento por público.
 */
export default async function JornadasPage({
  searchParams,
}: {
  searchParams: Promise<{ journey?: string; etapa?: string }>;
}) {
  const { journey: initialJourneyId, etapa: initialStageId } =
    await searchParams;
  const [db, rows] = await Promise.all([getDatabase(), buildFeatureMapRows()]);

  const catalogJourney =
    db.journeys.find((j) => j.active && j.id === "jrn-consorcio") ??
    db.journeys.find((j) => j.active) ??
    db.journeys[0];

  const catalogStages = db.journeyStages
    .filter(
      (s) =>
        s.active &&
        catalogJourney &&
        s.journeyId === catalogJourney.id,
    )
    .sort((a, b) => a.order - b.order);

  const audiences = db.audiences.filter((a) => a.active);

  /** Uma linha por público × etapa (estrutura compartilhada). */
  const journeyStages = catalogStages.flatMap((stage) => {
    return audiences.map((audience) => {
      const jas = db.journeyAudienceStages.find(
        (s) =>
          s.active &&
          s.audienceId === audience.id &&
          (s.journeyStageId === stage.id ||
            (!s.journeyStageId && s.journeyId === stage.id)),
      );
      return {
        /** id de seleção = etapa (JourneyStage). */
        id: stage.id,
        stageId: jas?.id ?? `virtual-${audience.id}-${stage.id}`,
        catalogJourneyId: catalogJourney?.id ?? stage.journeyId,
        audienceId: audience.id,
        name: jas?.displayName ?? stage.name,
        description: stage.description,
        order: jas?.sortOrder ?? stage.order,
        momentId:
          jas?.momentId ??
          (stage.order <= 3 ? "mom-sale" : "mom-after-sale"),
      };
    });
  });

  const needs = db.userNeeds
    .filter((n) => n.active)
    .map((n) => ({
      id: n.id,
      journeyId: n.journeyId,
      journeyStageId: n.journeyStageId,
      name: n.name,
      description: n.description,
      measurement: n.measurement,
      priority: n.priority,
      productIds: n.productIds,
      audienceIds: n.audienceIds,
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
      featureId: g.featureId,
      status: g.status,
      type: g.type,
      priority: g.priority,
      impact: g.impact,
    }));

  const products = PRODUCT_CATALOG.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  // Compat: ?journey=jrn-lance (legado) → etapa js-jrn-lance
  const legacyStageId =
    initialJourneyId && initialJourneyId.startsWith("jrn-") && initialJourneyId !== "jrn-consorcio"
      ? `js-${initialJourneyId}`
      : undefined;

  return (
    <JornadasClient
      journeyStages={journeyStages}
      needs={needs}
      gaps={gaps}
      rows={rows}
      audiences={audiences.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.code,
        description: a.description,
      }))}
      products={products}
      moments={db.moments
        .filter((m) => m.active)
        .map((m) => ({ value: m.id, label: m.name }))}
      journeysCatalog={
        catalogJourney
          ? [
              {
                value: catalogJourney.id,
                label: catalogJourney.name,
                momentIds: catalogJourney.momentIds,
              },
            ]
          : []
      }
      channels={db.channels
        .filter((c) => c.active)
        .map((c) => ({ value: c.id, label: c.name }))}
      channelContexts={db.channelContexts
        .filter((c) => c.active)
        .map((c) => ({
          audienceId: c.audienceId,
          momentId: c.momentId,
          channelId: c.channelId,
        }))}
      existingFeatures={db.features
        .filter((f) => f.active)
        .map((f) => ({
          value: f.id,
          label: f.name,
          description: f.description,
        }))}
      initialJourneyId={
        initialStageId ??
        legacyStageId ??
        (initialJourneyId?.startsWith("js-") ? initialJourneyId : undefined)
      }
    />
  );
}
