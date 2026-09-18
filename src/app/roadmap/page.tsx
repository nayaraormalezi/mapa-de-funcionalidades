import { RoadmapClient } from "@/app/roadmap/roadmap-client";
import { getAuthState } from "@/lib/auth";
import { officialStageCatalog } from "@/lib/labels";
import { PRODUCT_CATALOG } from "@/lib/products";
import {
  buildFeatureMapRows,
  getAudiences,
  getChannels,
  getMoments,
} from "@/services/channels";
import { getDatabase } from "@/services/db";
import type { FeatureEvolution } from "@/types";

/**
 * Roadmap = VIEW sobre Implementation (FeatureChannelContext) + FeatureEvolution.
 * Não usa RoadmapItem como fonte de verdade.
 */
export default async function RoadmapPage() {
  const [rows, audiences, moments, channels, db, auth] = await Promise.all([
    buildFeatureMapRows(),
    getAudiences(),
    getMoments(),
    getChannels(),
    getDatabase(),
    getAuthState(),
  ]);

  const evolutionsByFcc = new Map<string, FeatureEvolution[]>();
  for (const evo of db.featureEvolutions.filter((e) => e.active)) {
    const list = evolutionsByFcc.get(evo.featureChannelContextId) ?? [];
    list.push(evo);
    evolutionsByFcc.set(evo.featureChannelContextId, list);
  }

  const items = rows.map((row) => ({
    id: row.featureChannelContextId,
    featureId: row.featureId,
    featureName: row.featureName,
    featureDescription: row.featureDescription,
    productId: row.productId,
    productName: row.product,
    productShortName: row.productShortName,
    phase: row.phase,
    status: row.status,
    startDate: row.startDate,
    expectedDate: row.expectedDate,
    launchDate: row.launchDate,
    responsible: row.responsible,
    notes: row.notes,
    experience: row.experience,
    channelContextId: row.channelContextId,
    audienceId: row.audienceId,
    audienceName: row.audienceName,
    momentId: row.momentId,
    momentName: row.momentName,
    channelId: row.channelId,
    channelName: row.channelName,
    temporalStatus: row.temporalStatus,
    priority: row.priority,
    journeyId: row.journeyId,
    journeyName: row.journeyName,
    userNeedId: row.userNeedId,
    userNeedName: row.userNeedName,
    evolutions: evolutionsByFcc.get(row.featureChannelContextId) ?? [],
  }));

  return (
    <RoadmapClient
      items={items}
      audiences={audiences.map((a) => ({ id: a.id, name: a.name }))}
      moments={moments.map((m) => ({ id: m.id, name: m.name }))}
      channels={channels.map((c) => ({ id: c.id, name: c.name }))}
      products={PRODUCT_CATALOG.map((p) => ({ id: p.id, name: p.name }))}
      phases={officialStageCatalog()}
      canEdit={auth.canEdit}
    />
  );
}
