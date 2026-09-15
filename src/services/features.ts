import { buildFeatureMapRows } from "@/services/channels";
import { getDatabase } from "@/services/db";
import type {
  Evidence,
  Feature,
  FeatureChannelContext,
  FeatureMapRow,
  Gap,
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
  return (await buildFeatureMapRows()).filter((r) => r.featureId === featureId);
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
  return (await getDatabase()).evidences.filter((e) => e.featureId === featureId);
}

export async function getFeatureRoadmap(
  featureId: string,
): Promise<RoadmapItem[]> {
  return (await getDatabase()).roadmapItems.filter(
    (r) => r.featureId === featureId,
  );
}

export async function getFeatureGaps(featureId: string): Promise<Gap[]> {
  return (await getDatabase()).gaps.filter((g) => g.featureId === featureId);
}

export async function getFeatureHierarchy(featureId: string) {
  const db = await getDatabase();
  const feature = await getFeatureById(featureId);
  if (!feature) return null;

  const capability = db.capabilities.find((c) => c.id === feature.capabilityId);
  const userNeed = capability
    ? db.userNeeds.find((n) => n.id === capability.userNeedId)
    : undefined;
  const journey = userNeed
    ? db.journeys.find((j) => j.id === userNeed.journeyId)
    : undefined;

  return { feature, capability, userNeed, journey };
}
