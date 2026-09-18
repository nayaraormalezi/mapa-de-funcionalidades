import { buildFeatureMapRows } from "@/services/channels";
import { getDatabase } from "@/services/db";
import type {
  Evidence,
  Feature,
  FeatureChannelContext,
  FeatureMapRow,
  RoadmapItem,
} from "@/types";

export async function getFeatures(): Promise<Feature[]> {
  return (await getDatabase()).features.filter((f) => f.active);
}

export async function getFeatureById(
  id: string,
): Promise<Feature | undefined> {
  return (await getFeatures()).find((f) => f.id === id);
}

export async function getFeatureContexts(
  featureId: string,
): Promise<FeatureMapRow[]> {
  const rows = (await buildFeatureMapRows()).filter(
    (r) => r.featureId === featureId,
  );
  const { resolveExperienceImageUrl, createEvidenceSignedUrl, isStoragePath } =
    await import("@/lib/evidence-files");
  return Promise.all(
    rows.map(async (row) => {
      let researchFileUrl: string | null = null;
      if (row.researchFilePath) {
        researchFileUrl = isStoragePath(row.researchFilePath)
          ? await createEvidenceSignedUrl(row.researchFilePath)
          : row.researchFilePath;
      }
      return {
        ...row,
        experienceImageUrl: await resolveExperienceImageUrl(
          row.experienceImageUrl,
        ),
        researchFileUrl,
      };
    }),
  );
}

export async function getFeatureChannelContexts(
  featureId: string,
): Promise<FeatureChannelContext[]> {
  return (await getDatabase()).featureChannelContexts.filter(
    (f) => f.featureId === featureId,
  );
}

export async function getFeatureEvidences(
  featureId: string,
): Promise<Evidence[]> {
  const { getFeatureSheetEvidences } = await import("@/services/evidence");
  return getFeatureSheetEvidences(featureId);
}

/**
 * Timeline de planejamento da funcionalidade.
 * Fonte: FeatureChannelContext (Implementation). Não usa RoadmapItem.
 *
 * @deprecated Nome legado `getFeatureRoadmap` — retorna shape compatível com
 * RoadmapItem apenas como DTO de view; IDs são de feature_channel_contexts.
 */
export async function getFeatureRoadmap(
  featureId: string,
): Promise<RoadmapItem[]> {
  const db = await getDatabase();
  return db.featureChannelContexts
    .filter((fcc) => fcc.featureId === featureId)
    .map((fcc) => ({
      id: fcc.id,
      featureId: fcc.featureId,
      channelContextId: fcc.channelContextId,
      phase: fcc.phase,
      startDate: fcc.startDate,
      expectedDate: fcc.expectedDate,
      /** Equivalente histórico de actualDate em RoadmapItem. */
      actualDate: fcc.launchDate,
      responsible: fcc.responsible,
      notes: fcc.notes,
    }));
}

export async function getFeatureEvolutions(featureId: string) {
  const db = await getDatabase();
  const fccIds = new Set(
    db.featureChannelContexts
      .filter((f) => f.featureId === featureId)
      .map((f) => f.id),
  );
  return db.featureEvolutions.filter(
    (e) => e.active && fccIds.has(e.featureChannelContextId),
  );
}

export async function getFeatureChannelEvaluations(featureId: string) {
  const db = await getDatabase();
  const list = db.featureChannelEvaluations.filter(
    (e) => e.active && e.featureId === featureId,
  );
  const { createEvidenceSignedUrl, isStoragePath } = await import(
    "@/lib/evidence-files"
  );
  return Promise.all(
    list.map(async (e) => {
      let evidenceFileUrl: string | null = null;
      if (e.evidenceFilePath) {
        evidenceFileUrl = isStoragePath(e.evidenceFilePath)
          ? await createEvidenceSignedUrl(e.evidenceFilePath)
          : e.evidenceFilePath;
      }
      return { ...e, evidenceFileUrl };
    }),
  );
}

export async function getFeatureIssues(featureId: string) {
  return (await getDatabase()).gaps.filter((g) => g.featureId === featureId);
}

/** @deprecated Fase 12 — preferir `getFeatureIssues`. */
export async function getFeatureGaps(featureId: string) {
  return getFeatureIssues(featureId);
}


export async function getFeatureHierarchy(featureId: string) {
  const db = await getDatabase();
  const feature = await getFeatureById(featureId);
  if (!feature) return null;

  const needIds =
    feature.needIds.length > 0
      ? feature.needIds
      : db.featureNeeds
          .filter((l) => l.featureId === featureId)
          .map((l) => l.userNeedId);

  const journeyIds =
    feature.journeyIds.length > 0
      ? feature.journeyIds
      : db.featureJourneys
          .filter((l) => l.featureId === featureId)
          .map((l) => l.journeyId);

  let capability = feature.capabilityId
    ? db.capabilities.find((c) => c.id === feature.capabilityId)
    : undefined;

  let userNeed = needIds
    .map((id) => db.userNeeds.find((n) => n.id === id))
    .find(Boolean);

  if (!userNeed && capability) {
    userNeed = db.userNeeds.find((n) => n.id === capability!.userNeedId);
  }
  if (!capability && userNeed) {
    capability = db.capabilities.find((c) => c.userNeedId === userNeed!.id);
  }

  const journeys = journeyIds
    .map((id) => db.journeys.find((j) => j.id === id))
    .filter((j): j is NonNullable<typeof j> => Boolean(j));

  const journey =
    journeys[0] ??
    (userNeed
      ? db.journeys.find((j) => j.id === userNeed!.journeyId)
      : undefined);

  const userNeeds = needIds
    .map((id) => db.userNeeds.find((n) => n.id === id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n));

  const stage = userNeed?.journeyStageId
    ? db.journeyStages.find((s) => s.id === userNeed.journeyStageId)
    : undefined;

  return {
    feature,
    capability,
    userNeed,
    journey,
    userNeeds,
    journeys,
    journeyStage: stage,
  };
}
